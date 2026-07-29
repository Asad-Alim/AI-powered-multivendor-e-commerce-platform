// POST /api/auth/reset-password
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { success, error, serverError } from '@/lib/apiResponse'
import { validatePassword } from '@/lib/validate'
import crypto from 'crypto'

export async function POST(req) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) return error('Token and new password are required')

    const pwError = validatePassword(password)
    if (pwError) return error(pwError)

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const session = await prisma.session.findFirst({
      where: { token: `reset_${hashedToken}`, expiresAt: { gte: new Date() } }
    })

    if (!session) return error('Reset link is invalid or has expired. Please request a new one.', 400)

    const passwordHash = await hashPassword(password)

    await prisma.$transaction([
      prisma.user.update({ where: { id: session.userId }, data: { passwordHash } }),
      prisma.session.deleteMany({ where: { userId: session.userId, token: { startsWith: 'reset_' } } }),
    ])

    return success({ message: 'Password reset successfully. You can now log in.' })
  } catch (err) {
    return serverError(err.message)
  }
}
