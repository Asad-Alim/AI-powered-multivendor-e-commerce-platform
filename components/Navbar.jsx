'use client'
import { Search, ShoppingCart, Sun, Moon, Heart, User, LogOut, ChevronDown, Bell, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useCart, useWishlist, useAuth } from '@/context/AppContext'
import { useTheme } from '@/context/ThemeContext'
import SearchBar from '@/components/SearchBar'
import toast from 'react-hot-toast'

export default function Navbar() {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen]   = useState(false)
  const [authModal, setAuthModal]         = useState(null)
  const [searchOpen, setSearchOpen]       = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)

  const { cartTotal }        = useCart()
  const { wishlist }         = useWishlist()
  const { user, logout }     = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      if (!user) return
      try {
        const res  = await fetch('/api/notifications?limit=1', { credentials: 'same-origin' })
        const data = await res.json()
        if (data.success) setUnreadNotifs(data.data.unreadCount)
      } catch { /* ignore */ }
    }
    fetchUnread()
  }, [user])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close search on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSearchOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    setDropdownOpen(false)
    toast.success('Logged out successfully')
    router.push('/')
  }

  return (
    <>
      <nav className='relative transition-colors duration-300' style={{ backgroundColor: 'var(--nav-bg)', borderBottom: '1px solid var(--border-color)' }}>
        <div className='mx-6'>
          <div className='flex items-center justify-between max-w-7xl mx-auto py-4'>

            <Link href='/' className='relative text-4xl font-semibold flex-shrink-0' style={{ color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--accent)' }}>intelli</span>mart
              <span style={{ color: 'var(--accent)', fontSize: '3rem', lineHeight: 0 }}>.</span>
              <span className='absolute text-[10px] font-bold -top-1 -right-8 px-2 py-0.5 rounded-full text-white bg-green-500'>AI</span>
            </Link>

            {/* Desktop */}
            <div className='hidden sm:flex items-center gap-5 lg:gap-7'>
              {[['/', 'Home'], ['/shop', 'Shop'], ['/pricing', 'Pricing'], ['/create-store', 'Sell']].map(([href, label]) => (
                <Link key={href} href={href} className='text-sm font-medium hover:text-green-500 transition-colors' style={{ color: 'var(--text-secondary)' }}>{label}</Link>
              ))}

              {/* Search button — opens the SearchBar dropdown */}
              <button
                onClick={() => setSearchOpen(o => !o)}
                className='hidden xl:flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition hover:ring-2 hover:ring-green-400'
                style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)' }}
              >
                <Search size={16} /> Search…
              </button>

              <Link href='/wishlist' className='relative hover:text-green-500 transition-colors' style={{ color: 'var(--text-secondary)' }}>
                <Heart size={20} />
                {wishlist.length > 0 && <span className='absolute -top-2 -right-2 text-[9px] text-white bg-red-500 min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5'>{wishlist.length}</span>}
              </Link>

              {user && (
                <Link href='/notifications' className='relative hover:text-green-500 transition-colors' style={{ color: 'var(--text-secondary)' }}>
                  <Bell size={20} />
                  {unreadNotifs > 0 && <span className='absolute -top-2 -right-2 text-[9px] text-white bg-indigo-500 min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5'>{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>}
                </Link>
              )}

              <Link href='/cart' className='relative flex items-center gap-1.5 hover:text-green-500 transition-colors' style={{ color: 'var(--text-secondary)' }}>
                <ShoppingCart size={20} />
                <span className='text-sm'>Cart</span>
                {cartTotal > 0 && <span className='absolute -top-2 left-2.5 text-[9px] text-white bg-slate-600 min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5'>{cartTotal}</span>}
              </Link>

              <button onClick={toggleTheme} className='p-2 rounded-full transition-all hover:scale-110' style={{ backgroundColor: 'var(--input-bg)' }} aria-label='Toggle theme'>
                {isDark ? <Sun size={17} className='text-yellow-400' /> : <Moon size={17} className='text-slate-500' />}
              </button>

              {user ? (
                <div className='relative' ref={dropdownRef}>
                  <button onClick={() => setDropdownOpen(o => !o)} className='flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition'>
                    <User size={14} />
                    {user.name.split(' ')[0]}
                    <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {dropdownOpen && (
                    <div className='absolute right-0 mt-2 w-48 rounded-xl shadow-lg border py-1 z-50' style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                      <p className='px-4 py-2 text-xs font-medium' style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                      <hr style={{ borderColor: 'var(--border-color)' }} />
                      <Link href='/profile' onClick={() => setDropdownOpen(false)} className='flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-100 transition' style={{ color: 'var(--text-secondary)' }}>My Profile</Link>
                      <Link href='/orders' onClick={() => setDropdownOpen(false)} className='flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-100 transition' style={{ color: 'var(--text-secondary)' }}>My Orders</Link>
                      <Link href='/notifications' onClick={() => setDropdownOpen(false)} className='flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-100 transition' style={{ color: 'var(--text-secondary)' }}>
                        Notifications
                        {unreadNotifs > 0 && <span className='ml-auto text-[10px] text-white bg-indigo-500 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1'>{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>}
                      </Link>
                      <Link href='/wishlist' onClick={() => setDropdownOpen(false)} className='flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-100 transition' style={{ color: 'var(--text-secondary)' }}>Wishlist</Link>
                      {(user.role === 'VENDOR' || user.role === 'ADMIN') && (
                        <Link href={user.role === 'ADMIN' ? '/admin' : '/store'} onClick={() => setDropdownOpen(false)} className='flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-100 transition' style={{ color: 'var(--text-secondary)' }}>Dashboard</Link>
                      )}
                      <hr style={{ borderColor: 'var(--border-color)' }} />
                      <button onClick={handleLogout} className='flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition'>
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setAuthModal('login')} className='px-6 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white text-sm font-medium rounded-full'>
                  Login
                </button>
              )}
            </div>

            {/* Mobile */}
            <div className='sm:hidden flex items-center gap-2'>
              <button onClick={toggleTheme} className='p-1.5 rounded-full' style={{ backgroundColor: 'var(--input-bg)' }}>
                {isDark ? <Sun size={16} className='text-yellow-400' /> : <Moon size={16} className='text-slate-500' />}
              </button>
              <button onClick={() => setSearchOpen(o => !o)} className='p-1.5 rounded-full' style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)' }}>
                <Search size={18} />
              </button>
              <Link href='/cart' className='relative p-1.5'>
                <ShoppingCart size={20} style={{ color: 'var(--text-primary)' }} />
                {cartTotal > 0 && <span className='absolute top-0 right-0 text-[8px] text-white bg-slate-600 size-4 rounded-full flex items-center justify-center'>{cartTotal}</span>}
              </Link>
              {user ? (
                <button onClick={() => setMobileMenuOpen(o => !o)}
                  className='flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-indigo-500'>
                  <User size={13} />
                  {user.name.split(' ')[0]}
                </button>
              ) : (
                <button onClick={() => setAuthModal('login')} className='px-4 py-1.5 bg-indigo-500 text-sm text-white rounded-full'>Login</button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded search bar */}
        {searchOpen && (
          <div className='border-t px-6 py-4 flex items-center gap-4' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--nav-bg)' }}>
            <SearchBar onClose={() => setSearchOpen(false)} />
            <button onClick={() => setSearchOpen(false)} className='flex-shrink-0 p-2 rounded-full hover:opacity-70 transition' style={{ color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>
        )}

        {/* Mobile full menu */}
        {mobileMenuOpen && user && (
          <div className='sm:hidden border-t' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
            {/* User info */}
            <div className='px-5 py-4 border-b flex items-center gap-3' style={{ borderColor: 'var(--border-color)' }}>
              <div className='size-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0'>
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{user.email}</p>
              </div>
            </div>

            {/* Nav links */}
            <nav className='py-2'>
              {[
                { href: '/profile',       label: 'My Profile',      icon: User },
                { href: '/orders',        label: 'My Orders',       icon: ShoppingCart },
                { href: '/notifications', label: 'Notifications',   icon: Bell,  badge: unreadNotifs },
                { href: '/wishlist',      label: 'Wishlist',        icon: Heart, badge: wishlist.length },
                { href: '/shop',          label: 'Shop',            icon: Search },
                { href: '/pricing',       label: 'Pricing',         icon: null },
                { href: '/create-store',  label: 'Sell on IntelliMart', icon: null },
              ].map(({ href, label, icon: Icon, badge }) => (
                <Link key={href} href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className='flex items-center justify-between px-5 py-3 text-sm transition active:opacity-70'
                  style={{ color: 'var(--text-secondary)' }}>
                  <span className='flex items-center gap-3'>
                    {Icon && <Icon size={16} style={{ color: 'var(--text-muted)' }} />}
                    {!Icon && <span className='size-4' />}
                    {label}
                  </span>
                  {badge > 0 && (
                    <span className='text-[10px] text-white bg-indigo-500 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1'>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </Link>
              ))}

              {(user.role === 'VENDOR' || user.role === 'ADMIN') && (
                <Link href={user.role === 'ADMIN' ? '/admin' : '/store'}
                  onClick={() => setMobileMenuOpen(false)}
                  className='flex items-center gap-3 px-5 py-3 text-sm text-indigo-500'
                  style={{}}>
                  <span className='size-4' />
                  Dashboard
                </Link>
              )}
            </nav>

            {/* Logout */}
            <div className='border-t px-5 py-3' style={{ borderColor: 'var(--border-color)' }}>
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false) }}
                className='flex items-center gap-3 w-full text-sm text-red-500 py-2'>
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>

      {authModal && <AuthModal mode={authModal} setMode={setAuthModal} />}
    </>
  )
}

function AuthModal({ mode, setMode }) {
  const { login, register } = useAuth()
  const [form, setForm]     = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        toast.success('Welcome back!')
      } else {
        await register(form.name, form.email, form.password)
        toast.success('Account created! Welcome to IntelliMart 🎉')
      }
      setMode(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setForgotSent(true)
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const inp   = 'w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-green-400 transition'
  const inpSt = { backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4' onClick={() => setMode(null)}>
      <div className='w-full max-w-md rounded-2xl p-8 shadow-2xl' style={{ backgroundColor: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>

        {forgotMode ? (
          forgotSent ? (
            <div className='text-center'>
              <p className='text-2xl mb-2'>📧</p>
              <h2 className='text-xl font-semibold mb-2' style={{ color: 'var(--text-primary)' }}>Check your email</h2>
              <p className='text-sm' style={{ color: 'var(--text-secondary)' }}>Reset link sent to <strong>{forgotEmail}</strong></p>
              <button onClick={() => { setForgotMode(false); setForgotSent(false) }} className='mt-4 text-green-500 text-sm hover:underline'>Back to login</button>
            </div>
          ) : (
            <>
              <h2 className='text-2xl font-semibold mb-1' style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
              <p className='text-sm mb-5' style={{ color: 'var(--text-secondary)' }}>Enter your email to receive a reset link</p>
              <form onSubmit={handleForgot} className='flex flex-col gap-4'>
                <input type='email' className={inp} style={inpSt} placeholder='Your email' value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                <button type='submit' disabled={loading} className='w-full py-3 bg-slate-800 text-white font-medium rounded-xl transition disabled:opacity-60'>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <button onClick={() => setForgotMode(false)} className='mt-3 w-full text-center text-sm text-green-500 hover:underline'>Back to login</button>
            </>
          )
        ) : (
          <>
            <h2 className='text-2xl font-semibold mb-1' style={{ color: 'var(--text-primary)' }}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className='text-sm mb-6' style={{ color: 'var(--text-secondary)' }}>
              {mode === 'login' ? 'Sign in to your IntelliMart account' : 'Join IntelliMart today'}
            </p>
            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
              {mode === 'register' && (
                <input className={inp} style={inpSt} placeholder='Full name' value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required maxLength={80} />
              )}
              <input type='email' className={inp} style={inpSt} placeholder='Email address' value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required maxLength={100} />
              <input type='password' className={inp} style={inpSt} placeholder='Password' value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} maxLength={128} />
              <button type='submit' disabled={loading} className='w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition disabled:opacity-60'>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
            {mode === 'login' && (
              <button onClick={() => setForgotMode(true)} className='mt-2 w-full text-center text-xs text-green-500 hover:underline'>
                Forgot your password?
              </button>
            )}
            <p className='text-center text-sm mt-4' style={{ color: 'var(--text-secondary)' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className='text-green-500 font-medium hover:underline'>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
