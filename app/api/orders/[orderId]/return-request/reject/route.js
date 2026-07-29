// POST /api/orders/[orderId]/return-request/reject — vendor rejects a return
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, error, notFound, forbidden, validationError, serverError } from '@/lib/apiResponse'

export async function POST(req, { params }) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const { orderId } = await params
    const { note } = await req.json().catch(() => ({}))
    if (!note || note.trim().length < 5) return validationError('Please provide a reason (at least 5 characters)')

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { userId: true } } },
    })
    if (!order) return notFound('Order not found')
    if (order.store.userId !== user.id && user.role !== 'ADMIN') return forbidden('Not authorized')
    if (order.status !== 'RETURN_REQUESTED') return error(`Cannot reject — order status is ${order.status}`)

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          returnResolvedAt: new Date(),
          returnDecisionNote: note.trim(),
        },
      }),
      prisma.orderStatusHistory.create({
        data: { orderId, status: 'DELIVERED', note: `Return rejected: ${note.trim()}` },
      }),
      prisma.notification.create({
        data: {
          userId: order.userId,
          title: 'Return Rejected',
          message: `Your return request for order #${orderId.slice(-8).toUpperCase()} was rejected. Reason: ${note.trim()}`,
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