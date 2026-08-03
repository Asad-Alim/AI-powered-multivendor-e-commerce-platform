// POST /api/orders/[orderId]/return-request — buyer requests a return
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, notFound, serverError, forbidden, validationError, error } from '@/lib/apiResponse'

export async function POST(req, { params }) {
    try {
        const { error: authError, user } = await requireAuth(req)
        if (authError) return authError

        const { orderId } = await params

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { orderItems: true, store: { select: { userId: true, name: true, isActive: true } } }
        })
        if (!order) return notFound('Order not found')
        if (order.userId !== user.id) return forbidden()
        if (!['DELIVERED', 'PARTIALLY_RETURNED'].includes(order.status)) {
            return validationError('Only delivered orders can be returned')
        }
        // Item 10: a hidden store can't receive new return requests — see
        // Item 10 for how a store becomes hidden. Returns already in
        // REQUESTED state before the store was hidden are unaffected; the
        // vendor can still approve/reject those via the routes in 2b/2c.
        if (!order.store.isActive) {
            return error('This store is no longer active. Return requests can no longer be submitted for its orders.', 403)
        }

        const body = await req.json()
        const { reason, productIds } = body
        if (!reason || reason.trim().length < 10) return validationError('Please provide a reason (at least 10 characters)')
        if (!Array.isArray(productIds) || productIds.length === 0) return validationError('Select at least one item to return')

        const targetItems = order.orderItems.filter(oi =>
            productIds.includes(oi.productId) && oi.returnStatus === 'NONE'
        )
        if (targetItems.length === 0) return validationError('No eligible items selected (already returned or requested)')

        await prisma.$transaction([
            ...targetItems.map(oi => prisma.orderItem.update({
                where: { orderId_productId: { orderId, productId: oi.productId } },
                data: { returnStatus: 'REQUESTED', returnReason: reason.trim(), returnRequestedAt: new Date() },
            })),
            prisma.order.update({
                where: { id: orderId },
                data: { status: 'RETURN_REQUESTED' },
            }),
            prisma.orderStatusHistory.create({
                data: { orderId, status: 'RETURN_REQUESTED', note: `Return requested for ${targetItems.length} item(s): ${reason.trim()}` }
            }),
            prisma.notification.create({
                data: {
                    userId: order.store.userId,
                    title: 'Return Requested',
                    message: `A customer requested a return for ${targetItems.length} item(s) in order #${orderId.slice(-8).toUpperCase()}. Reason: ${reason.trim()}`,
                    type: 'warning',
                    link: '/store/orders',
                }
            }),
        ])

        return success({ message: 'Return request submitted successfully' })
    } catch (err) {
        return serverError(err.message)
    }
}