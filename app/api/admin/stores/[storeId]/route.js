// PATCH /api/admin/stores/[storeId] — approve/reject/toggle store
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware'
import { success, notFound, serverError } from '@/lib/apiResponse'
import { sendStoreApprovedEmail } from '@/lib/email'

export async function PATCH(req, { params }) {
  try {
    const { error } = await requireAdmin(req)
    if (error) return error

    const { storeId } = await params
    const body = await req.json()

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { user: { select: { email: true, name: true } } }
    })
    if (!store) return notFound('Store not found')

    const updateData = {}
    if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status === 'APPROVED') updateData.isActive = true
      if (body.status === 'REJECTED') updateData.isActive = false
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive

   const updated = await prisma.store.update({ where: { id: storeId }, data: updateData })

    // Role flips to VENDOR only at approval time, not at application time
    // (item 4). Bump tokenVersion so every existing session/tab for this
    // user is invalidated — getUserFromRequest (lib/auth.js) rejects any
    // token whose tokenVersion no longer matches the DB, forcing a
    // re-login that picks up the new role in the JWT payload.
    if (body.status === 'APPROVED') {
      await prisma.user.update({
        where: { id: store.userId },
        data: { role: 'VENDOR', tokenVersion: { increment: 1 } },
      })
    }

    // In-app notification
    // In-app notification
    await prisma.notification.create({
      data: {
        userId: store.userId,
        title: body.status === 'APPROVED' ? 'Store Approved! 🎉' : body.status === 'REJECTED' ? 'Store Application Update' : 'Store Status Updated',
        message: body.status === 'APPROVED'
          ? 'Your store has been approved! You can now start selling on IntelliMart.'
          : body.status === 'REJECTED'
          ? 'Your store application was not approved. Contact support for details.'
          : `Your store is now ${body.isActive ? 'active' : 'inactive'}.`,
        type: body.status === 'APPROVED' ? 'success' : 'info',
        link: body.status === 'APPROVED' ? '/store' : '/create-store',
      }
    }).catch(() => {})

    // Send approval email (non-blocking)
    if (body.status === 'APPROVED') {
      sendStoreApprovedEmail({
        to: store.user.email,
        name: store.user.name,
        storeName: store.name,
      }).catch(() => {})
    }

    return success({ store: updated })
  } catch (err) { return serverError(err.message) }
}
