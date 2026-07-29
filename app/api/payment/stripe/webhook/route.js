// POST /api/payment/stripe/webhook
// Stripe sends events here — verify signature, update order
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

const PLAN_COMMISSION = { FREE: 10, PLUS: 9, PRO: 8 }

export async function POST(req) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') || ''

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[Stripe Webhook] Invalid signature:', err.message)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object

        // Subscription-mode session (item 3) — distinct flow from order payment
        if (session.mode === 'subscription') {
          const userId = session.metadata?.userId
          const planName = session.metadata?.planName?.toUpperCase()
          if (!userId || !PLAN_COMMISSION[planName]) break

          await prisma.$transaction(async (tx) => {
            await tx.processedWebhookEvent.create({ data: { id: event.id, type: event.type } })

            await tx.user.update({
              where: { id: userId },
              data: { plan: planName, stripeSubscriptionId: session.subscription },
            })
            await tx.store.updateMany({
              where: { userId },
              data: { commission: PLAN_COMMISSION[planName] },
            })
          })
          break
        }

        const orderGroupId = session.metadata?.orderGroupId
        if (!orderGroupId) break

        await prisma.$transaction(async (tx) => {
          // Idempotency guard (item 1) — first statement in the transaction.
          // If this event.id was already processed, the unique constraint
          // throws, the whole transaction rolls back, and nothing below runs.
          await tx.processedWebhookEvent.create({ data: { id: event.id, type: event.type } })

          const orders = await tx.order.findMany({
            where: { orderGroupId },
            include: { orderItems: true },
          })
          if (orders.length === 0) return

          let couponIncremented = false

          for (const order of orders) {
            // Late/duplicate-event guard (item 2a) — if this order was
            // already cancelled/refunded (e.g. buyer cancelled while this
            // event was in flight), a stale "completed" must not resurrect it.
            if (['CANCELLED', 'REFUNDED'].includes(order.status)) continue

            await tx.order.update({
              where: { id: order.id },
              data: {
                isPaid: true,
                paymentStatus: 'COMPLETED',
                status: 'CONFIRMED',
                stripePaymentIntent: session.payment_intent,
              },
            })

            await tx.transaction.update({
              where: { orderId: order.id },
              data: { status: 'COMPLETED', stripePaymentId: session.payment_intent },
            })

            await tx.orderStatusHistory.create({
              data: { orderId: order.id, status: 'CONFIRMED', note: 'Payment confirmed via Stripe' },
            })

            // Stock was already reserved (decremented) at checkout-session
            // creation (item 10) — only soldCount updates here now.
            for (const item of order.orderItems) {
              await tx.product.update({
                where: { id: item.productId },
                data: { soldCount: { increment: item.quantity } },
              })
            }

            const store = await tx.store.findUnique({
              where: { id: order.storeId },
              select: { commission: true },
            })
            const commission = store?.commission ?? 10
            const vendorEarnings = order.total * (1 - commission / 100)
            await tx.store.update({
              where: { id: order.storeId },
              data: {
                totalEarnings: { increment: vendorEarnings },
                pendingPayout: { increment: vendorEarnings },
                totalOrders: { increment: 1 },
              },
            })

            // Coupon usage is applied once at the cart level (item 11) — a
            // 3-vendor cart with one coupon must count as ONE use, not three.
            if (!couponIncremented && order.isCouponUsed && order.couponCode) {
              const couponRow = await tx.coupon.findUnique({ where: { code: order.couponCode } })
              if (couponRow && couponRow.usageCount < couponRow.usageLimit) {
                await tx.coupon.update({
                  where: { code: order.couponCode },
                  data: { usageCount: { increment: 1 } },
                })
              } else if (couponRow) {
                console.warn(`[Coupon] Usage limit exceeded post-payment for ${order.couponCode} — order ${order.id} confirmed anyway, flagging for admin review`)
              }
              couponIncremented = true
            }
          }

          await tx.notification.create({
            data: {
              userId: orders[0].userId,
              title: 'Payment Successful',
              message:
                orders.length > 1
                  ? `Your order (${orders.length} shipments) has been confirmed.`
                  : `Your order #${orders[0].id.slice(-8)} has been confirmed.`,
              type: 'success',
              link: '/orders',
            },
          })
        })
        break
      }

      case 'checkout.session.expired':
      case 'payment_intent.payment_failed': {
        const session = event.data.object
        const orderGroupId = session.metadata?.orderGroupId
        if (!orderGroupId) break

        await prisma.$transaction(async (tx) => {
          // Idempotency guard (item 1)
          await tx.processedWebhookEvent.create({ data: { id: event.id, type: event.type } })

          const orders = await tx.order.findMany({
            where: { orderGroupId },
            include: { orderItems: true },
          })
          if (orders.length === 0) return

          for (const order of orders) {
            // Late-delivery guard (item 2a) — if a "completed" event for
            // this order already landed, this stale failed/expired event
            // must not restore stock or cancel an already-paid order.
            if (order.paymentStatus === 'COMPLETED') continue

            // Restore reserved stock (item 10) since the reservation made
            // at checkout-session creation never turned into a real sale.
            for (const item of order.orderItems) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stockCount: { increment: item.quantity } },
              })
              const updated = await tx.product.findUnique({
                where: { id: item.productId },
                select: { stockCount: true, inStock: true },
              })
              if (updated.stockCount > 0 && !updated.inStock) {
                await tx.product.update({ where: { id: item.productId }, data: { inStock: true } })
              }
            }

            await tx.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: 'FAILED',
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelReason: 'Payment failed or expired',
              },
            })
            await tx.transaction.update({
              where: { orderId: order.id },
              data: { status: 'FAILED', failureReason: event.type },
            })
            await tx.orderStatusHistory.create({
              data: { orderId: order.id, status: 'CANCELLED', note: 'Payment failed — order cancelled' },
            })
          }
        })
        break
      }

      case 'customer.subscription.deleted': {
        // Subscription cancelled or payment failed at renewal — downgrade to FREE
        const subscription = event.data.object
        await prisma.$transaction(async (tx) => {
          await tx.processedWebhookEvent.create({ data: { id: event.id, type: event.type } })
          const user = await tx.user.findFirst({ where: { stripeSubscriptionId: subscription.id } })
          if (!user) return
          await tx.user.update({ where: { id: user.id }, data: { plan: 'FREE', stripeSubscriptionId: null } })
          await tx.store.updateMany({ where: { userId: user.id }, data: { commission: PLAN_COMMISSION.FREE } })
        })
        break
      }

      case 'customer.subscription.updated': {
        // e.g. Plus -> Pro upgrade mid-cycle — re-sync plan and commission
        const subscription = event.data.object
        const planName = subscription.metadata?.planName?.toUpperCase()
        if (!planName || !PLAN_COMMISSION[planName]) break
        await prisma.$transaction(async (tx) => {
          await tx.processedWebhookEvent.create({ data: { id: event.id, type: event.type } })
          const user = await tx.user.findFirst({ where: { stripeSubscriptionId: subscription.id } })
          if (!user) return
          await tx.user.update({ where: { id: user.id }, data: { plan: planName } })
          await tx.store.updateMany({ where: { userId: user.id }, data: { commission: PLAN_COMMISSION[planName] } })
        })
        break
      }
    }

    return Response.json({ received: true })
  } catch (err) {
    // Duplicate delivery (item 1) — unique constraint on ProcessedWebhookEvent.id
    // means this event was already handled. Tell Stripe "received" so it stops retrying.
    if (err.code === 'P2002') {
      return Response.json({ received: true, duplicate: true })
    }
    console.error('[Stripe Webhook] Processing error:', err)
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

export const config = { api: { bodyParser: false } }