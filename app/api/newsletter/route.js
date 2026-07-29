// POST /api/newsletter — subscribe an email address
import { prisma } from '@/lib/prisma'
import { success, error, serverError } from '@/lib/apiResponse'

export async function POST(req) {
  try {
    const { email } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return error('Please provide a valid email address')
    }

    const normalized = email.trim().toLowerCase()

    // Upsert — silently succeed if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalized },
    })

    if (existing) {
      return error('This email is already subscribed', 409)
    }

    await prisma.newsletterSubscriber.create({
      data: { email: normalized },
    })

    return success({ message: 'Subscribed successfully!' }, 201)
  } catch (err) {
    return serverError(err.message)
  }
}
