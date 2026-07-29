// POST /api/auth/login
import { prisma } from '@/lib/prisma'
import { comparePassword, signToken } from '@/lib/auth'
import { success, error, validationError, serverError, unauthorized } from '@/lib/apiResponse'
import { validateEmail } from '@/lib/validate'

const COOKIE_MAX_AGE = 60 * 60 * 2 // 2h — keep in sync with JWT_EXPIRES_IN

export async function POST(req) {
    try {
        const body = await req.json()
        const { email, password } = body

        const errors = {}
        if (!email || !validateEmail(email)) errors.email = 'Valid email is required'
        if (!password) errors.password = 'Password is required'
        if (Object.keys(errors).length) return validationError(errors)

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, name: true, email: true, role: true, image: true, passwordHash: true, tokenVersion: true, isBanned: true }
        })

        if (!user || !user.passwordHash) return unauthorized('Invalid email or password')

        const valid = await comparePassword(password, user.passwordHash)
        if (!valid) return unauthorized('Invalid email or password')

        if (user.isBanned) return unauthorized('Your account has been suspended. Please contact support.')
            
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        })

        const { passwordHash: _, tokenVersion, ...safeUser } = user
        const token = signToken({ id: user.id, email: user.email, role: user.role, tokenVersion })

        const res = success({ user: safeUser })
        res.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        })
        return res
    } catch (err) {
        return serverError(err.message)
    }
}