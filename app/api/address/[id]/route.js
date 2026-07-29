// PUT /api/address/[id]  — update address
// DELETE /api/address/[id] — delete address
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, notFound, error, serverError, validationError } from '@/lib/apiResponse'
import { validateAddress } from '@/lib/validate'

export async function PUT(req, { params }) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const { id } = await params
    const body = await req.json()

    const address = await prisma.address.findFirst({ where: { id, userId: user.id } })
    if (!address) return notFound('Address not found')

    const errors = validateAddress(body)
    if (errors) return validationError(errors)

    const updated = await prisma.address.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        street: body.street,
        city: body.city,
        state: body.state,
        zip: body.zip,
        country: body.country,
        phone: body.phone,
        isDefault: body.isDefault ?? address.isDefault,
      }
    })

    return success({ address: updated })
  } catch (err) {
    return serverError(err.message)
  }
}

export async function DELETE(req, { params }) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const { id } = await params

    const address = await prisma.address.findFirst({ where: { id, userId: user.id } })
    if (!address) return notFound('Address not found')

    // Check if address is used in any pending/active orders
    const activeOrders = await prisma.order.count({
      where: { addressId: id, status: { notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED'] } }
    })
    if (activeOrders > 0) {
      return error('Cannot delete address with active orders', 400)
    }

    await prisma.address.delete({ where: { id } })
    return success({ message: 'Address deleted successfully' })
  } catch (err) {
    return serverError(err.message)
  }
}
