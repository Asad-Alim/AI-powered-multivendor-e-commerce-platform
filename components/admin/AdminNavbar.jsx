'use client'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AppContext'
import { Sun, Moon, LogOut } from 'lucide-react'

export default function AdminNavbar() {
  const { isDark, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  return (
    <div className='flex items-center justify-between px-8 py-3 border-b transition-colors'
      style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border-color)' }}>
      <Link href='/' className='relative text-3xl font-semibold' style={{ color: 'var(--text-primary)' }}>
        <span style={{ color: 'var(--accent)' }}>intelli</span>mart
        <span style={{ color: 'var(--accent)', fontSize: '2.5rem', lineHeight: 0 }}>.</span>
        <span className='absolute text-[10px] font-bold -top-1 -right-12 px-2 py-0.5 rounded-full text-white bg-indigo-500'>Admin</span>
      </Link>
      <div className='flex items-center gap-4'>
        <span className='text-sm' style={{ color: 'var(--text-secondary)' }}>
          Hi, <span className='font-medium' style={{ color: 'var(--text-primary)' }}>{user?.name || 'Asad'}</span>
        </span>
        <button onClick={toggleTheme} className='p-2 rounded-full transition' style={{ backgroundColor: 'var(--bg-card)' }}>
          {isDark ? <Sun size={16} className='text-yellow-400' /> : <Moon size={16} className='text-slate-500' />}
        </button>
        <button onClick={logout} className='flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm text-red-500 border border-red-200 hover:bg-red-50 transition'>
          <LogOut size={13} /> Logout
        </button>
      </div>
    </div>
  )
}
