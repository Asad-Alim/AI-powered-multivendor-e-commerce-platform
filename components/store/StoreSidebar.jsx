'use client'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PackagePlus, PackageSearch, ClipboardList, TrendingUp, ChevronDown, Check, Settings } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useStore } from '@/context/StoreContext'

const links = [
  { name: 'Dashboard',       href: '/store',                icon: LayoutDashboard },
  { name: 'Add Product',     href: '/store/add-product',    icon: PackagePlus },
  { name: 'Manage Products', href: '/store/manage-product', icon: PackageSearch },
  { name: 'Orders',          href: '/store/orders',         icon: ClipboardList },
  { name: 'Analytics',       href: '/store/analytics',      icon: TrendingUp },
  { name: 'Settings',        href: '/store/settings',       icon: Settings },
]


export default function StoreSidebar({ storeInfo }) {
  const pathname = usePathname()
  const { stores, activeStoreId, setActiveStoreId } = useStore()
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div className='inline-flex h-full flex-col border-r sm:min-w-56 transition-colors'
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>

      {storeInfo && (
        <div className='hidden sm:flex flex-col items-center gap-2 pt-8 pb-4 px-4 relative'>
          <Image className='size-14 rounded-xl object-cover shadow' src={storeInfo.logo} alt={storeInfo.name} width={56} height={56} />
          <p className='text-sm font-semibold text-center' style={{ color: 'var(--text-primary)' }}>{storeInfo.name}</p>
          <span className='text-xs px-3 py-0.5 rounded-full bg-green-100 text-green-700 font-medium'>Active Store</span>

          {stores.length > 1 && (
            <div className='relative w-full mt-1'>
              <button
                onClick={() => setSwitcherOpen(o => !o)}
                className='w-full flex items-center justify-between gap-1 px-3 py-1.5 rounded-lg text-xs border transition'
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                Switch store <ChevronDown size={13} />
              </button>
              {switcherOpen && (
                <div className='absolute z-20 top-full mt-1 left-0 right-0 rounded-lg border shadow-lg overflow-hidden'
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                  {stores.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setActiveStoreId(s.id); setSwitcherOpen(false) }}
                      className='w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-black/5 transition'
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {s.id === activeStoreId ? <Check size={12} className='text-green-500 shrink-0' /> : <span className='w-3 shrink-0' />}
                      <span className='truncate'>{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <hr className='hidden sm:block mx-4' style={{ borderColor: 'var(--border-color)' }} />

      <nav className='mt-4'>
        {links.map(link => {
          const active = pathname === link.href
          return (
            <Link key={link.href} href={link.href}
              className='relative flex items-center gap-3 px-4 py-3 text-sm transition-colors'
              style={{
                color: active ? '#22c55e' : 'var(--text-secondary)',
                backgroundColor: active ? 'rgba(34,197,94,0.08)' : 'transparent',
                fontWeight: active ? 600 : 400,
              }}>
              <link.icon size={17} className='sm:ml-3' />
              <span className='hidden sm:block'>{link.name}</span>
              {active && <span className='absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-green-500' />}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
