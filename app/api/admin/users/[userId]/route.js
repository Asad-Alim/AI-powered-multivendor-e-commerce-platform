// PATCH /api/admin/users/[userId] — change role or ban/unban
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/middleware'
import { success, notFound, serverError, validationError, forbidden } from '@/lib/apiResponse'

export async function PATCH(req, { params }) {
    try {
        const { error, user: admin } = await requireAdmin(req)
        if (error) return error

        const target = await prisma.user.findUnique({ where: { id: params.userId } })
        if (!target) return notFound('User not found')
        if (target.id === admin.id) return forbidden('You cannot modify your own admin account')

        const body = await req.json()
        const { role, isBanned } = body
        const updateData = {}

        if (role) {
            const validRoles = ['CUSTOMER', 'VENDOR', 'ADMIN']
            if (!validRoles.includes(role)) return validationError('Invalid role. Must be CUSTOMER, VENDOR, or ADMIN')
            updateData.role = role
        }

        if (typeof isBanned === 'boolean') {
            updateData.isBanned = isBanned

            await prisma.notification.create({
                data: {
                    userId: target.id,
                    title: isBanned ? 'Account Suspended' : 'Account Reinstated',
                    message: isBanned
                        ? 'Your account has been suspended by an administrator. Please contact support.'
                        : 'Your account has been reinstated. You can now access all features.',
                    type: isBanned ? 'error' : 'success',
                }
            })
        }

        if (Object.keys(updateData).length === 0) {
            return validationError('Nothing to update')
        }

        updateData.tokenVersion = { increment: 1 }

        const updated = await prisma.user.update({
            where: { id: params.userId },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, isBanned: true }
        })

        return success({ user: updated, message: 'User updated successfully' })
    } catch (err) {
        return serverError(err.message)
    }
}

export async function DELETE(req, { params }) {
    try {
        const { error, user: admin } = await requireAdmin(req)
        if (error) return error

        const target = await prisma.user.findUnique({ where: { id: params.userId } })
        if (!target) return notFound('User not found')
        if (target.id === admin.id) return forbidden('You cannot delete your own account')
        if (target.role === 'ADMIN') return forbidden('Cannot delete another admin account')

        await prisma.user.delete({ where: { id: params.userId } })
        return success({ message: 'User deleted successfully' })
    } catch (err) {
        return serverError(err.message)
    }
}
