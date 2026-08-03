'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AppContext'
import { useStore } from '@/context/StoreContext'
import Loading from '@/components/Loading'
import { Truck, Save, EyeOff, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StoreSettings() {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
  const { authFetch } = useAuth()
  const { activeStore, activeStoreId, loading: storeLoading, setStores } = useStore()

  const [shippingFee, setShippingFee] = useState('')
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('')
  const [offersFreeShipping, setOffersFreeShipping] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingVisibility, setTogglingVisibility] = useState(false)

  useEffect(() => {
    if (!activeStore) return
    setShippingFee(String(activeStore.shippingFee ?? 0))
    setOffersFreeShipping(activeStore.freeShippingThreshold != null)
    setFreeShippingThreshold(activeStore.freeShippingThreshold != null ? String(activeStore.freeShippingThreshold) : '')
  }, [activeStore])

  if (storeLoading) return <Loading />

  if (!activeStore) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 min-h-[50vh]' style={{ color: 'var(--text-muted)' }}>
        <Truck size={48} className='opacity-30' />
        <p>You don't have a store yet.</p>
      </div>
    )
  }

  const handleToggleVisibility = async () => {
    const hiding = activeStore.isActive
    if (hiding && !window.confirm('Hide your store? Your storefront will go offline immediately and customers won\'t be able to find or buy from it until you unhide it.')) {
      return
    }
    setTogglingVisibility(true)
    try {
      const res = await authFetch('/api/store', {
        method: 'PATCH',
        body: JSON.stringify({ storeId: activeStoreId, isActive: !activeStore.isActive }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to update visibility')
      toast.success(data.data.message)
      setStores?.(prev => prev.map(s => s.id === data.data.store.id ? data.data.store : s))
    } catch (err) {
      toast.error(err.message || 'Failed to update visibility')
    } finally {
      setTogglingVisibility(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await authFetch('/api/store', {
        method: 'PUT',
        body: JSON.stringify({
          storeId: activeStoreId,
          shippingFee: parseFloat(shippingFee) || 0,
          freeShippingThreshold: offersFreeShipping ? (parseFloat(freeShippingThreshold) || 0) : null,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to save')
      toast.success('Shipping settings saved')
      // Keep StoreContext's cached store record in sync so the cart/checkout
      // preview elsewhere in the app reflects the new values immediately.
      setStores?.(prev => prev.map(s => s.id === data.data.store.id ? data.data.store : s))
    } catch (err) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ color: 'var(--text-secondary)' }}>
      <div className='mb-8'>
        <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>
          Store <span className='text-green-500'>Settings</span>
        </h1>
        <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>
          Delivery fees for <span className='font-medium'>{activeStore.name}</span>
        </p>
      </div>

      <div className='max-w-md rounded-2xl border p-6 mb-6' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className='flex items-center gap-2 mb-3'>
          {activeStore.isActive ? <Eye size={18} className='text-green-500' /> : <EyeOff size={18} className='text-red-500' />}
          <h2 className='font-semibold' style={{ color: 'var(--text-primary)' }}>Store Visibility</h2>
        </div>
        <p className='text-sm mb-4' style={{ color: 'var(--text-muted)' }}>
          {activeStore.isActive
            ? 'Your store is visible and customers can place new orders.'
            : 'Your store is hidden. New customers can\'t find or buy from it, but you can still fulfill existing orders.'}
        </p>
        <button type='button' onClick={handleToggleVisibility} disabled={togglingVisibility}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold transition disabled:opacity-60 ${
            activeStore.isActive
              ? 'border text-red-500 hover:bg-red-50'
              : 'text-white bg-green-500 hover:bg-green-600'
          }`}
          style={activeStore.isActive ? { borderColor: 'var(--border-color)' } : {}}>
          {activeStore.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
          {togglingVisibility ? 'Updating…' : activeStore.isActive ? 'Hide Store' : 'Unhide Store'}
        </button>
      </div>

      <form onSubmit={handleSave} className='max-w-md rounded-2xl border p-6' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className='flex items-center gap-2 mb-5'>
          <Truck size={18} className='text-green-500' />
          <h2 className='font-semibold' style={{ color: 'var(--text-primary)' }}>Delivery Fees</h2>
        </div>

        <label className='block text-sm font-medium mb-1.5' style={{ color: 'var(--text-primary)' }}>
          Flat shipping fee ({currency})
        </label>
        <p className='text-xs mb-2' style={{ color: 'var(--text-muted)' }}>
          Charged on your portion of any order that doesn't qualify for free shipping below.
        </p>
        <input
          type='number' min='0' step='0.01' value={shippingFee}
          onChange={e => setShippingFee(e.target.value)}
          className='w-full p-2.5 rounded-xl border text-sm outline-none mb-5'
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
        />

        <label className='flex items-center gap-2 mb-3 cursor-pointer'>
          <input type='checkbox' checked={offersFreeShipping} onChange={e => setOffersFreeShipping(e.target.checked)} className='accent-green-500' />
          <span className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>Offer free shipping above a threshold</span>
        </label>

        {offersFreeShipping && (
          <>
            <label className='block text-sm font-medium mb-1.5' style={{ color: 'var(--text-primary)' }}>
              Free-shipping threshold ({currency})
            </label>
            <p className='text-xs mb-2' style={{ color: 'var(--text-muted)' }}>
              When a customer's subtotal from your store reaches this amount, your shipping fee is waived for that order.
            </p>
            <input
              type='number' min='0' step='0.01' value={freeShippingThreshold}
              onChange={e => setFreeShippingThreshold(e.target.value)}
              className='w-full p-2.5 rounded-xl border text-sm outline-none mb-5'
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
          </>
        )}

        <button type='submit' disabled={saving}
          className='flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold bg-green-500 hover:bg-green-600 active:scale-95 transition disabled:opacity-60'>
          <Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}