// POST /api/orders/[orderId]/return-request/reject — vendor rejects a return
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, error, notFound, forbidden, validationError, serverError } from '@/lib/apiResponse'

export async function POST(req, { params }) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const { orderId } = await params
    const { note, productIds } = await req.json().catch(() => ({}))
    if (!note || note.trim().length < 5) return validationError('Please provide a reason (at least 5 characters)')

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, store: { select: { userId: true } } },
    })
    if (!order) return notFound('Order not found')
    if (order.store.userId !== user.id && user.role !== 'ADMIN') return forbidden('Not authorized')

    const requestedItems = order.orderItems.filter(oi => oi.returnStatus === 'REQUESTED')
    if (requestedItems.length === 0) return error(`Cannot reject — no items awaiting return on this order`)

    const targetItems = Array.isArray(productIds) && productIds.length > 0
      ? requestedItems.filter(oi => productIds.includes(oi.productId))
      : requestedItems
    if (targetItems.length === 0) return validationError('No matching items awaiting return')

    const remainingAfterReject = order.orderItems.filter(oi => !targetItems.some(t => t.productId === oi.productId))
    const anyStillRequested = remainingAfterReject.some(oi => oi.returnStatus === 'REQUESTED')
    const anyApproved = remainingAfterReject.some(oi => oi.returnStatus === 'APPROVED')
    const finalOrderStatus = anyStillRequested
      ? 'RETURN_REQUESTED'
      : anyApproved
        ? 'PARTIALLY_RETURNED'
        : 'DELIVERED'

    await prisma.$transaction([
      ...targetItems.map(oi => prisma.orderItem.update({
        where: { orderId_productId: { orderId, productId: oi.productId } },
        data: { returnStatus: 'REJECTED', returnResolvedAt: new Date(), returnDecisionNote: note.trim() },
      })),
      prisma.order.update({
        where: { id: orderId },
        data: { status: finalOrderStatus, returnResolvedAt: new Date(), returnDecisionNote: note.trim() },
      }),
      prisma.orderStatusHistory.create({
        data: { orderId, status: finalOrderStatus, note: `Return rejected for ${targetItems.length} item(s): ${note.trim()}` },
      }),
      prisma.notification.create({
        data: {
          userId: order.userId,
          title: 'Return Rejected',
          message: `Your return request for ${targetItems.length} item(s) in order #${orderId.slice(-8).toUpperCase()} was rejected. Reason: ${note.trim()}`,
          type: 'warning',
          link: '/orders',
        },
      }),
    ])

    return success({ message: 'Return rejected' })
  } catch (err) {
    return serverError(err.message)
  }
}