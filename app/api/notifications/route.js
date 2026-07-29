// GET /api/notifications — list user's notifications (paginated)
// PATCH /api/notifications — mark all as read
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, serverError } from '@/lib/apiResponse'

export async function GET(req) {
    try {
        const { error, user } = await requireAuth(req)
        if (error) return error

        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const skip = (page - 1) * limit

        const [notifications, unreadCount, total] = await Promise.all([
            prisma.notification.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.notification.count({ where: { userId: user.id, isRead: false } }),
            prisma.notification.count({ where: { userId: user.id } }),
        ])

        return success({ notifications, unreadCount, total, page, pages: Math.ceil(total / limit) })
    } catch (err) {
        return serverError(err.message)
    }
}

export async function PATCH(req) {
    try {
        const { error, user } = await requireAuth(req)
        if (error) return error

        await prisma.notification.updateMany({
            where: { userId: user.id, isRead: false },
            data: { isRead: true },
        })
        return success({ message: 'All notifications marked as read' })
    } catch (err) {
        return serverError(err.message)
    }
}
