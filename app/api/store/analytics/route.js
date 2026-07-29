// GET /api/store/analytics — detailed vendor analytics
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, error, serverError } from '@/lib/apiResponse'
import { resolveOwnedStore } from '@/lib/store'


export async function GET(req) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const { searchParams } = new URL(req.url)
    const store = await resolveOwnedStore(user.id, searchParams.get('storeId'), { id: true })
    if (!store) return error('No store found', 404)

    const [
      orders,
      topProducts,
      categoryBreakdown,
      recentActivity,
    ] = await Promise.all([
      // All orders with totals and dates
      prisma.order.findMany({
        where: { storeId: store.id },
        select: { id: true, total: true, status: true, createdAt: true, paymentMethod: true, isPaid: true },
        orderBy: { createdAt: 'asc' },
      }),

      // Top selling products
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { storeId: store.id } },
        _sum: { quantity: true, price: true },
        _count: { orderId: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // Orders by status
      prisma.order.groupBy({
        by: ['status'],
        where: { storeId: store.id },
        _count: { id: true },
        _sum: { total: true },
      }),

      // Recent 7 days activity
      prisma.order.findMany({
        where: {
          storeId: store.id,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        select: { total: true, createdAt: true, status: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    // Enrich top products with names
    const productIds = topProducts.map(p => p.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, images: true, price: true }
    })
    const enrichedTopProducts = topProducts.map(tp => ({
      ...tp,
      product: products.find(p => p.id === tp.productId)
    }))

    // Calculate summary stats
    const totalRevenue = orders.reduce((s, o) => s + (o.isPaid ? o.total : 0), 0)
    const totalOrders = orders.length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const conversionRate = totalOrders > 0
      ? (orders.filter(o => o.status === 'DELIVERED').length / totalOrders * 100).toFixed(1)
      : 0

    return success({
      summary: { totalRevenue, totalOrders, avgOrderValue, conversionRate },
      orders,
      topProducts: enrichedTopProducts,
      categoryBreakdown,
      recentActivity,
    })
  } catch (err) {
    return serverError(err.message)
  }
}
