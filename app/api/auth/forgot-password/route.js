// POST /api/auth/forgot-password
import { prisma } from '@/lib/prisma'
import { success, error, serverError } from '@/lib/apiResponse'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req) {
  try {
    const { email } = await req.json()
    if (!email) return error('Email is required')

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, email: true, passwordHash: true }
    })

    // Always return success to prevent email enumeration
    if (!user || !user.passwordHash) {
      return success({ message: 'If an account exists, a reset link has been sent.' })
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store token in Session table (reusing it as a reset store)
    await prisma.session.deleteMany({ where: { userId: user.id, token: { startsWith: 'reset_' } } })
    await prisma.session.create({
      data: { userId: user.id, token: `reset_${hashedToken}`, expiresAt }
    })

    // Send reset email (non-blocking)
    sendPasswordResetEmail({ to: user.email, name: user.name, resetToken }).catch(() => {})

    return success({ message: 'If an account exists, a reset link has been sent.' })
  } catch (err) {
    return serverError(err.message)
  }
}
