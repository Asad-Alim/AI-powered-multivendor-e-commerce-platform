// GET /api/products — List products with filtering
// POST /api/products — Create product (vendor only)
import { prisma } from '@/lib/prisma'
import { requireAuth, requireVendorOrAdmin } from '@/lib/middleware'
import { success, error, validationError, serverError } from '@/lib/apiResponse'
import { validateProduct, sanitizeString, sanitizePositiveNumber } from '@/lib/validate'
import { resolveOwnedStore } from '@/lib/store'


export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const search    = searchParams.get('search')   || ''
    const category  = searchParams.get('category') || ''
    const storeId   = searchParams.get('storeId')  || ''
    const minPrice  = parseFloat(searchParams.get('minPrice')) || 0
    const maxPrice  = parseFloat(searchParams.get('maxPrice')) || 999999
    const page      = Math.max(1, parseInt(searchParams.get('page'))  || 1)
    const limit     = Math.min(100, parseInt(searchParams.get('limit')) || 50)
    const sortBy    = searchParams.get('sortBy')    || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    // FIX: 'storeId=mine' → resolve to vendor's own store. Also fixes a
    // Phase-1 regression: this used to hand-parse an Authorization header,
    // which authFetch no longer sends now that auth is cookie-based.
    let resolvedStoreId = storeId
    if (storeId === 'mine') {
      const { getUserFromRequest } = await import('@/lib/auth')
      const payload = await getUserFromRequest(req)
      if (payload) {
        // activeStoreId lets a multi-store vendor scope this to one store;
        // falls back to their oldest store if omitted.
        const store = await resolveOwnedStore(payload.id, searchParams.get('activeStoreId'), { id: true })
        resolvedStoreId = store?.id || '__none__'
      } else {
        resolvedStoreId = '__none__'
      }
    }

    const where = {
      isActive: true,
      ...(searchParams.get('inStock') === 'true' && { inStock: true }),
      ...(search && {
        OR: [
          { name:        { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { category:    { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category          && { category: { equals: category, mode: 'insensitive' } }),
      ...(resolvedStoreId && resolvedStoreId !== '__none__' && { storeId: resolvedStoreId }),
      price: { gte: minPrice, lte: maxPrice },
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          store:  { select: { id: true, name: true, username: true, logo: true, shippingFee: true, freeShippingThreshold: true } },
          rating: { select: { rating: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return success({
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    return serverError(err.message)
  }
}
const PLAN_LIMITS = { FREE: 50, PLUS: 200, PRO: Infinity }

export async function POST(req) {
  try {
    const { error: authError, user } = await requireVendorOrAdmin(req)
    if (authError) return authError

    const body              = await req.json()
    const validationErrors  = validateProduct(body)
    if (validationErrors) return validationError(validationErrors)

    const store = await resolveOwnedStore(user.id, body.storeId, { id: true, isActive: true })

    if (!store)           return error('You do not have a store', 404)
    if (!store.isActive)  return error('Your store is not yet active', 403)

    // Product-cap enforcement (item 3) — counted across ALL of the vendor's
    // stores combined, not per store, per the plan model's decision.
    const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true } })
    const plan = fullUser?.plan || 'FREE'
    const limit = PLAN_LIMITS[plan]
    if (limit !== Infinity) {
      const currentCount = await prisma.product.count({ where: { store: { userId: user.id } } })
      if (currentCount >= limit) {
        return error(`You've reached your ${plan} plan's ${limit}-product limit. Upgrade to add more products.`, 403)
      }
    }
    const price = sanitizePositiveNumber(body.price)
    const mrp   = sanitizePositiveNumber(body.mrp)
    if (price > mrp)      return error('Offer price cannot exceed MRP')

    const product = await prisma.product.create({
      data: {
        name:        sanitizeString(body.name),
        description: sanitizeString(body.description),
        mrp,
        price,
        images:      Array.isArray(body.images) ? body.images.filter(Boolean) : [],
        category:    sanitizeString(body.category),
        storeId:     store.id,
        stockCount:  parseInt(body.stockCount) || 100,
        inStock:     true,
      },
    })

    return success({ product }, 201)
  } catch (err) {
    return serverError(err.message)
  }
}
