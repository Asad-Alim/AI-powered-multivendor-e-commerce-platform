// GET /api/orders/[orderId] — single order detail
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, notFound, error, serverError } from '@/lib/apiResponse'

export async function GET(req, { params }) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const { orderId } = await params

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        address: true,
        store: { select: { id: true, name: true, username: true, logo: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true, images: true, category: true } }
          }
        },
        transaction: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      }
    })

    if (!order) return notFound('Order not found')

    // Only order owner or admin can view
    if (order.userId !== user.id && user.role !== 'ADMIN') {
      return error('Not authorized to view this order', 403)
    }

    return success({ order })
  } catch (err) {
    return serverError(err.message)
  }
}
