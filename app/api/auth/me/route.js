// GET /api/auth/me — Get current user
// PUT /api/auth/me — Update name / email / password
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { hashPassword, comparePassword, signToken } from '@/lib/auth'
import { success, notFound, serverError, validationError, unauthorized } from '@/lib/apiResponse'
import { validateEmail } from '@/lib/validate'

export async function GET(req) {
    try {
        const { error, user: payload } = await requireAuth(req)
        if (error) return error

        const user = await prisma.user.findUnique({
            where: { id: payload.id },
            select: {
                id: true, name: true, email: true, role: true, image: true,
                wishlist: true, stores: { select: { id: true, name: true, username: true, isActive: true, status: true } }
            }
        })
        if (!user) return notFound('User not found')
        return success({ user })
    } catch (err) {
        return serverError(err.message)
    }
}

export async function PUT(req) {
    try {
        const { error, user: payload } = await requireAuth(req)
        if (error) return error

        const body = await req.json()
        const { name, email, currentPassword, newPassword } = body
        const updateData = {}

        if (name) {
            if (name.trim().length < 2) return validationError('Name must be at least 2 characters')
            updateData.name = name.trim()
        }
        if (email) {
            if (!validateEmail(email)) return validationError('Invalid email address')
            const existing = await prisma.user.findFirst({ where: { email, NOT: { id: payload.id } } })
            if (existing) return validationError('Email already in use by another account')
            updateData.email = email.toLowerCase()
        }
        if (newPassword) {
            if (!currentPassword) return validationError('Current password is required to set a new password')
            const dbUser = await prisma.user.findUnique({ where: { id: payload.id } })
            const valid = await comparePassword(currentPassword, dbUser.passwordHash)
            if (!valid) return unauthorized('Current password is incorrect')
            if (newPassword.length < 8) return validationError('New password must be at least 8 characters')
            updateData.passwordHash = await hashPassword(newPassword)
            // Same revocation mechanism as reset-password: invalidate every
            // other JWT already issued to this user (other tabs/devices).
            updateData.tokenVersion = { increment: 1 }
        }
        if (Object.keys(updateData).length === 0) return validationError('No fields to update')

        const updated = await prisma.user.update({
            where: { id: payload.id },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, image: true, tokenVersion: true }
        })

        const res = success({ user: updated })
        if (newPassword) {
            // Re-sign a fresh token for *this* tab so the user isn't logged
            // out of the session they just used to change their password —
            // only other tabs/devices get invalidated by the tokenVersion bump.
            const token = signToken({ id: updated.id, email: updated.email, role: updated.role, tokenVersion: updated.tokenVersion })
            res.cookies.set('auth_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 2,
            })
        }
        return res
    } catch (err) {
        return serverError(err.message)
    }
}