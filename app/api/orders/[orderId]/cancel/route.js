// POST /api/orders/[orderId]/cancel — buyer cancels order
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, error, notFound, serverError } from '@/lib/apiResponse'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export async function POST(req, { params }) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const { orderId } = await params
    const { reason } = await req.json().catch(() => ({}))

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true }
    })
    if (!order) return notFound('Order not found')
    if (order.userId !== user.id) return error('Not your order', 403)

    const cancellable = ['PENDING', 'CONFIRMED']
    if (!cancellable.includes(order.status)) {
      return error(`Cannot cancel an order with status: ${order.status}`)
    }

    // Cancel-before-confirm race guard (item 2b) — while a Stripe payment
    // is still in flight, the local paymentStatus is unreliable. Force the
    // buyer to wait for the webhook to land (COMPLETED, or FAILED/expired)
    // before allowing a cancel. COD is unaffected — it's "confirmed" at
    // creation, so this guard is Stripe-only.
    if (order.paymentMethod === 'STRIPE' && order.paymentStatus === 'PENDING') {
      return error('Payment is still processing. You can cancel this order once payment is confirmed.')
    }

    await prisma.$transaction(async (tx) => {
      // Determine final status — if already paid via Stripe, mark REFUNDED
      const finalStatus = (order.isPaid && order.paymentMethod === 'STRIPE') ? 'REFUNDED' : 'CANCELLED'

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: finalStatus,
          cancelledAt: new Date(),
          cancelReason: reason || 'Cancelled by customer',
        },
      })

      await tx.orderStatusHistory.create({
        data: { orderId, status: finalStatus, note: reason || 'Cancelled by customer' },
      })

      // Restore stock
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockCount: { increment: item.quantity }, inStock: true },
        })
      }

      // FIX: Actually process Stripe refund (not just a stub)
      if (order.isPaid && order.paymentMethod === 'STRIPE' && order.stripePaymentIntent) {
        if (stripe) {
          try {
            await stripe.refunds.create({ payment_intent: order.stripePaymentIntent })
          } catch (stripeErr) {
            console.error('[Stripe Refund Error]', stripeErr.message)
            // Don't throw — still cancel the order, flag the refund issue
          }
        }
        await tx.transaction.update({
          where: { orderId },
          data: { status: 'REFUNDED', refundedAt: new Date() },
        })

        // Reverse the store ledger (item 2b) — the webhook credited this
        // store when the order was confirmed; cancelling/refunding must
        // net it back to zero.
        const storeRow = await tx.store.findUnique({ where: { id: order.storeId }, select: { commission: true } })
        const commission = storeRow?.commission ?? 10
        const vendorEarnings = order.total * (1 - commission / 100)
        await tx.store.update({
          where: { id: order.storeId },
          data: {
            totalEarnings: { decrement: vendorEarnings },
            pendingPayout: { decrement: vendorEarnings },
            totalOrders: { decrement: 1 },
          },
        })
      }

      // Notify user
      await tx.notification.create({
        data: {
          userId: order.userId,
          title: 'Order Cancelled',
          message: `Your order #${orderId.slice(-8).toUpperCase()} has been cancelled.${order.isPaid ? ' A refund has been initiated.' : ''}`,
          type: 'warning',
          link: '/orders',
        },
      })
    })

    return success({ message: order.isPaid ? 'Order cancelled and refund initiated' : 'Order cancelled successfully' })
  } catch (err) {
    return serverError(err.message)
  }
}
