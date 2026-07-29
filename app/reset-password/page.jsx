'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { KeyRound, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

function ResetContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [email, setEmail]       = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  // Password strength
  const checks = [
    { label: 'At least 8 characters',   ok: password.length >= 8 },
    { label: 'One uppercase letter',     ok: /[A-Z]/.test(password) },
    { label: 'One number',               ok: /[0-9]/.test(password) },
    { label: 'Passwords match',          ok: password === confirm && confirm.length > 0 },
  ]
  const allOk = checks.every(c => c.ok)

  const handleReset = async (e) => {
    e.preventDefault()
    if (!allOk) { toast.error('Please meet all password requirements'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setDone(true)
      setTimeout(() => router.push('/'), 3000)
    } catch (err) {
      toast.error(err.message || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setForgotSent(true)
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-green-400 transition'
  const inpSt = { backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }

  return (
    <div className='min-h-screen flex items-center justify-center px-4' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className='w-full max-w-md'>
        {/* Logo */}
        <div className='text-center mb-8'>
          <Link href='/' className='text-3xl font-semibold' style={{ color: 'var(--text-primary)' }}>
            <span className='text-green-500'>intelli</span>mart.
          </Link>
        </div>

        <div className='rounded-2xl border p-8 shadow-lg' style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>

          {/* Done state */}
          {done ? (
            <div className='text-center'>
              <CheckCircle size={48} className='text-green-500 mx-auto mb-4' />
              <h2 className='text-xl font-semibold mb-2' style={{ color: 'var(--text-primary)' }}>Password Reset!</h2>
              <p className='text-sm' style={{ color: 'var(--text-secondary)' }}>Redirecting you to the homepage…</p>
            </div>
          ) : token ? (
            /* Reset form — has token from email link */
            <>
              <div className='flex items-center gap-3 mb-6'>
                <div className='p-2.5 rounded-xl bg-green-100'>
                  <KeyRound size={18} className='text-green-600' />
                </div>
                <div>
                  <h2 className='text-xl font-semibold' style={{ color: 'var(--text-primary)' }}>Set New Password</h2>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>Choose a strong, unique password</p>
                </div>
              </div>

              <form onSubmit={handleReset} className='flex flex-col gap-4'>
                <div className='relative'>
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder='New password' className={inp} style={inpSt} required />
                  <button type='button' onClick={() => setShowPw(s => !s)}
                    className='absolute right-3 top-1/2 -translate-y-1/2' style={{ color: 'var(--text-muted)' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <input type='password' value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder='Confirm new password' className={inp} style={inpSt} required />

                {/* Strength checklist */}
                {password && (
                  <div className='grid grid-cols-2 gap-1.5'>
                    {checks.map((c, i) => (
                      <div key={i} className='flex items-center gap-1.5 text-xs'>
                        <div className={`size-4 rounded-full flex items-center justify-center shrink-0 ${c.ok ? 'bg-green-500' : 'bg-slate-200'}`}>
                          {c.ok && <CheckCircle size={10} className='text-white' />}
                        </div>
                        <span style={{ color: c.ok ? '#22c55e' : 'var(--text-muted)' }}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button type='submit' disabled={loading || !allOk}
                  className='py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition active:scale-95 disabled:opacity-60'>
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            </>
          ) : forgotSent ? (
            /* Email sent confirmation */
            <div className='text-center'>
              <CheckCircle size={48} className='text-green-500 mx-auto mb-4' />
              <h2 className='text-xl font-semibold mb-2' style={{ color: 'var(--text-primary)' }}>Check Your Email</h2>
              <p className='text-sm mb-4' style={{ color: 'var(--text-secondary)' }}>
                We've sent a password reset link to <strong>{email}</strong>. The link expires in 1 hour.
              </p>
              <button onClick={() => setForgotSent(false)} className='text-green-500 text-sm hover:underline'>
                Try a different email
              </button>
            </div>
          ) : (
            /* Forgot password form — no token */
            <>
              <div className='flex items-center gap-3 mb-6'>
                <div className='p-2.5 rounded-xl bg-amber-100'>
                  <AlertCircle size={18} className='text-amber-600' />
                </div>
                <div>
                  <h2 className='text-xl font-semibold' style={{ color: 'var(--text-primary)' }}>Forgot Password?</h2>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>We'll send you a reset link</p>
                </div>
              </div>

              <form onSubmit={handleForgot} className='flex flex-col gap-4'>
                <input type='email' value={email} onChange={e => setEmail(e.target.value)}
                  placeholder='Your account email' className={inp} style={inpSt} required />
                <button type='submit' disabled={loading}
                  className='py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition active:scale-95 disabled:opacity-60'>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          {!done && (
            <p className='text-center text-sm mt-5' style={{ color: 'var(--text-muted)' }}>
              Remember your password?{' '}
              <Link href='/' className='text-green-500 hover:underline font-medium'>Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className='min-h-screen flex items-center justify-center'><div className='animate-spin size-8 rounded-full border-4 border-green-500 border-t-transparent' /></div>}>
      <ResetContent />
    </Suspense>
  )
}
