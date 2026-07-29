// DELETE /api/admin/coupons/[code]
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware'
import { success, notFound, serverError } from '@/lib/apiResponse'

export async function DELETE(req, { params }) {
  try {
    const { error } = await requireAdmin(req)
    if (error) return error
    const { code } = await params
    const existing = await prisma.coupon.findUnique({ where: { code } })
    if (!existing) return notFound('Coupon not found')
    await prisma.coupon.delete({ where: { code } })
    return success({ message: 'Coupon deleted' })
  } catch (err) { return serverError(err.message) }
}
