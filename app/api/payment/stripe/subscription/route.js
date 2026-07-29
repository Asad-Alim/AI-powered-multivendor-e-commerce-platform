// POST /api/payment/stripe/subscription
// Creates a Stripe Checkout session for Plus / Pro subscription plans.
// Requires NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID and NEXT_PUBLIC_STRIPE_PRO_PRICE_ID in .env.local
import Stripe from 'stripe'
import { requireAuth } from '@/lib/middleware'
import { success, error, serverError, validationError } from '@/lib/apiResponse'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(req) {
  try {
    // FIX: use error() with explicit 503 status — serverError() only takes 1 arg and always returns 500
    if (!STRIPE_KEY || STRIPE_KEY === 'sk_test_placeholder') {
      return error('Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local', 503)
    }

    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const body = await req.json()
    const { priceId, planName } = body

    if (!priceId) return validationError('Price ID is required. Set NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID / NEXT_PUBLIC_STRIPE_PRO_PRICE_ID in your .env.local')
    if (!planName) return validationError('Plan name is required')

    const stripe = new Stripe(STRIPE_KEY)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      metadata: { userId: user.id, planName },
      success_url: `${APP_URL}/store?subscribed=${planName.toLowerCase()}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${APP_URL}/pricing?cancelled=true`,
      // Allow promotion codes (coupon field in Stripe checkout)
      allow_promotion_codes: true,
    })

    return success({ url: session.url, sessionId: session.id })
  } catch (err) {
    return serverError(err.message)
  }
}
