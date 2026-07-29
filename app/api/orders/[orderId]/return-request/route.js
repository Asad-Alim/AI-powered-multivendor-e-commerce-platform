// POST /api/orders/[orderId]/return-request — buyer requests a return
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, notFound, serverError, forbidden, validationError } from '@/lib/apiResponse'

export async function POST(req, { params }) {
    try {
        const { error, user } = await requireAuth(req)
        if (error) return error

        const order = await prisma.order.findUnique({
            where: { id: params.orderId },
            include: { store: { select: { userId: true, name: true } } }
        })
        if (!order) return notFound('Order not found')
        if (order.userId !== user.id) return forbidden()
        if (order.status !== 'DELIVERED') return validationError('Only delivered orders can be returned')
        if (order.status === 'RETURN_REQUESTED' || order.status === 'RETURNED') {
            return validationError('Return already requested for this order')
        }

        const body = await req.json()
        const { reason } = body
        if (!reason || reason.trim().length < 10) return validationError('Please provide a reason (at least 10 characters)')

        const [updated] = await prisma.$transaction([
            prisma.order.update({
                where: { id: params.orderId },
                data: {
                    status: 'RETURN_REQUESTED',
                    returnRequestedAt: new Date(),
                    cancelReason: reason.trim(),
                },
            }),
            prisma.orderStatusHistory.create({
                data: { orderId: params.orderId, status: 'RETURN_REQUESTED', note: reason.trim() }
            }),
            // Notify the vendor
            prisma.notification.create({
                data: {
                    userId: order.store.userId,
                    title: 'Return Requested',
                    message: `A customer has requested a return for order #${params.orderId.slice(-8).toUpperCase()}. Reason: ${reason.trim()}`,
                    type: 'warning',
                    link: '/store/orders',
                }
            }),
        ])

        return success({ order: updated, message: 'Return request submitted successfully' })
    } catch (err) {
        return serverError(err.message)
    }
}
