// GET /api/products/related?productId=X — "More like this" (item 3)
// Pure DB query, no LLM. Always fast, always relevant.
import { prisma } from '@/lib/prisma'
import { success, error, serverError } from '@/lib/apiResponse'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    if (!productId) return error('productId is required')

    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, category: true },
    })
    if (!currentProduct) return error('Product not found', 404)

    const related = await prisma.product.findMany({
      where: {
        category: currentProduct.category,
        id: { not: currentProduct.id },
        isActive: true,
      },
      orderBy: { soldCount: 'desc' },
      take: 4,
      include: {
        store: { select: { id: true, name: true, username: true } },
        rating: { select: { rating: true } },
      },
    })

    return success({ products: related, category: currentProduct.category })
  } catch (err) {
    return serverError(err.message)
  }
}