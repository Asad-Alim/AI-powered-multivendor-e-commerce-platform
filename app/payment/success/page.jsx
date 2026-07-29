'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Package, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useCart, useAuth } from '@/context/AppContext'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { clearCart } = useCart()
  const { authFetch } = useAuth()
  // Checkout now splits into one Order per vendor sharing this group id
  // (item 1) — there's no longer a single orderId to show.
  const orderGroupId = searchParams.get('order_group')
  const [done, setDone] = useState(false)
  const [shipmentCount, setShipmentCount] = useState(null)

  useEffect(() => {
    clearCart()
    const t = setTimeout(() => setDone(true), 800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!orderGroupId) return
    // Webhook processing can lag slightly behind the redirect, so this may
    // briefly return 0 — it's a friendly "N shipments" label, not load-bearing.
    authFetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const count = data.data.orders.filter(o => o.orderGroupId === orderGroupId).length
          if (count > 0) setShipmentCount(count)
        }
      })
      .catch(() => {})
  }, [orderGroupId])

  if (!done) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={40} className="animate-spin text-green-500" />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-20 scale-150" />
        <CheckCircle size={72} className="text-green-500 relative" />
      </div>
      <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Payment Successful!</h1>
      <p className="max-w-sm" style={{ color: 'var(--text-secondary)' }}>
        {shipmentCount > 1
          ? `Your order has been confirmed as ${shipmentCount} separate shipments — one per vendor. You'll receive an email confirmation shortly.`
          : "Your order has been confirmed. You'll receive an email confirmation shortly."}
      </p>
      {orderGroupId && (
        <p className="text-sm font-mono px-4 py-2 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
          Order #{orderGroupId.slice(-12).toUpperCase()}
        </p>
      )}
      <div className="flex gap-4 mt-2">
        <Link href="/orders" className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium transition">
          <Package size={16} /> View Orders
        </Link>
        <Link href="/shop" className="flex items-center gap-2 px-6 py-3 border rounded-full font-medium transition hover:border-green-400" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
          Continue Shopping <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}

export default function PaymentSuccess() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 size={40} className="animate-spin text-green-500" /></div>}>
    <SuccessContent />
  </Suspense>
}