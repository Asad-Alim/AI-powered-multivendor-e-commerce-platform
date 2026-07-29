// GET /api/admin/analytics — platform-wide analytics
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware'
import { success, serverError } from '@/lib/apiResponse'

export async function GET(req) {
  try {
    const { error } = await requireAdmin(req)
    if (error) return error

    const [
      orders,
      topStores,
      userGrowth,
      paymentMethodBreakdown,
      categoryRevenue,
    ] = await Promise.all([
      prisma.order.findMany({
        select: { id: true, total: true, status: true, createdAt: true, paymentMethod: true, isPaid: true, storeId: true },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),

      // Top earning stores
      prisma.store.findMany({
        select: { id: true, name: true, username: true, logo: true, totalEarnings: true, totalOrders: true },
        orderBy: { totalEarnings: 'desc' },
        take: 5,
      }),

      // User registrations per month
      prisma.user.groupBy({
        by: ['createdAt'],
        _count: { id: true },
      }),

      // Payment method split
      prisma.order.groupBy({
        by: ['paymentMethod'],
        _count: { id: true },
        _sum: { total: true },
      }),

      // Revenue by product category
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { price: true, quantity: true },
        take: 100,
      }),
    ])

    const totalRevenue = orders.reduce((s, o) => s + (o.isPaid ? o.total : 0), 0)
    const totalOrders = orders.length
    const paidOrders = orders.filter(o => o.isPaid).length
    const platformCommission = totalRevenue * 0.10 // 10% commission

    return success({
      summary: { totalRevenue, totalOrders, paidOrders, platformCommission },
      orders,
      topStores,
      paymentMethodBreakdown,
    })
  } catch (err) {
    return serverError(err.message)
  }
}
