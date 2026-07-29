// POST /api/auth/register
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'
import { success, error, validationError, serverError } from '@/lib/apiResponse'
import { validateEmail, validatePassword, sanitizeString } from '@/lib/validate'
import { sendWelcomeEmail } from '@/lib/email'

const COOKIE_MAX_AGE = 60 * 60 * 2 // 2h — keep in sync with JWT_EXPIRES_IN

export async function POST(req) {
  try {
    const body = await req.json()
    const { name, email, password } = body

    const errors = {}
    if (!name?.trim()) errors.name = 'Name is required'
    if (!email || !validateEmail(email)) errors.email = 'Valid email is required'
    const pwError = validatePassword(password || '')
    if (pwError) errors.password = pwError
    if (Object.keys(errors).length) return validationError(errors)

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) return error('An account with this email already exists', 409)

    const passwordHash = await hashPassword(password)
    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const user = await prisma.user.create({
      data: {
        id: userId,
        name: sanitizeString(name),
        email: email.toLowerCase(),
        image: '',
        passwordHash,
        role: 'CUSTOMER',
      },
      select: { id: true, name: true, email: true, role: true, image: true, tokenVersion: true }
    })

    const { tokenVersion, ...safeUser } = user
    const token = signToken({ id: user.id, email: user.email, role: user.role, tokenVersion })

    sendWelcomeEmail({ to: user.email, name: user.name }).catch(() => {})

    const res = success({ user: safeUser }, 201)
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