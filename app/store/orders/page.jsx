'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AppContext'
import { useStore } from '@/context/StoreContext'
import Loading from '@/components/Loading'
import { orderDummyData } from '@/assets/assets'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { X, ChevronDown } from 'lucide-react'

// Manually-settable via the per-row dropdown — vendors drive an order through
// these. PARTIALLY_RETURNED is system-derived from item-level returns (see
// the return-request routes) and is intentionally excluded here.
const STATUS_OPTIONS = ['PENDING','CONFIRMED','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURN_REQUESTED','RETURNED']
// Includes every status an order can actually be in, for the top filter bar.
const FILTER_OPTIONS = [...STATUS_OPTIONS, 'PARTIALLY_RETURNED']
const STATUS_COLORS = {
  PENDING:'text-slate-500 bg-slate-100', CONFIRMED:'text-yellow-600 bg-yellow-100',
  PACKED:'text-blue-600 bg-blue-100', SHIPPED:'text-indigo-600 bg-indigo-100',
  OUT_FOR_DELIVERY:'text-orange-600 bg-orange-100', DELIVERED:'text-green-600 bg-green-100',
  CANCELLED:'text-red-600 bg-red-100',
  RETURN_REQUESTED:'text-purple-600 bg-purple-100', RETURNED:'text-purple-600 bg-purple-100',
  PARTIALLY_RETURNED:'text-purple-600 bg-purple-100',
}

export default function StoreOrders() {
  const { authFetch, user } = useAuth()
  const { activeStoreId } = useStore()
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('ALL')

  const fetchOrders = async ({ silent } = {}) => {
    if (!silent) setLoading(true)
    try {
      if (user && activeStoreId) {
        const res = await authFetch(`/api/store/orders?storeId=${activeStoreId}`)
        const data = await res.json()
        if (data.success) { setOrders(data.data.orders); return data.data.orders }
      }
      setOrders(orderDummyData)
    } catch { setOrders(orderDummyData) }
    finally { if (!silent) setLoading(false) }
  }

  useEffect(() => { fetchOrders() }, [user, activeStoreId])

  const updateStatus = async (orderId, status) => {
    try {
      const res = await authFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
    } catch { /* demo fallback */ }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    if (selected?.id === orderId) setSelected(s => ({ ...s, status }))
    toast.success(`Status updated to ${status.replace(/_/g, ' ')}`)
  }

  // Refetch the real order list after a return decision instead of guessing
  // the resulting status locally — a partial approve/reject can leave the
  // order at PARTIALLY_RETURNED or back at RETURN_REQUESTED, not just the
  // fully-resolved RETURNED/DELIVERED this used to assume.
  const syncSelectedFrom = (freshOrders, orderId) => {
    const fresh = freshOrders?.find(o => o.id === orderId)
    if (fresh) setSelected(fresh)
  }

  const approveReturn = async (orderId, note, productIds) => {
    try {
      const res = await authFetch(`/api/orders/${orderId}/return-request/approve`, {
        method: 'POST',
        body: JSON.stringify({ note, productIds }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      const fresh = await fetchOrders({ silent: true })
      if (selected?.id === orderId) syncSelectedFrom(fresh, orderId)
      toast.success('Return approved — refund issued')
    } catch (err) {
      toast.error(err.message || 'Failed to approve return')
    }
  }

  const rejectReturn = async (orderId, note, productIds) => {
    try {
      const res = await authFetch(`/api/orders/${orderId}/return-request/reject`, {
        method: 'POST',
        body: JSON.stringify({ note, productIds }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      const fresh = await fetchOrders({ silent: true })
      if (selected?.id === orderId) syncSelectedFrom(fresh, orderId)
      toast.success('Return rejected')
    } catch (err) {
      toast.error(err.message || 'Failed to reject return')
    }
  }

  if (loading) return <Loading />

  const filtered = filter === 'ALL' ? orders : orders.filter(o => o.status === filter)

  return (
    <div style={{ color: 'var(--text-secondary)' }}>
      <div className='flex items-center justify-between mb-6 flex-wrap gap-3'>
        <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>
          Store <span className='text-green-500'>Orders</span>
          <span className='ml-2 text-sm font-normal' style={{ color: 'var(--text-muted)' }}>({filtered.length})</span>
        </h1>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className='px-3 py-2 rounded-xl border text-sm outline-none'
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
         <option value='ALL'>All Orders</option>
          {FILTER_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className='text-center py-16 text-sm' style={{ color: 'var(--text-muted)' }}>No orders found</p>
      ) : (
        <div className='rounded-2xl border overflow-hidden' style={{ borderColor: 'var(--border-color)' }}>
          <table className='w-full text-sm'>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                {['#', 'Customer', 'Total', 'Payment', 'Status', 'Date', 'Update'].map(h => (
                  <th key={h} className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y' style={{ borderColor: 'var(--border-color)' }}>
              {filtered.map((order, i) => (
                <tr key={order.id} onClick={() => setSelected(order)} className='cursor-pointer transition-colors'
                  style={{ backgroundColor: 'var(--bg-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}>
                  <td className='px-4 py-3 text-green-500 font-medium'>#{i + 1}</td>
                  <td className='px-4 py-3' style={{ color: 'var(--text-primary)' }}>{order.user?.name || '—'}</td>
                  <td className='px-4 py-3 font-semibold' style={{ color: 'var(--text-primary)' }}>{currency}{order.total}</td>
                  <td className='px-4 py-3'><span className='text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600'>{order.paymentMethod}</span></td>
                  <td className='px-4 py-3'>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-500'}`}>
                      {order.status?.replace(/_/g,' ')}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-xs' style={{ color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className='px-4 py-3' onClick={e => e.stopPropagation()}>
                    <select value={order.status} onChange={e => toast.promise(updateStatus(order.id, e.target.value), { loading: 'Updating…' })}
                      className='text-xs px-2 py-1.5 rounded-lg border outline-none'
                      style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order detail modal */}
      {selected && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4' onClick={() => setSelected(null)}>
          <div className='w-full max-w-lg rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto' style={{ backgroundColor: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-5'>
              <h2 className='text-lg font-semibold' style={{ color: 'var(--text-primary)' }}>Order Details</h2>
              <button onClick={() => setSelected(null)} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            {/* Customer */}
            <div className='mb-4 p-4 rounded-xl text-sm' style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className='font-semibold mb-2 text-green-500'>Customer</p>
              <p style={{ color: 'var(--text-primary)' }}>{selected.user?.name}</p>
              <p style={{ color: 'var(--text-secondary)' }}>{selected.user?.email}</p>
              <p style={{ color: 'var(--text-secondary)' }}>{selected.address?.phone}</p>
              <p className='mt-1' style={{ color: 'var(--text-muted)' }}>{selected.address?.street}, {selected.address?.city}, {selected.address?.state} {selected.address?.zip}</p>
            </div>

            {/* Items */}
            <div className='mb-4'>
              <p className='font-semibold mb-2 text-sm text-green-500'>Items</p>
              {selected.orderItems?.map((item, i) => (
                <div key={i} className='flex items-center gap-3 p-3 rounded-xl border mb-2' style={{ borderColor: 'var(--border-color)' }}>
                  <div className='size-12 rounded-lg flex items-center justify-center' style={{ backgroundColor: 'var(--bg-card)' }}>
                    <Image src={item.product?.images?.[0]?.src || item.product?.images?.[0] || 'https://placehold.co/48'} alt='' width={40} height={40} className='object-contain h-10 w-auto' />
                  </div>
                 <div className='flex-1 text-sm'>
                    <p style={{ color: 'var(--text-primary)' }}>{item.product?.name}</p>
                    <p style={{ color: 'var(--text-muted)' }}>Qty: {item.quantity} · {currency}{item.price}</p>
                    {item.returnStatus && item.returnStatus !== 'NONE' && (
                      <p className='text-xs mt-0.5 text-purple-500'>
                        Return {item.returnStatus.toLowerCase()}{item.returnReason ? `: ${item.returnReason}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className='p-4 rounded-xl text-sm' style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className='flex justify-between mb-1'><span style={{ color: 'var(--text-secondary)' }}>Payment</span><span className='font-medium' style={{ color: 'var(--text-primary)' }}>{selected.paymentMethod}</span></div>
              <div className='flex justify-between mb-1'><span style={{ color: 'var(--text-secondary)' }}>Paid</span><span className={selected.isPaid ? 'text-green-500 font-medium' : 'text-red-400 font-medium'}>{selected.isPaid ? 'Yes' : 'Pending'}</span></div>
              <div className='flex justify-between'><span style={{ color: 'var(--text-secondary)' }}>Total</span><span className='font-bold text-base' style={{ color: 'var(--text-primary)' }}>{currency}{selected.total}</span></div>
            </div>

            {selected.orderItems?.some(oi => oi.returnStatus === 'REQUESTED') && (
              <div className='mt-4 p-4 rounded-xl border' style={{ borderColor: 'var(--border-color)' }}>
                <p className='text-sm font-semibold mb-3' style={{ color: 'var(--text-primary)' }}>Return Requested</p>
                <ReturnDecisionButtons
                  items={selected.orderItems.filter(oi => oi.returnStatus === 'REQUESTED')}
                  currency={currency}
                  onApprove={(note, productIds) => approveReturn(selected.id, note, productIds)}
                  onReject={(note, productIds) => rejectReturn(selected.id, note, productIds)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ReturnDecisionButtons({ items, currency, onApprove, onReject }) {
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(null) // 'approve' | 'reject' | null
  const [selectedIds, setSelectedIds] = useState(() => items.map(i => i.productId))

  const toggleItem = (productId) => {
    setSelectedIds(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId])
  }

  const itemList = (
    <div className='mb-3 flex flex-col gap-2'>
      {items.map(item => (
        <label key={item.productId} className='flex items-start gap-2 text-xs cursor-pointer'>
          <input type='checkbox' className='mt-0.5 accent-purple-500'
            checked={selectedIds.includes(item.productId)}
            onChange={() => toggleItem(item.productId)} />
          <span style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-primary)' }}>{item.name}</span> · Qty {item.quantity} · {currency}{item.price}
            {item.returnReason && <span className='block' style={{ color: 'var(--text-muted)' }}>Reason: {item.returnReason}</span>}
          </span>
        </label>
      ))}
    </div>
  )

  if (showNote) {
    return (
      <div>
        {itemList}
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder='Optional note to the buyer…'
          className='w-full p-2.5 rounded-xl border text-sm outline-none resize-none mb-3'
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
        />
        <div className='flex gap-2'>
          <button
            disabled={selectedIds.length === 0}
            onClick={() => (showNote === 'approve' ? onApprove(note, selectedIds) : onReject(note, selectedIds))}
            className={`flex-1 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 ${showNote === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
            Confirm {showNote === 'approve' ? 'Approve' : 'Reject'} ({selectedIds.length})
          </button>
          <button onClick={() => setShowNote(null)} className='px-4 py-2 rounded-xl border text-sm' style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {itemList}
      <div className='flex gap-2'>
        <button onClick={() => setShowNote('approve')} className='flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition'>
          Approve Selected
        </button>
        <button onClick={() => setShowNote('reject')} className='flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition'>
          Reject Selected
        </button>
      </div>
    </div>
  )
}