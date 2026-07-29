'use client'
import { useState } from 'react'
import { Send, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Newsletter() {
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const res  = await fetch('/api/newsletter', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setSubscribed(true)
      setEmail('')
      toast.success("You're subscribed! Welcome to IntelliMart 🎉")
    } catch (err) {
      // If already subscribed, still show success UX
      if (err.message?.toLowerCase().includes('already')) {
        setSubscribed(true)
        toast.success('You are already subscribed!')
      } else {
        toast.error(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex flex-col items-center mx-6 my-28 text-center'>
      <div className='inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-4'
        style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
        <Send size={12} /> Newsletter
      </div>
      <h2 className='text-2xl sm:text-3xl font-semibold' style={{ color: 'var(--text-primary)' }}>Stay in the Loop</h2>
      <p className='text-sm mt-2 max-w-md' style={{ color: 'var(--text-secondary)' }}>
        Subscribe for exclusive deals, new arrivals, and insider updates delivered to your inbox weekly.
      </p>

      {subscribed ? (
        <div className='flex items-center gap-3 mt-8 px-8 py-4 rounded-2xl border'
          style={{ backgroundColor: 'rgba(34,197,94,0.05)', borderColor: '#22c55e' }}>
          <CheckCircle size={20} className='text-green-500 shrink-0' />
          <p className='text-sm font-medium text-green-600'>You're subscribed! We'll be in touch soon.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className='flex mt-8 w-full max-w-md rounded-full border p-1.5 shadow-sm'
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }}>
          <input
            type='email'
            className='flex-1 pl-5 bg-transparent outline-none text-sm'
            style={{ color: 'var(--text-primary)' }}
            placeholder='Enter your email address'
            value={email}
            onChange={e => setEmail(e.target.value)}
            maxLength={100}
            required
          />
          <button type='submit' disabled={loading}
            className='flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-6 py-2.5 rounded-full active:scale-95 transition disabled:opacity-60'>
            <Send size={14} /> {loading ? 'Subscribing…' : 'Subscribe'}
          </button>
        </form>
      )}

      <p className='text-xs mt-3' style={{ color: 'var(--text-muted)' }}>No spam ever. Unsubscribe anytime.</p>
    </div>
  )
}
