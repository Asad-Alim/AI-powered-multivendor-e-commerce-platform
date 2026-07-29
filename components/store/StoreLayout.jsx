'use client'
import Loading from '@/components/Loading'
import Link from 'next/link'
import { ArrowRight, Store } from 'lucide-react'
import StoreNavbar from './StoreNavbar'
import StoreSidebar from './StoreSidebar'
import { useAuth } from '@/context/AppContext'
import { StoreProvider, useStore } from '@/context/StoreContext'
import { dummyStoreData } from '@/assets/assets'

function StoreLayoutInner({ children }) {
  const { user, isAuthLoading } = useAuth()
  const { stores, activeStore, loading } = useStore()

  if (loading || isAuthLoading) return <Loading />

  // Demo mode — not logged in, show dashboard with dummy data
  if (!user) {
    return (
      <div className='flex flex-col h-screen' style={{ backgroundColor: 'var(--bg-primary)' }}>
        <StoreNavbar />
        <div className='flex flex-1 overflow-hidden'>
          <StoreSidebar storeInfo={dummyStoreData} />
          <main className='flex-1 overflow-y-auto p-5 lg:p-10 no-scrollbar'>{children}</main>
        </div>
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center gap-5 text-center px-6'>
        <Store size={56} style={{ color: 'var(--text-muted)' }} />
        <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>No Store Found</h1>
        <p className='text-sm max-w-sm' style={{ color: 'var(--text-secondary)' }}>
          You don't have an active store. Create one and wait for admin approval.
        </p>
        <Link href='/create-store' className='flex items-center gap-2 px-6 py-2.5 bg-green-500 text-white rounded-full text-sm font-medium hover:bg-green-600 transition'>
          Create Store <ArrowRight size={15} />
        </Link>
      </div>
    )
  }

  return (
    <div className='flex flex-col h-screen' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <StoreNavbar />
      <div className='flex flex-1 overflow-hidden'>
        <StoreSidebar storeInfo={activeStore} />
        <main className='flex-1 overflow-y-auto p-5 lg:p-10 no-scrollbar'>
          {children}
        </main>
      </div>
    </div>
  )
}

export default function StoreLayout({ children }) {
  return (
    <StoreProvider>
      <StoreLayoutInner>{children}</StoreLayoutInner>
    </StoreProvider>
  )
}