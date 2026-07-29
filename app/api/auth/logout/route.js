// POST /api/auth/logout — invalidate session server-side
import { requireAuth } from '@/lib/middleware'
import { success, serverError } from '@/lib/apiResponse'
import { prisma } from '@/lib/prisma'

function clearAuthCookie(res) {
  res.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}

export async function POST(req) {
  try {
    const { error, user } = await requireAuth(req)
    if (error) return clearAuthCookie(success({ message: 'Logged out' }))

    await prisma.session.deleteMany({ where: { userId: user.id } }).catch(() => {})

    return clearAuthCookie(success({ message: 'Logged out successfully' }))
  } catch (err) {
    return serverError(err.message)
  }
}