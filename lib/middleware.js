// lib/middleware.js — Auth middleware for API routes
import { getUserFromRequest } from './auth'
import { unauthorized, forbidden } from './apiResponse'

export async function requireAuth(req) {
    const user = await getUserFromRequest(req)
    if (!user) return { error: unauthorized(), user: null }
    return { error: null, user }
}

export async function requireRole(req, ...roles) {
    const { error, user } = await requireAuth(req)
    if (error) return { error, user: null }
    if (!roles.includes(user.role)) return { error: forbidden('Insufficient permissions'), user: null }
    return { error: null, user }
}

export async function requireAdmin(req) {
    return requireRole(req, 'ADMIN')
}

export async function requireVendorOrAdmin(req) {
    return requireRole(req, 'VENDOR', 'ADMIN')
}
