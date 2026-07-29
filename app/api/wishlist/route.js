// GET /api/wishlist  — get server wishlist
// POST /api/wishlist — toggle item in wishlist + sync to server
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, error, serverError } from '@/lib/apiResponse'

export async function GET(req) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const userData = await prisma.user.findUnique({
      where:  { id: user.id },
      select: { wishlist: true },
    })

    return success({ wishlist: userData?.wishlist || [] })
  } catch (err) {
    return serverError(err.message)
  }
}

export async function POST(req) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const { productId } = await req.json()
    if (!productId) return error('productId is required')

    const product = await prisma.product.findUnique({
      where:  { id: productId, isActive: true },
      select: { id: true },
    })
    if (!product) return error('Product not found', 404)

    const userData   = await prisma.user.findUnique({ where: { id: user.id }, select: { wishlist: true } })
    const current    = userData?.wishlist || []
    const isInList   = current.includes(productId)
    const updated    = isInList ? current.filter(id => id !== productId) : [...current, productId]

    await prisma.user.update({ where: { id: user.id }, data: { wishlist: updated } })

    return success({ wishlist: updated, action: isInList ? 'removed' : 'added' })
  } catch (err) {
    return serverError(err.message)
  }
}

// PUT /api/wishlist — bulk-sync wishlist from localStorage to server (called after login)
export async function PUT(req) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const { wishlist } = await req.json()
    if (!Array.isArray(wishlist)) return error('wishlist must be an array')

    // Validate all productIds exist
    const validProducts = await prisma.product.findMany({
      where:  { id: { in: wishlist }, isActive: true },
      select: { id: true },
    })
    const validIds = validProducts.map(p => p.id)

    await prisma.user.update({ where: { id: user.id }, data: { wishlist: validIds } })

    return success({ wishlist: validIds })
  } catch (err) {
    return serverError(err.message)
  }
}
