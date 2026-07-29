// GET /api/search/suggestions?q=query
// NEW FEATURE: Real-time search suggestions with product + category results
import { prisma } from '@/lib/prisma'
import { success, serverError } from '@/lib/apiResponse'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return success({ products: [], categories: [] })
    }

    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name:     { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true, name: true, price: true,
          images: true, category: true,
          rating: { select: { rating: true } },
        },
        orderBy: { viewCount: 'desc' },
        take: 6,
      }),
      prisma.product.findMany({
        where: { isActive: true, category: { contains: q, mode: 'insensitive' } },
        select: { category: true },
        distinct: ['category'],
        take: 4,
      }),
    ])

    return success({
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.images[0] || '',
        category: p.category,
        rating: p.rating?.length
          ? (p.rating.reduce((a, r) => a + r.rating, 0) / p.rating.length).toFixed(1)
          : null,
      })),
      categories: [...new Set(categories.map(c => c.category))],
    })
  } catch (err) {
    return serverError(err.message)
  }
}
