// PATCH /api/orders/[orderId]/status — vendor updates order status
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, error, notFound, serverError } from '@/lib/apiResponse'
import { sendShippingEmail } from '@/lib/email'

const VALID = ['PENDING','CONFIRMED','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED']


export async function PATCH(req, { params }) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const { orderId } = await params
    const { status, note } = await req.json()

    if (!VALID.includes(status)) return error(`Invalid status. Must be one of: ${VALID.join(', ')}`)

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: { select: { userId: true } },
        user: { select: { email: true, name: true } }
      }
    })
    if (!order) return notFound('Order not found')
    if (order.store.userId !== user.id && user.role !== 'ADMIN') return error('Not authorized', 403)

    const updateData = {
      status,
      ...(status === 'DELIVERED'  && { deliveredAt: new Date() }),
      ...(status === 'SHIPPED'    && !order.trackingNumber && { trackingNumber: `IM${Date.now().toString().slice(-8)}` }),
    }

    let updated
    if (status === 'DELIVERED' && order.paymentMethod === 'COD' && !order.isPaid) {
      // COD earnings fix (item 6) — cash has now genuinely changed hands;
      // credit the store ledger the same way the Stripe webhook does.
      const storeRow = await prisma.store.findUnique({ where: { id: order.storeId }, select: { commission: true } })
      const commission = storeRow?.commission ?? 10
      const vendorEarnings = order.total * (1 - commission / 100)

      ;[updated] = await prisma.$transaction([
        prisma.order.update({ where: { id: orderId }, data: { ...updateData, isPaid: true } }),
        prisma.orderStatusHistory.create({ data: { orderId, status, note: note || `Status updated to ${status}` } }),
        prisma.store.update({
          where: { id: order.storeId },
          data: {
            totalEarnings: { increment: vendorEarnings },
            pendingPayout: { increment: vendorEarnings },
            totalOrders: { increment: 1 },
          },
        }),
      ])
    } else {
      ;[updated] = await prisma.$transaction([
        prisma.order.update({ where: { id: orderId }, data: updateData }),
        prisma.orderStatusHistory.create({ data: { orderId, status, note: note || `Status updated to ${status}` } }),
      ])
    }

    // Notify buyer in-app
    await prisma.notification.create({
      data: {
        userId: order.userId,
        title: `Order ${status.replace(/_/g, ' ')}`,
        message: `Your order #${orderId.slice(-8).toUpperCase()} is now ${status.replace(/_/g, ' ').toLowerCase()}.`,
        type: status === 'DELIVERED' ? 'success' : 'info',
        link: '/orders',
      }
    }).catch(() => {})

    // Send shipping email (non-blocking)
    if (status === 'SHIPPED' || status === 'OUT_FOR_DELIVERY') {
      sendShippingEmail({
        to: order.user.email,
        name: order.user.name,
        orderId,
        trackingNumber: updated.trackingNumber,
        status,
      }).catch(() => {})
    }

    return success({ order: updated })
  } catch (err) { return serverError(err.message) }
}
