'use client'
import { Plus, Pen, X, MapPin } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAddresses, useCart, useAuth } from '@/context/AppContext'
import AddressModal from './AddressModal'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

export default function OrderSummary({ totalPrice, items }) {
  const { currency, clearCart } = useCart()
  const { addresses } = useAddresses()
  const { authFetch, user } = useAuth()
  const router = useRouter()

  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedAddress || addresses.length === 0) return
    setSelectedAddress(addresses.find(a => a.isDefault) || addresses[0])
  }, [addresses])
  const discount = coupon ? (coupon.discount / 100) * totalPrice : 0

  // ── Per-vendor shipping preview (item 6) ──────────────────────────────
  // Mirrors the server-side grouping logic in checkout/route.js — this is a
  // preview only; the authoritative charge is always computed server-side.
  const storeGroups = items.reduce((acc, item) => {
    const storeId = item.storeId || item.store?.id || 'unknown'
    if (!acc[storeId]) {
      acc[storeId] = {
        storeId,
        storeName: item.store?.name || 'Store',
        subtotal: 0,
        shippingFee: item.store?.shippingFee ?? 0,
        freeShippingThreshold: item.store?.freeShippingThreshold ?? null,
      }
    }
    acc[storeId].subtotal += item.price * item.quantity
    return acc
  }, {})

  const shippingBreakdown = Object.values(storeGroups).map(g => ({
    ...g,
    cost: g.freeShippingThreshold != null && g.subtotal >= g.freeShippingThreshold ? 0 : g.shippingFee,
  }))
  const totalShipping = shippingBreakdown.reduce((sum, g) => sum + g.cost, 0)

  const finalTotal = Math.max(0, totalPrice - discount) + totalShipping


  const handleCoupon = async (e) => {
    e.preventDefault()
    if (!couponInput.trim()) return
    try {
      const res = await fetch(`/api/coupon/validate?code=${couponInput.trim().toUpperCase()}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setCoupon(data.data.coupon)
      toast.success(`Coupon applied! ${data.data.coupon.discount}% off`)
    } catch (err) {
      toast.error(err.message || 'Invalid coupon')
    }
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    if (!user) { toast.error('Please login to place an order'); return }
    if (!selectedAddress) { toast.error('Please select a delivery address'); return }
    setLoading(true)

    try {
      const orderPayload = {
        addressId: selectedAddress.id,
        paymentMethod,
        items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
        couponCode: coupon?.code || null,
      }

      if (paymentMethod === 'STRIPE') {
        // Stripe checkout
        const res = await authFetch('/api/payment/stripe/checkout', {
          method: 'POST',
          body: JSON.stringify(orderPayload),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        const stripe = await stripePromise
        const { error } = await stripe.redirectToCheckout({ sessionId: data.data.sessionId })
        if (error) throw new Error(error.message)
      } else {
        // COD
        const res = await authFetch('/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderPayload),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        clearCart()
        toast.success('Order placed successfully!')
        router.push('/orders')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-lg lg:max-w-[360px] rounded-2xl p-6 text-sm border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
      <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Order Summary</h2>

      {/* Payment method */}
      <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Payment Method</p>
      <div className="flex flex-col gap-2 mb-5">
        {[['COD', 'Cash on Delivery'], ['STRIPE', 'Pay with Stripe']].map(([val, label]) => (
          <label key={val} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition hover:border-green-400" style={{ borderColor: paymentMethod === val ? '#22c55e' : 'var(--border-color)', backgroundColor: paymentMethod === val ? 'rgba(34,197,94,0.05)' : 'transparent' }}>
            <input type="radio" value={val} checked={paymentMethod === val} onChange={() => setPaymentMethod(val)} className="accent-green-500" />
            <span style={{ color: 'var(--text-primary)' }}>{label}</span>
          </label>
        ))}
      </div>

      {/* Delivery address */}
      <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Delivery Address</p>
      {selectedAddress ? (
        <div className="flex items-start justify-between p-3 rounded-xl border mb-3" style={{ borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.05)' }}>
          <div className="flex gap-2">
            <MapPin size={14} className="text-green-500 mt-0.5 shrink-0" />
            <p style={{ color: 'var(--text-primary)' }}>{selectedAddress.name}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zip}</p>
          </div>
          <button onClick={() => setSelectedAddress(null)} className="text-slate-400 hover:text-red-500 shrink-0"><X size={14} /></button>
        </div>
      ) : (
        <div className="mb-4">
          {addresses.length > 0 && (
            <select onChange={e => setSelectedAddress(addresses[parseInt(e.target.value)])} className="w-full p-2.5 rounded-xl border text-sm outline-none mb-2" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
              <option value="">Select saved address</option>
              {addresses.map((a, i) => <option key={i} value={i}>{a.name}, {a.city}, {a.state}</option>)}
            </select>
          )}
          <button onClick={() => setShowAddressModal(true)} className="flex items-center gap-1.5 text-green-500 hover:text-green-600 font-medium">
            <Plus size={15} /> Add new address
          </button>
        </div>
      )}

      {/* Coupon */}
      <div className="pb-4 border-b mb-4" style={{ borderColor: 'var(--border-color)' }}>
        {!coupon ? (
          <form onSubmit={handleCoupon} className="flex gap-2">
            <input value={couponInput} onChange={e => setCouponInput(e.target.value)} placeholder="Coupon code" className="flex-1 p-2 rounded-xl border text-sm outline-none" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            <button type="submit" className="px-4 py-2 rounded-xl bg-slate-700 text-white text-sm hover:bg-slate-800 transition">Apply</button>
          </form>
        ) : (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-green-50 text-green-700">
            <span className="text-sm font-medium">🎟 {coupon.code} — {coupon.discount}% off</span>
            <button onClick={() => { setCoupon(null); setCouponInput('') }}><X size={15} /></button>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="flex flex-col gap-2 mb-5">
        <div className="flex justify-between"><span>Subtotal</span><span style={{ color: 'var(--text-primary)' }}>{currency}{totalPrice.toFixed(2)}</span></div>

        {shippingBreakdown.length <= 1 ? (
          <div className="flex justify-between">
            <span>Shipping</span>
            <span className={totalShipping === 0 ? 'text-green-500' : ''} style={totalShipping > 0 ? { color: 'var(--text-primary)' } : undefined}>
              {totalShipping === 0 ? 'Free' : `${currency}${totalShipping.toFixed(2)}`}
            </span>
          </div>
        ) : (
          <div>
            <p className="mb-1">Shipping ({shippingBreakdown.length} vendors)</p>
            <div className="flex flex-col gap-1 pl-2 mb-1">
              {shippingBreakdown.map(g => (
                <div key={g.storeId} className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{g.storeName}</span>
                  <span className={g.cost === 0 ? 'text-green-500' : ''}>{g.cost === 0 ? 'Free' : `${currency}${g.cost.toFixed(2)}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {coupon && <div className="flex justify-between text-green-600"><span>Discount</span><span>−{currency}{discount.toFixed(2)}</span></div>}
        <div className="flex justify-between font-semibold text-base pt-2 border-t" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
          <span>Total</span><span>{currency}{finalTotal.toFixed(2)}</span>
        </div>
      </div>

      <button onClick={e => toast.promise(handlePlaceOrder(e), { loading: 'Placing order…', success: '', error: '' })} disabled={loading}
        className="w-full py-3 rounded-xl text-white font-semibold bg-slate-800 hover:bg-slate-900 active:scale-95 transition disabled:opacity-60">
        {loading ? 'Processing…' : paymentMethod === 'STRIPE' ? '⚡ Pay with Stripe' : 'Place Order'}
      </button>

      {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}
    </div>
  )
}
