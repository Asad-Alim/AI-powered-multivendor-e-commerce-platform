// GET /api/admin/stores — list all stores (admin)
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware'
import { success, serverError } from '@/lib/apiResponse'

export async function GET(req) {
  try {
    const { error } = await requireAdmin(req)
    if (error) return error

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const stores = await prisma.store.findMany({
      where: status ? { status } : undefined,
      include: { user: { select: { name: true, email: true, image: true } }, _count: { select: { products: true, orders: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return success({ stores })
  } catch (err) { return serverError(err.message) }
}
