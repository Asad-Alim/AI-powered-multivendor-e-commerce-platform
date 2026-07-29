// GET /api/admin/dashboard
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware'
import { success, serverError } from '@/lib/apiResponse'

export async function GET(req) {
  try {
    const { error, user } = await requireAdmin(req)
    if (error) return error

    const [products, orders, stores, revenue, allOrders, pendingApprovals, paidOrders] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.store.count({ where: { isActive: true } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { isPaid: true } }),
      prisma.order.findMany({ select: { createdAt: true, total: true }, orderBy: { createdAt: 'asc' }, take: 100 }),
      prisma.store.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { isPaid: true } }),
    ])

    return success({
      products,
      orders,
      stores,
      revenue: (revenue._sum.total || 0).toFixed(2),
      allOrders,
      pendingApprovals,
      paidOrders,
    })
  } catch (err) { return serverError(err.message) }
}
