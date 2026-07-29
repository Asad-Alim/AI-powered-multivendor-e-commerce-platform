// top of file — replace the import block
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, error, serverError, validationError } from '@/lib/apiResponse'
import { resolveOwnedStore } from '@/lib/store'


export async function POST(req) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const body = await req.json()
    const { name, username, description, email, contact, address, logo } = body

    const errs = {}
    if (!name?.trim()) errs.name = 'Store name required'
    if (!username?.trim()) errs.username = 'Username required'
    if (!description?.trim()) errs.description = 'Description required'
    if (!email?.trim()) errs.email = 'Email required'
    if (Object.keys(errs).length) return validationError(errs)

    // Check username taken
    const existing = await prisma.store.findUnique({ where: { username } })
    if (existing) return error('This username is already taken', 409)

    // Multi-store: a user can own several stores now, so no "already has a
    // store" block. We do still block submitting a duplicate application
    // while one is PENDING review, to avoid spam — enforced client-side in
    // create-store/page.jsx (which only shows the form when no store is
    // PENDING) rather than here, since a vendor legitimately adding a
    // second store after their first was APPROVED/REJECTED should succeed.


    const store = await prisma.store.create({
      data: { userId: user.id, name: name.trim(), username: username.trim().toLowerCase(), description: description.trim(), email, contact: contact || '', address: address || '', logo: logo || 'https://placehold.co/200', status: 'PENDING', isActive: false }
    })

    // Update user role to VENDOR
    await prisma.user.update({ where: { id: user.id }, data: { role: 'VENDOR' } })

    return success({ store, message: 'Store application submitted. Awaiting admin approval.' }, 201)
  } catch (err) { return serverError(err.message) }
}


// PUT /api/store — vendor updates their own store's shipping settings
// (item 6: per-store flat fee + optional free-shipping threshold).
// Body: { storeId, shippingFee, freeShippingThreshold }
export async function PUT(req) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const body = await req.json()
    const { storeId, shippingFee, freeShippingThreshold } = body

    const store = await resolveOwnedStore(user.id, storeId, { id: true })
    if (!store) return error('Store not found or not owned by you', 404)

    const errs = {}
    const parsedFee = Number(shippingFee)
    if (shippingFee === undefined || shippingFee === null || Number.isNaN(parsedFee) || parsedFee < 0) {
      errs.shippingFee = 'Shipping fee must be a non-negative number'
    }

    let parsedThreshold = null
    if (freeShippingThreshold !== null && freeShippingThreshold !== undefined && freeShippingThreshold !== '') {
      parsedThreshold = Number(freeShippingThreshold)
      if (Number.isNaN(parsedThreshold) || parsedThreshold < 0) {
        errs.freeShippingThreshold = 'Free-shipping threshold must be a non-negative number, or left blank'
      }
    }
    if (Object.keys(errs).length) return validationError(errs)

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: { shippingFee: parsedFee, freeShippingThreshold: parsedThreshold },
    })

    return success({ store: updated, message: 'Shipping settings updated' })
  } catch (err) { return serverError(err.message) }
}