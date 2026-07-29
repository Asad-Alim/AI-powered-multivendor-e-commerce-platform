'use client'
import { Check, Zap, Store, Crown, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AppContext'
import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const plans = [
  {
    name: 'Free',
    price: 0,
    icon: Store,
    color: 'var(--text-secondary)',
    badge: null,
    features: ['Up to 50 products (across unlimited stores)', 'Basic store page', 'COD payments only', 'Standard support', 'IntelliMart branding', '10% platform fee'],
    cta: 'Start Free',
    priceId: null, // free — just redirect to create-store
  },
  {
    name: 'Plus',
    price: 29,
    icon: Zap,
    color: '#22c55e',
    badge: 'Most Popular',
    features: ['Up to 200 products (across unlimited stores)', 'Custom store URL', 'Stripe payment gateway', 'Coupon & discount tools', 'Sales analytics dashboard', 'Priority support', 'Remove IntelliMart branding', 'Only 9% platform fee'],
    cta: 'Get Plus',
    // Set NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID in .env.local once you create the product in Stripe
    priceId: process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID || null,
  },
  {
    name: 'Pro',
    price: 79,
    icon: Crown,
    color: '#6366f1',
    badge: 'Best for Scale',
    features: ['Unlimited products (across unlimited stores)', 'Everything in Plus', 'Multi-store management', 'AI product recommendations', 'Advanced analytics & exports', 'Dedicated account manager', 'Custom integrations', '99.9% SLA uptime', 'Only 8% platform fee'],
    cta: 'Get Pro',
    // Set NEXT_PUBLIC_STRIPE_PRO_PRICE_ID in .env.local once you create the product in Stripe
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || null,
  },
]

export default function PricingPage() {
  const { user, authFetch } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState(null)

  const handleSubscribe = async (plan) => {
    // Free plan — just go to create-store
    if (!plan.priceId) {
      window.location.href = '/create-store'
      return
    }

    // Must be logged in
    if (!user) {
      toast.error('Please sign in to subscribe')
      return
    }

    setLoadingPlan(plan.name)
    try {
      const res  = await authFetch('/api/payment/stripe/subscription', {
        method: 'POST',
        body: JSON.stringify({ priceId: plan.priceId, planName: plan.name }),
      })
      const data = await res.json()

      if (!data.success) throw new Error(data.error || 'Failed to start checkout')

      // Redirect to Stripe Checkout
      window.location.href = data.data.url
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className='mx-6 my-20'>
      <div className='max-w-5xl mx-auto'>
        {/* Header */}
        <div className='text-center mb-14'>
          <h1 className='text-4xl font-semibold mb-3' style={{ color: 'var(--text-primary)' }}>
            Simple, transparent <span className='text-green-500'>pricing</span>
          </h1>
          <p className='text-base max-w-lg mx-auto' style={{ color: 'var(--text-secondary)' }}>
            Start free. Scale as you grow. No hidden fees, no surprises.
          </p>
        </div>

        {/* Plans */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {plans.map((plan) => {
            const isLoading = loadingPlan === plan.name
            const isPlusHighlight = plan.name === 'Plus'
            return (
              <div key={plan.name} className='relative rounded-2xl border p-8 flex flex-col transition hover:shadow-lg'
                style={{
                  borderColor: isPlusHighlight ? '#22c55e' : 'var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  boxShadow: isPlusHighlight ? '0 0 0 1px #22c55e' : 'none',
                }}>

                {plan.badge && (
                  <span className='absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white'
                    style={{ backgroundColor: plan.color }}>
                    {plan.badge}
                  </span>
                )}

                <div className='flex items-center gap-3 mb-5'>
                  <div className='p-2.5 rounded-xl' style={{ backgroundColor: `${plan.color}18` }}>
                    <plan.icon size={20} style={{ color: plan.color }} />
                  </div>
                  <h2 className='text-lg font-semibold' style={{ color: 'var(--text-primary)' }}>{plan.name}</h2>
                </div>

                <div className='mb-6'>
                  <span className='text-4xl font-bold' style={{ color: 'var(--text-primary)' }}>${plan.price}</span>
                  <span className='text-sm ml-1' style={{ color: 'var(--text-muted)' }}>/month</span>
                </div>

                <ul className='flex flex-col gap-3 mb-8 flex-1'>
                  {plan.features.map((f, j) => (
                    <li key={j} className='flex items-start gap-2.5 text-sm' style={{ color: 'var(--text-secondary)' }}>
                      <Check size={15} className='mt-0.5 shrink-0' style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isLoading}
                  className='flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed'
                  style={{
                    backgroundColor: isPlusHighlight ? '#22c55e' : plan.name === 'Pro' ? '#6366f1' : 'var(--bg-card)',
                    color: plan.name === 'Free' ? 'var(--text-primary)' : '#fff',
                  }}>
                  {isLoading
                    ? <><Loader2 size={15} className='animate-spin' /> Redirecting…</>
                    : plan.cta}
                </button>

                {/* Show note if Stripe price ID not configured yet */}
                {plan.priceId === null && plan.price > 0 && (
                  <p className='text-center text-[11px] mt-2' style={{ color: 'var(--text-muted)' }}>
                    Configure <code>STRIPE_*_PRICE_ID</code> in .env to activate
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <p className='text-center text-sm mt-10' style={{ color: 'var(--text-muted)' }}>
          All plans include free SSL, global CDN, and 24/7 uptime monitoring. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
