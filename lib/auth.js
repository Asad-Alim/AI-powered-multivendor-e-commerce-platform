// lib/auth.js — JWT Auth Utilities
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

// Fail loudly in production if no real secret is configured — never sign/verify
// with a fallback that's sitting in public source code.
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV !== 'production' ? 'dev-secret-change-in-production' : undefined)

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production')
}

const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '2h'

export function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET)
    } catch {
        return null
    }
}

export async function hashPassword(password) {
    return bcrypt.hash(password, 12)
}

export async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash)
}

export function extractTokenFromRequest(req) {
    // Browser flows use the httpOnly cookie exclusively now. The Bearer
    // header is kept only as a fallback for non-browser/API clients.
    const cookie = req.cookies?.get?.('auth_token')?.value
    if (cookie) return cookie
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7)
    }
    return null
}

export async function getUserFromRequest(req) {
    const token = extractTokenFromRequest(req)
    if (!token) return null
    const payload = verifyToken(token)
    if (!payload) return null

    // Revocation check: the token's tokenVersion must match the DB's current
    // value. Catches bans, role changes, and "log out everywhere" instantly,
    // without a session table — every authed request already hits Prisma.
    const dbUser = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { tokenVersion: true, isBanned: true }
    })
    if (!dbUser || dbUser.tokenVersion !== (payload.tokenVersion ?? 0)) return null
    if (dbUser.isBanned) return null

    return payload
}
    