// POST /api/orders/[orderId]/return-request/approve — vendor approves a return
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, error, notFound, forbidden, serverError } from '@/lib/apiResponse'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export async function POST(req, { params }) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const { orderId } = await params
    const { note } = await req.json().catch(() => ({}))

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, store: { select: { userId: true, commission: true } } },
    })
    if (!order) return notFound('Order not found')
    if (order.store.userId !== user.id && user.role !== 'ADMIN') return forbidden('Not authorized')
    if (order.status !== 'RETURN_REQUESTED') return error(`Cannot approve — order status is ${order.status}`)

    const commission = order.store.commission ?? 10
    const vendorEarnings = order.total * (1 - commission / 100)

    await prisma.$transaction(async (tx) => {
      // Restore stock (same as cancel/route.js)
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockCount: { increment: item.quantity }, inStock: true },
        })
      }

      if (order.paymentMethod === 'STRIPE') {
        if (stripe && order.stripePaymentIntent) {
          try {
            await stripe.refunds.create({ payment_intent: order.stripePaymentIntent })
          } catch (stripeErr) {
            console.error('[Stripe Refund Error]', stripeErr.message)
          }
        }
        await tx.transaction.update({
          where: { orderId },
          data: { status: 'REFUNDED', refundedAt: new Date() },
        })
      }

      // Reverse the store ledger — same commission math as item 2b, now
      // applies to both payment methods since COD is credited on delivery.
      await tx.store.update({
        where: { id: order.storeId },
        data: {
          totalEarnings: { decrement: vendorEarnings },
          pendingPayout: { decrement: vendorEarnings },
          totalOrders: { decrement: 1 },
        },
      })

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'RETURNED',
          paymentStatus: order.paymentMethod === 'STRIPE' ? 'REFUNDED' : order.paymentStatus,
          returnResolvedAt: new Date(),
          returnDecisionNote: note?.trim() || null,
        },
      })

      await tx.orderStatusHistory.create({
        data: { orderId, status: 'RETURNED', note: note?.trim() || 'Return approved' },
      })

      await tx.notification.create({
        data: {
          userId: order.userId,
          title: 'Return Approved',
          message: `Your return for order #${orderId.slice(-8).toUpperCase()} was approved — refund issued.${note ? ` Note: ${note.trim()}` : ''}`,
          type: 'success',
          link: '/orders',
        },
      })
    })

    return success({ message: 'Return approved and refund processed' })
  } catch (err) {
    return serverError(err.message)
  }
}