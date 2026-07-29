// GET /api/admin/coupons  — list all coupons
// POST /api/admin/coupons — create coupon
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware'
import { success, error, serverError, validationError } from '@/lib/apiResponse'

export async function GET(req) {
  try {
    const { error: authError } = await requireAdmin(req)
    if (authError) return authError
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
    return success({ coupons })
  } catch (err) { return serverError(err.message) }
}

export async function POST(req) {
  try {
    const { error: authError } = await requireAdmin(req)
    if (authError) return authError

    const body = await req.json()
    const { code, description, discount, newUsersOnly, allowedPlans, category, isPublic, expiresAt } = body

    if (!code?.trim()) return validationError({ code: 'Code required' })
    if (!discount || discount < 1 || discount > 100) return validationError({ discount: 'Discount must be 1-100%' })
    if (!expiresAt) return validationError({ expiresAt: 'Expiry date required' })

    const VALID_PLANS = ['FREE', 'PLUS', 'PRO']
    const plansArr = Array.isArray(allowedPlans) ? allowedPlans.map(p => p.toUpperCase()) : []
    if (plansArr.some(p => !VALID_PLANS.includes(p))) {
      return validationError({ allowedPlans: 'Invalid plan value' })
    }

    const CATEGORIES = ['All','Headphones','Speakers','Watch','Earbuds','Mouse','Decoration','Camera','Laptop','Electronics','Clothing']
    if (category && !CATEGORIES.includes(category)) {
      return validationError({ category: 'Invalid category' })
    }

    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })
    if (existing) return error('Coupon code already exists', 409)

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        description: description?.trim() || '',
        discount: parseFloat(discount),
        newUsersOnly: Boolean(newUsersOnly),
        allowedPlans: plansArr,
        category: category || null,
        isPublic: Boolean(isPublic),
        expiresAt: new Date(expiresAt),
      }
    })
    return success({ coupon }, 201)
  } catch (err) { return serverError(err.message) }
}
