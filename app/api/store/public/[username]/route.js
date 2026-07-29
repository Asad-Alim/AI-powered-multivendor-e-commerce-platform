// GET /api/store/public/[username] — public store page data
import { prisma } from '@/lib/prisma'
import { success, notFound, serverError } from '@/lib/apiResponse'

export async function GET(req, { params }) {
  try {
    const { username } = await params
    const store = await prisma.store.findUnique({
      where: { username, isActive: true },
      select: { id: true, name: true, username: true, description: true, logo: true, address: true, email: true, contact: true, createdAt: true }
    })
    if (!store) return notFound('Store not found')

    const products = await prisma.product.findMany({
      where: { storeId: store.id, isActive: true, inStock: true },
      include: { rating: { select: { rating: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return success({ store, products })
  } catch (err) { return serverError(err.message) }
}
