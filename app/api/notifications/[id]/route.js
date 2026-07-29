// PATCH /api/notifications/[id] — mark single notification as read
// DELETE /api/notifications/[id] — delete notification
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, notFound, serverError, forbidden } from '@/lib/apiResponse'

export async function PATCH(req, { params }) {
    try {
        const { error, user } = await requireAuth(req)
        if (error) return error

        const notification = await prisma.notification.findUnique({ where: { id: params.id } })
        if (!notification) return notFound('Notification not found')
        if (notification.userId !== user.id) return forbidden()

        const updated = await prisma.notification.update({
            where: { id: params.id },
            data: { isRead: true },
        })
        return success({ notification: updated })
    } catch (err) {
        return serverError(err.message)
    }
}

export async function DELETE(req, { params }) {
    try {
        const { error, user } = await requireAuth(req)
        if (error) return error

        const notification = await prisma.notification.findUnique({ where: { id: params.id } })
        if (!notification) return notFound('Notification not found')
        if (notification.userId !== user.id) return forbidden()

        await prisma.notification.delete({ where: { id: params.id } })
        return success({ message: 'Notification deleted' })
    } catch (err) {
        return serverError(err.message)
    }
}
