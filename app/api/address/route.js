// GET /api/address — list user addresses
// POST /api/address — create address
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, serverError, validationError } from '@/lib/apiResponse'
import { validateAddress } from '@/lib/validate'

export async function GET(req) {
  try {
    const { error, user } = await requireAuth(req)
    if (error) return error
    const addresses = await prisma.address.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    return success({ addresses })
  } catch (err) { return serverError(err.message) }
}

export async function POST(req) {
  try {
    const { error, user } = await requireAuth(req)
    if (error) return error
    const body = await req.json()
    const errors = validateAddress(body)
    if (errors) return validationError(errors)
    const address = await prisma.address.create({ data: { userId: user.id, name: body.name, email: body.email, street: body.street, city: body.city, state: body.state, zip: body.zip, country: body.country, phone: body.phone } })
    return success({ address }, 201)
  } catch (err) { return serverError(err.message) }
}
