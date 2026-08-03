// POST /api/orders/[orderId]/return-request/approve — vendor approves a return
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, error, notFound, forbidden, validationError, serverError } from '@/lib/apiResponse'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export async function POST(req, { params }) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const { orderId } = await params
    const { note, productIds } = await req.json().catch(() => ({}))

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, store: { select: { userId: true, commission: true } } },
    })
    if (!order) return notFound('Order not found')
    if (order.store.userId !== user.id && user.role !== 'ADMIN') return forbidden('Not authorized')

    const requestedItems = order.orderItems.filter(oi => oi.returnStatus === 'REQUESTED')
    if (requestedItems.length === 0) return error(`Cannot approve — no items awaiting return on this order`)

    const targetItems = Array.isArray(productIds) && productIds.length > 0
      ? requestedItems.filter(oi => productIds.includes(oi.productId))
      : requestedItems
    if (targetItems.length === 0) return validationError('No matching items awaiting return')

    const commission = order.store.commission ?? 10

    // Exact net-of-discount refund per item, using the discountShare each item
    // was actually given at checkout (Item 3c) — not an approximated rate.
    // Shipping is handled separately below.
    const itemRefunds = targetItems.map(oi => ({
      ...oi,
      refund: Math.round((oi.price * oi.quantity - oi.discountShare) * 100) / 100,
    }))
    let refundBatchTotal = itemRefunds.reduce((s, i) => s + i.refund, 0)

    // Will every item on the order be APPROVED after this action? If so, this is
    // the last return on the order — fold the (once-only) shipping fee into the
    // refund, same as a full-order return today.
    const otherItems = order.orderItems.filter(oi => !targetItems.some(t => t.productId === oi.productId))
    const allOthersAlreadyApproved = otherItems.every(oi => oi.returnStatus === 'APPROVED')
    const isFinalBatch = allOthersAlreadyApproved
    if (isFinalBatch) refundBatchTotal += order.shippingCost

    const vendorEarningsReduction = refundBatchTotal * (1 - commission / 100)

    await prisma.$transaction(async (tx) => {
      for (const oi of itemRefunds) {
        await tx.product.update({
          where: { id: oi.productId },
          data: { stockCount: { increment: oi.quantity }, inStock: true },
        })
        await tx.orderItem.update({
          where: { orderId_productId: { orderId, productId: oi.productId } },
          data: {
            returnStatus: 'APPROVED',
            returnResolvedAt: new Date(),
            returnDecisionNote: note?.trim() || null,
            refundAmount: oi.refund,
            restocked: true,
          },
        })
      }

      if (order.paymentMethod === 'STRIPE' && stripe && order.stripePaymentIntent) {
        try {
          await stripe.refunds.create({
            payment_intent: order.stripePaymentIntent,
            amount: Math.round(refundBatchTotal * 100),
          })
        } catch (stripeErr) {
          console.error('[Stripe Refund Error]', stripeErr.message)
        }
      }
      if (isFinalBatch) {
        await tx.transaction.update({
          where: { orderId },
          data: { status: 'REFUNDED', refundedAt: new Date() },
        })
      }

      await tx.store.update({
        where: { id: order.storeId },
        data: {
          totalEarnings: { decrement: vendorEarningsReduction },
          pendingPayout: { decrement: vendorEarningsReduction },
          ...(isFinalBatch && { totalOrders: { decrement: 1 } }),
        },
      })

      const finalOrderStatus = isFinalBatch ? 'RETURNED' : 'PARTIALLY_RETURNED'
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: finalOrderStatus,
          total: { decrement: refundBatchTotal },
          discount: { decrement: itemRefunds.reduce((s, i) => s + (i.discountShare || 0), 0) },
          paymentStatus: (isFinalBatch && order.paymentMethod === 'STRIPE') ? 'REFUNDED' : order.paymentStatus,
          returnResolvedAt: new Date(),
          returnDecisionNote: note?.trim() || null,
        },
      })

      await tx.orderStatusHistory.create({
        data: { orderId, status: finalOrderStatus, note: note?.trim() || `Return approved for ${targetItems.length} item(s)` },
      })

      await tx.notification.create({
        data: {
          userId: order.userId,
          title: 'Return Approved',
          message: `Your return for ${targetItems.length} item(s) in order #${orderId.slice(-8).toUpperCase()} was approved — refund issued.${note ? ` Note: ${note.trim()}` : ''}`,
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