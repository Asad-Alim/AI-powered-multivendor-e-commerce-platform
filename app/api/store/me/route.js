// GET /api/store/me — get current user's store(s)
// Multi-store: returns the full `stores` array plus a resolved `store`
// (the one matching ?storeId=, or the oldest one if not specified/owned).
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, serverError } from '@/lib/apiResponse'

export async function GET(req) {
  try {
    const { error, user } = await requireAuth(req)
    if (error) return error

    const { searchParams } = new URL(req.url)
    const requestedStoreId = searchParams.get('storeId')

    const stores = await prisma.store.findMany({
      where: { userId: user.id },
      include: {
        user: { select: { name: true, email: true, image: true } },
        _count: { select: { products: true, orders: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (stores.length === 0) return success({ store: null, stores: [] })

    const activeStore =
      (requestedStoreId && stores.find(s => s.id === requestedStoreId)) || stores[0]

    return success({ store: activeStore, stores })
  } catch (err) { return serverError(err.message) }
}