// GET /api/coupon/validate?code=CODE
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, error, serverError } from '@/lib/apiResponse'

export async function GET(req) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true } })
    const userPlan = fullUser?.plan || 'FREE'

    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')?.toUpperCase()
    if (!code) return error('Coupon code is required')

    const coupon = await prisma.coupon.findUnique({ where: { code } })
    if (!coupon) return error('Invalid coupon code', 404)
    if (new Date(coupon.expiresAt) < new Date()) return error('This coupon has expired')
    if (coupon.usageCount >= coupon.usageLimit) return error('Coupon usage limit reached')

    if (coupon.newUsersOnly) {
      const priorOrders = await prisma.order.count({ where: { userId: user.id, isPaid: true } })
      if (priorOrders > 0) return error('This coupon is only valid for new users')
    }
    if (coupon.allowedPlans.length > 0 && !coupon.allowedPlans.includes(userPlan)) {
      return error('This coupon is not valid for your plan')
    }

    return success({ coupon: { code: coupon.code, description: coupon.description, discount: coupon.discount, category: coupon.category } })
  } catch (err) {
    return serverError(err.message)
  }
}