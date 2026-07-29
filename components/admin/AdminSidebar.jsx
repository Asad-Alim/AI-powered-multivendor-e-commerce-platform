'use client'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Store, ShieldCheck, TicketPercent, BarChart3, Users } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/AppContext'

const links = [
  { name: 'Dashboard',     href: '/admin',          icon: LayoutDashboard },
  { name: 'Stores',        href: '/admin/stores',   icon: Store },
  { name: 'Approve Stores',href: '/admin/approve',  icon: ShieldCheck },
  { name: 'Users',         href: '/admin/users',    icon: Users },
  { name: 'Coupons',       href: '/admin/coupons',  icon: TicketPercent },
  { name: 'Analytics',     href: '/admin/analytics',icon: BarChart3 },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <div className='inline-flex h-full flex-col border-r sm:min-w-56 transition-colors'
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>

      {/* Avatar */}
      <div className='hidden sm:flex flex-col items-center gap-2 pt-8 pb-4 px-4'>
        <div className='size-14 rounded-full bg-gradient-to-br from-indigo-500 to-green-500 flex items-center justify-center text-white text-xl font-bold shadow'>
          {(user?.name || 'A')[0].toUpperCase()}
        </div>
        <p className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>{user?.name || 'Admin'}</p>
        <span className='text-xs px-3 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium'>Administrator</span>
      </div>

      <hr style={{ borderColor: 'var(--border-color)' }} className='hidden sm:block mx-4' />

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
