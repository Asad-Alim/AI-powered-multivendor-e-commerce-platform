'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Loading from '@/components/Loading'
import AdminNavbar from './AdminNavbar'
import AdminSidebar from './AdminSidebar'
import { useAuth } from '@/context/AppContext'
import Link from 'next/link'
import { ArrowRight, ShieldAlert } from 'lucide-react'

export default function AdminLayout({ children }) {
  const { user, isAuthLoading } = useAuth()
  const router = useRouter()

  if (isAuthLoading) return <Loading />

  const isAdmin = user?.role === 'ADMIN'

  // For demo purposes — allow access when no user (dev mode)
  // Remove this in production: const isAdmin = user?.role === 'ADMIN'
  const devMode = !user && process.env.NODE_ENV === 'development'

  if (!isAdmin && !devMode) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center gap-5 text-center px-6'>
        <ShieldAlert size={56} className='text-red-400' />
        <h1 className='text-2xl sm:text-3xl font-semibold' style={{ color: 'var(--text-primary)' }}>Access Denied</h1>
        <p className='text-sm max-w-sm' style={{ color: 'var(--text-secondary)' }}>You need administrator privileges to access this area.</p>
        <Link href='/' className='flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-full text-sm hover:bg-slate-900 transition'>
          Go Home <ArrowRight size={15} />
        </Link>
      </div>
    )
  }

  return (
    <div className='flex flex-col h-screen' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <AdminNavbar />
      <div className='flex flex-1 overflow-hidden'>
        <AdminSidebar />
        <main className='flex-1 overflow-y-auto p-5 lg:p-10 no-scrollbar'>
          {children}
        </main>
      </div>
    </div>
  )
}
