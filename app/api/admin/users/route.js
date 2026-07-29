// GET /api/admin/users — list all users (filterable, paginated)
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware'
import { success, serverError } from '@/lib/apiResponse'

export async function GET(req) {
    try {
        const { error } = await requireAdmin(req)
        if (error) return error

        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const search = searchParams.get('search') || ''
        const role = searchParams.get('role') || ''
        const skip = (page - 1) * limit

        const where = {
            ...(search ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ]
            } : {}),
            ...(role ? { role } : {}),
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, name: true, email: true, role: true, image: true,
                    isEmailVerified: true, createdAt: true, lastLoginAt: true,
                    _count: { select: { buyerOrders: true, ratings: true } },
                    stores: { select: { id: true, name: true, status: true, isActive: true } },
                },
            }),
            prisma.user.count({ where }),
        ])

        return success({ users, total, page, pages: Math.ceil(total / limit) })
    } catch (err) {
        return serverError(err.message)
    }
}
