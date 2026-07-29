// GET /api/store/orders — get orders for one of the vendor's stores
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

    const orders = await prisma.order.findMany({
      where: { storeId: store.id },
      include: {
        user: { select: { name: true, email: true } },
        address: true,
        orderItems: { include: { product: { select: { id: true, name: true, images: true } } } },
        transaction: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    return success({ orders })
  } catch (err) { return serverError(err.message) }
}