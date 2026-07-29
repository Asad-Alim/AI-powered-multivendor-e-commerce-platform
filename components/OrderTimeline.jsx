'use client'
import { Check, Clock, Package, Truck, Home, XCircle, RefreshCw } from 'lucide-react'

const STEPS = [
  { key: 'PENDING',          label: 'Order Placed',      icon: Clock },
  { key: 'CONFIRMED',        label: 'Confirmed',         icon: Check },
  { key: 'PACKED',           label: 'Packed',            icon: Package },
  { key: 'SHIPPED',          label: 'Shipped',           icon: Truck },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery',  icon: Truck },
  { key: 'DELIVERED',        label: 'Delivered',         icon: Home },
]

const TERMINAL_CANCELLED = { key: 'CANCELLED', label: 'Cancelled', icon: XCircle }
const TERMINAL_RETURNED   = { key: 'RETURNED',  label: 'Returned',  icon: RefreshCw }

export default function OrderTimeline({ order }) {
  const status = order.status
  const history = order.statusHistory || []

  // Determine if cancelled/returned
  const isCancelled = ['CANCELLED', 'REFUNDED'].includes(status)
  const isReturned  = ['RETURNED', 'RETURN_REQUESTED'].includes(status)

  const steps = isCancelled
    ? [...STEPS.slice(0, 2), TERMINAL_CANCELLED]
    : isReturned
    ? [...STEPS, TERMINAL_RETURNED]
    : STEPS

  const currentIdx = steps.findIndex(s => s.key === status)
  const effectiveIdx = currentIdx === -1 ? 0 : currentIdx

  const getStepTime = (stepKey) => {
    const entry = history.find(h => h.status === stepKey)
    return entry ? new Date(entry.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null
  }

  return (
    <div className='my-4'>
      {/* Horizontal on large, vertical on small */}
      <div className='hidden sm:flex items-start justify-between relative'>
        {/* connector line */}
        <div className='absolute top-4 left-0 right-0 h-0.5 mx-8' style={{ backgroundColor: 'var(--border-color)' }} />
        <div className='absolute top-4 left-0 h-0.5 mx-8 bg-green-500 transition-all duration-700'
          style={{ width: `${effectiveIdx === 0 ? 0 : (effectiveIdx / (steps.length - 1)) * 100}%` }} />

        {steps.map((step, i) => {
          const done = i <= effectiveIdx
          const current = i === effectiveIdx
          const time = getStepTime(step.key)
          const isCancelStep = step.key === 'CANCELLED' || step.key === 'RETURNED'

          return (
            <div key={step.key} className='flex flex-col items-center gap-2 relative z-10' style={{ flex: 1 }}>
              <div className={`size-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                done
                  ? isCancelStep
                    ? 'bg-red-500 border-red-500'
                    : 'bg-green-500 border-green-500'
                  : ''
              }`}
              style={{
                backgroundColor: done ? (isCancelStep ? '#ef4444' : '#22c55e') : 'var(--bg-primary)',
                borderColor: done ? (isCancelStep ? '#ef4444' : '#22c55e') : 'var(--border-color)',
              }}>
                <step.icon size={14} color={done ? '#fff' : 'var(--text-muted)'} />
              </div>
              <p className='text-xs font-medium text-center' style={{ color: done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {step.label}
              </p>
              {time && <p className='text-[10px] text-center' style={{ color: 'var(--text-muted)' }}>{time}</p>}
            </div>
          )
        })}
      </div>

      {/* Mobile: vertical */}
      <div className='flex sm:hidden flex-col gap-0'>
        {steps.map((step, i) => {
          const done = i <= effectiveIdx
          const isCancelStep = step.key === 'CANCELLED' || step.key === 'RETURNED'
          const time = getStepTime(step.key)

          return (
            <div key={step.key} className='flex gap-3 relative'>
              <div className='flex flex-col items-center'>
                <div className='size-7 rounded-full flex items-center justify-center border-2 shrink-0 z-10'
                  style={{ backgroundColor: done ? (isCancelStep ? '#ef4444' : '#22c55e') : 'var(--bg-primary)', borderColor: done ? (isCancelStep ? '#ef4444' : '#22c55e') : 'var(--border-color)' }}>
                  <step.icon size={12} color={done ? '#fff' : 'var(--text-muted)'} />
                </div>
                {i < steps.length - 1 && (
                  <div className='w-0.5 flex-1 my-1 min-h-[20px]' style={{ backgroundColor: done ? '#22c55e' : 'var(--border-color)' }} />
                )}
              </div>
              <div className='pb-4'>
                <p className='text-xs font-medium' style={{ color: done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{step.label}</p>
                {time && <p className='text-[10px]' style={{ color: 'var(--text-muted)' }}>{time}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Tracking number & estimated delivery */}
      {(order.trackingNumber || order.estimatedDelivery) && (
        <div className='mt-4 flex flex-wrap gap-4 text-xs' style={{ color: 'var(--text-muted)' }}>
          {order.trackingNumber && (
            <span>
              Tracking: <span className='font-mono font-semibold' style={{ color: 'var(--text-primary)' }}>{order.trackingNumber}</span>
            </span>
          )}
          {order.estimatedDelivery && !['DELIVERED','CANCELLED','REFUNDED'].includes(status) && (
            <span>
              Est. Delivery: <span className='font-medium' style={{ color: 'var(--text-primary)' }}>
                {new Date(order.estimatedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </span>
          )}
          {order.deliveredAt && status === 'DELIVERED' && (
            <span className='text-green-500 font-medium'>
              ✓ Delivered on {new Date(order.deliveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
