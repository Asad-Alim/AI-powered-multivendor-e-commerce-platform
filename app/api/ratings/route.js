// POST /api/ratings — submit a product rating
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, error, serverError } from '@/lib/apiResponse'

export async function POST(req) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError
    const body = await req.json()
    const { productId, orderId, rating, review } = body
    if (!productId || !orderId || !rating) return error('productId, orderId, rating are required')
    if (rating < 1 || rating > 5) return error('Rating must be between 1 and 5')
    if (review && review.trim().length < 5) return error('Review must be at least 5 characters')

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id, status: 'DELIVERED', orderItems: { some: { productId } } },
    })
    if (!order) return error('Order not found, not yet delivered, or product not in this order')

    const existing = await prisma.rating.findUnique({ where: { userId_productId_orderId: { userId: user.id, productId, orderId } } })
    if (existing) return error('You have already rated this product')

    const newRating = await prisma.rating.create({ data: { userId: user.id, productId, orderId, rating, review: review?.trim() || '' } })
    return success({ rating: newRating }, 201)
  } catch (err) { return serverError(err.message) }
}