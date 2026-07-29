// GET /api/store/dashboard
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, error, serverError } from '@/lib/apiResponse'
import { resolveOwnedStore } from '@/lib/store'

export async function GET(req) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const { searchParams } = new URL(req.url)
    const store = await resolveOwnedStore(user.id, searchParams.get('storeId'))
    if (!store) return error('No store found', 404)

    const [totalProducts, totalOrders, ratings, orders] = await Promise.all([
      prisma.product.count({ where: { storeId: store.id, isActive: true } }),
      prisma.order.count({ where: { storeId: store.id } }),
      prisma.rating.findMany({ where: { product: { storeId: store.id } }, include: { user: { select: { name: true, image: true } }, product: { select: { id: true, name: true, category: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.order.findMany({ where: { storeId: store.id }, select: { createdAt: true, total: true }, orderBy: { createdAt: 'asc' } }),
    ])

    return success({ totalProducts, totalOrders, totalEarnings: store.totalEarnings, pendingPayout: store.pendingPayout, ratings, allOrders: orders })
  } catch (err) { return serverError(err.message) }
}