'use client'
import Image from 'next/image'
import { MapPin, Mail, Phone, Calendar, User } from 'lucide-react'

export default function StoreInfo({ store }) {
  const statusColors = {
    PENDING:  { bg: 'rgba(245,158,11,0.1)',  text: '#f59e0b' },
    APPROVED: { bg: 'rgba(34,197,94,0.1)',   text: '#22c55e' },
    REJECTED: { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444' },
    SUSPENDED:{ bg: 'rgba(100,116,139,0.1)', text: '#64748b' },
  }
  const sc = statusColors[store.status?.toUpperCase()] || statusColors.PENDING

  return (
    <div className='flex-1 space-y-3'>
      <div className='flex items-center gap-4'>
        <Image width={64} height={64} src={store.logo} alt={store.name}
          className='size-16 rounded-xl object-cover shadow border' style={{ borderColor: 'var(--border-color)' }} />
        <div>
          <div className='flex items-center gap-2 flex-wrap'>
            <h3 className='text-lg font-semibold' style={{ color: 'var(--text-primary)' }}>{store.name}</h3>
            <span className='text-xs' style={{ color: 'var(--text-muted)' }}>@{store.username}</span>
            <span className='text-xs font-semibold px-3 py-0.5 rounded-full' style={{ backgroundColor: sc.bg, color: sc.text }}>
              {store.status}
            </span>
          </div>
          <p className='text-xs mt-1 max-w-md' style={{ color: 'var(--text-secondary)' }}>{store.description}</p>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm' style={{ color: 'var(--text-secondary)' }}>
        <p className='flex items-center gap-2'><MapPin size={13} className='shrink-0' /> {store.address}</p>
        <p className='flex items-center gap-2'><Phone size={13} className='shrink-0' /> {store.contact}</p>
        <p className='flex items-center gap-2'><Mail size={13} className='shrink-0' /> {store.email}</p>
        <p className='flex items-center gap-2'><Calendar size={13} className='shrink-0' /> Applied {new Date(store.createdAt).toLocaleDateString()}</p>
      </div>

      {store.user && (
        <div className='flex items-center gap-2 pt-1'>
          <User size={13} style={{ color: 'var(--text-muted)' }} />
          {/* FIX: guard against empty string src which crashes Next.js Image */}
          {store.user.image ? (
            <Image width={24} height={24} src={store.user.image} alt={store.user.name} className='size-6 rounded-full object-cover' />
          ) : (
            <div className='size-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0'>
              {store.user.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <span className='text-xs' style={{ color: 'var(--text-secondary)' }}>{store.user.name} · {store.user.email}</span>
        </div>
      )}
    </div>
  )
}
