'use client'
import Image from 'next/image'
import { DotIcon, RotateCcw } from 'lucide-react'
import { useRatings, useAuth } from '@/context/AppContext'
import Rating from './Rating'
import { useState } from 'react'
import RatingModal from './RatingModal'
import toast from 'react-hot-toast'

const STATUS_STYLE = {
  PENDING:          'text-slate-500 bg-slate-100',
  CONFIRMED:        'text-yellow-600 bg-yellow-100',
  PACKED:           'text-blue-600 bg-blue-100',
  SHIPPED:          'text-indigo-600 bg-indigo-100',
  OUT_FOR_DELIVERY: 'text-orange-600 bg-orange-100',
  DELIVERED:        'text-green-600 bg-green-100',
  CANCELLED:        'text-red-600 bg-red-100',
  RETURN_REQUESTED: 'text-purple-600 bg-purple-100',
  RETURNED:         'text-purple-600 bg-purple-100',
  REFUNDED:         'text-pink-600 bg-pink-100',
}

export default function OrderItem({ order, onStatusChange }) {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
  const [ratingModal, setRatingModal]       = useState(null)
  const [returnModal, setReturnModal]       = useState(false)
  const [returnReason, setReturnReason]     = useState('')
  const [returningOrder, setReturningOrder] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const { ratings } = useRatings()
  const { authFetch } = useAuth()

  const statusClass = STATUS_STYLE[order.status] || 'text-slate-500 bg-slate-100'

  const submitReturn = async (e) => {
    e.preventDefault()
    if (returnReason.trim().length < 10) {
      toast.error('Please provide a reason (min 10 characters)')
      return
    }
    setReturningOrder(true)
    try {
      const res  = await authFetch(`/api/orders/${order.id}/return-request`, {
        method: 'POST',
        body: JSON.stringify({ reason: returnReason }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Return request submitted!')
      setReturnModal(false)
      setReturnReason('')
      if (onStatusChange) onStatusChange(order.id, 'RETURN_REQUESTED')
    } catch (err) {
      toast.error(err.message || 'Failed to submit return request')
    } finally {
      setReturningOrder(false)
    }
  }

  const submitCancel = async () => {
    setCancelling(true)
    try {
      const res = await authFetch(`/api/orders/${order.id}/cancel`, { method: 'POST' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Order cancelled')
      if (onStatusChange) onStatusChange(order.id, 'CANCELLED')
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <tr className='text-sm'>
        <td className='text-left'>
          <div className='flex flex-col gap-6'>
            {order.orderItems.map((item, i) => {
              const imgSrc = item.product?.images?.[0]?.src || item.product?.images?.[0] || item.image || ''
              return (
                <div key={i} className='flex items-center gap-4'>
                  <div className='w-20 aspect-square rounded-xl flex items-center justify-center flex-shrink-0' style={{ backgroundColor: 'var(--bg-card)' }}>
                    {imgSrc
                      ? <Image className='h-14 w-auto object-contain' src={imgSrc} alt='' width={50} height={50} />
                      : <div className='size-10 rounded-lg bg-slate-200' />}
                  </div>
                  <div className='text-sm'>
                    <p className='font-medium' style={{ color: 'var(--text-primary)' }}>{item.product?.name || item.name}</p>
                    <p style={{ color: 'var(--text-secondary)' }}>{currency}{item.price} × {item.quantity}</p>
                    <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{new Date(order.createdAt).toDateString()}</p>
                    {order.status === 'DELIVERED' && item.product?.id && (
                      ratings.find(r => r.orderId === order.id && r.productId === item.product.id)
                        ? <Rating value={ratings.find(r => r.orderId === order.id && r.productId === item.product.id).rating} />
                        : <button onClick={() => setRatingModal({ orderId: order.id, productId: item.product.id })} className='text-green-500 text-xs hover:underline mt-1'>Rate this product</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </td>

        <td className='text-center font-medium max-md:hidden' style={{ color: 'var(--text-primary)' }}>
          {currency}{order.total}
        </td>

        <td className='text-left max-md:hidden text-sm' style={{ color: 'var(--text-secondary)' }}>
          <p>{order.address?.name}, {order.address?.street}</p>
          <p>{order.address?.city}, {order.address?.state} {order.address?.zip}</p>
        </td>

        <td className='max-md:hidden'>
          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
            <DotIcon size={10} className='scale-150' />
            {order.status?.replace(/_/g, ' ')}
          </div>
          {order.trackingNumber && (
            <p className='text-xs mt-1.5' style={{ color: 'var(--text-muted)' }}>
              Tracking: <span className='font-mono'>{order.trackingNumber}</span>
            </p>
          )}
          {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
            order.paymentMethod === 'STRIPE' && order.paymentStatus === 'PENDING' ? (
              <p className='text-xs mt-1.5' style={{ color: 'var(--text-muted)' }}>
                Payment processing — you'll be able to cancel once it's confirmed
              </p>
            ) : (
              <button onClick={() => toast.promise(submitCancel(), { loading: 'Cancelling…' })} disabled={cancelling}
                className='flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1.5 transition disabled:opacity-60'>
                Cancel Order
              </button>
            )
          )}
          {order.status === 'DELIVERED' && (
            <button onClick={() => setReturnModal(true)}
              className='flex items-center gap-1 text-xs text-purple-500 hover:text-purple-700 mt-1.5 transition'>
              <RotateCcw size={11} /> Request Return
            </button>
          )}
          {(order.status === 'RETURNED' || (order.status === 'DELIVERED' && order.returnDecisionNote)) && order.returnDecisionNote && (
            <p className='text-xs mt-1.5' style={{ color: 'var(--text-muted)' }}>
              {order.status === 'RETURNED'
                ? `Return approved — refund issued${order.returnDecisionNote ? `: ${order.returnDecisionNote}` : ''}`
                : `Return rejected: ${order.returnDecisionNote}`}
            </p>
          )}
        </td>
      </tr>

      <tr className='md:hidden text-xs'>
        <td colSpan={4} className='pb-3' style={{ color: 'var(--text-secondary)' }}>
          <p>{order.address?.name}, {order.address?.street}, {order.address?.city}</p>
          <div className='flex items-center gap-3 mt-2 flex-wrap'>
            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
              {order.status?.replace(/_/g, ' ')}
            </div>
            {order.status === 'DELIVERED' && (
              <button onClick={() => setReturnModal(true)} className='text-xs text-purple-500 hover:underline flex items-center gap-1'>
                <RotateCcw size={11} /> Return
              </button>
            )}
          </div>
        </td>
      </tr>

      <tr>
        <td colSpan={4}>
          <div className='border-b w-5/6 mx-auto' style={{ borderColor: 'var(--border-color)' }} />
        </td>
      </tr>

      {/* RatingModal rendered outside table via portal pattern */}
      {ratingModal && <RatingModal ratingModal={ratingModal} setRatingModal={setRatingModal} />}

      {/* Return Request Modal */}
      {returnModal && (
        <ReturnModal
          orderId={order.id}
          returnReason={returnReason}
          setReturnReason={setReturnReason}
          onClose={() => setReturnModal(false)}
          onSubmit={submitReturn}
          loading={returningOrder}
        />
      )}
    </>
  )
}

// Extracted to avoid nesting modal inside <tr>
function ReturnModal({ orderId, returnReason, setReturnReason, onClose, onSubmit, loading }) {
  return (
    <tr>
      <td colSpan={4} style={{ padding: 0, border: 'none' }}>
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4'
          onClick={onClose}>
          <div className='w-full max-w-md rounded-2xl p-7 shadow-2xl' style={{ backgroundColor: 'var(--bg-primary)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className='text-xl font-semibold mb-2' style={{ color: 'var(--text-primary)' }}>
              Request <span className='text-purple-500'>Return</span>
            </h3>
            <p className='text-sm mb-5' style={{ color: 'var(--text-secondary)' }}>
              Order #{orderId.slice(-8).toUpperCase()} · Tell us why you'd like to return this order.
            </p>
            <form onSubmit={onSubmit}>
              <textarea
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                rows={4}
                placeholder='Describe the issue (e.g. wrong item received, damaged on arrival…)'
                className='w-full p-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none transition mb-4'
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                required
                minLength={10}
              />
              <div className='flex gap-3'>
                <button type='button' onClick={onClose}
                  className='flex-1 py-2.5 rounded-xl border text-sm font-medium transition'
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button type='submit' disabled={loading}
                  className='flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition disabled:opacity-60'>
                  {loading ? 'Submitting…' : 'Submit Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </td>
    </tr>
  )
}
