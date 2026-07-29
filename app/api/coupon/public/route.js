// GET /api/coupon/public — returns one active public coupon for the banner
import { prisma } from '@/lib/prisma'
import { success } from '@/lib/apiResponse'

export async function GET() {
  try {
    const coupon = await prisma.coupon.findFirst({
      where: {
        isPublic: true,
        expiresAt: { gte: new Date() },
      },
      select: { code: true, description: true, discount: true },
      orderBy: { discount: 'desc' },
    })
    return success({ coupon: coupon || null })
  } catch {
    return success({ coupon: null })
  }
}
