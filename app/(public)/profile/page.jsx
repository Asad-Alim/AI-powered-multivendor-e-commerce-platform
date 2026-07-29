'use client'
import { useState, useEffect } from 'react'
import { useAuth, useAddresses } from '@/context/AppContext'
import PageTitle from '@/components/PageTitle'
import Loading from '@/components/Loading'
import { User, Lock, MapPin, Trash2, Plus, Check, Edit2, X, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

const inp = 'w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-green-400 transition'
const inpSt = { backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }

export default function ProfilePage() {
  const { user, authFetch, logout } = useAuth()
  const { addresses, setAddresses, addAddress, deleteAddress } = useAddresses()
  const [tab, setTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [addrLoading, setAddrLoading] = useState(false)
  const [showAddrForm, setShowAddrForm] = useState(false)
  const [editAddr, setEditAddr] = useState(null) // address being edited

  // Profile form
  const [profile, setProfile] = useState({ name: '', email: '' })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwStrength, setPwStrength] = useState(0)

  // Address form
  const EMPTY_ADDR = { name: '', email: '', street: '', city: '', state: '', zip: '', country: '', phone: '' }
  const [addrForm, setAddrForm] = useState(EMPTY_ADDR)

  useEffect(() => {
    if (user) setProfile({ name: user.name || '', email: user.email || '' })
  }, [user])

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return
      try {
        const res = await authFetch('/api/address')
        const data = await res.json()
        if (data.success) setAddresses(data.data.addresses)
      } catch { /* keep dummy */ }
    }
    fetchAddresses()
  }, [user])

  const calcStrength = (pw) => {
    let s = 0
    if (pw.length >= 8) s++
    if (/[A-Z]/.test(pw)) s++
    if (/[0-9]/.test(pw)) s++
    if (/[^A-Za-z0-9]/.test(pw)) s++
    return s
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name: profile.name, email: profile.email }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      // Update localStorage user object
      const stored = JSON.parse(localStorage.getItem('im_user') || '{}')
      localStorage.setItem('im_user', JSON.stringify({ ...stored, ...data.data.user }))
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (passwords.newPassword !== passwords.confirm) return toast.error('Passwords do not match')
    if (passwords.newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' })
      setPwStrength(0)
      toast.success('Password changed successfully!')
    } catch (err) {
      toast.error(err.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleAddrSubmit = async (e) => {
    e.preventDefault()
    setAddrLoading(true)
    try {
      if (editAddr) {
        const res = await authFetch(`/api/address/${editAddr.id}`, { method: 'PUT', body: JSON.stringify(addrForm) })
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        setAddresses(addresses.map(a => a.id === editAddr.id ? data.data.address : a))
        toast.success('Address updated!')
      } else {
        const res = await authFetch('/api/address', { method: 'POST', body: JSON.stringify(addrForm) })
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        addAddress(data.data.address)
        toast.success('Address added!')
      }
      setAddrForm(EMPTY_ADDR)
      setShowAddrForm(false)
      setEditAddr(null)
    } catch (err) {
      toast.error(err.message || 'Failed to save address')
    } finally {
      setAddrLoading(false)
    }
  }

  const handleAddrDelete = async (id) => {
    try {
      const res = await authFetch(`/api/address/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      deleteAddress(id)
      toast.success('Address removed')
    } catch (err) {
      toast.error(err.message || 'Failed to delete address')
    }
  }

  const startEditAddr = (addr) => {
    setEditAddr(addr)
    setAddrForm({ name: addr.name, email: addr.email, street: addr.street, city: addr.city, state: addr.state, zip: addr.zip, country: addr.country, phone: addr.phone })
    setShowAddrForm(true)
  }

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']

  if (!user) {
    return (
      <div className='min-h-[70vh] flex flex-col items-center justify-center gap-4 mx-6'>
        <ShieldCheck size={60} className='opacity-20' style={{ color: 'var(--text-muted)' }} />
        <h2 className='text-xl font-semibold' style={{ color: 'var(--text-primary)' }}>Sign in to view your profile</h2>
        <Link href='/' className='px-6 py-2.5 bg-indigo-500 text-white rounded-full text-sm font-medium hover:bg-indigo-600 transition'>Go Home</Link>
      </div>
    )
  }

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'security', label: 'Security', icon: Lock },
    { key: 'addresses', label: 'Addresses', icon: MapPin },
  ]

  return (
    <div className='min-h-[70vh] mx-6 my-12'>
      <div className='max-w-4xl mx-auto'>
        <PageTitle heading='My Account' text='Manage your profile, security & addresses' path='/' linkText='Go to home' />

        {/* Avatar + name summary */}
        <div className='flex items-center gap-4 mb-8 p-5 rounded-2xl border' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <div className='size-16 rounded-full bg-indigo-500 flex items-center justify-center text-white text-2xl font-semibold flex-shrink-0'>
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className='text-lg font-semibold' style={{ color: 'var(--text-primary)' }}>{user.name}</h2>
            <p className='text-sm' style={{ color: 'var(--text-muted)' }}>{user.email}</p>
            <span className='text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block'
              style={{ backgroundColor: user.role === 'ADMIN' ? 'rgba(239,68,68,0.1)' : user.role === 'VENDOR' ? 'rgba(99,102,241,0.1)' : 'rgba(34,197,94,0.1)', color: user.role === 'ADMIN' ? '#ef4444' : user.role === 'VENDOR' ? '#6366f1' : '#22c55e' }}>
              {user.role}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className='flex gap-1 p-1 rounded-xl mb-8 w-fit' style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className='flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition'
              style={tab === key
                ? { backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
                : { color: 'var(--text-muted)' }}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div className='rounded-2xl border p-7' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <h3 className='text-lg font-semibold mb-5' style={{ color: 'var(--text-primary)' }}>Personal Information</h3>
            <form onSubmit={handleProfileSave} className='flex flex-col gap-4 max-w-md'>
              <div>
                <label className='text-xs font-medium mb-1.5 block' style={{ color: 'var(--text-muted)' }}>Full Name</label>
                <input className={inp} style={inpSt} value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} required minLength={2} />
              </div>
              <div>
                <label className='text-xs font-medium mb-1.5 block' style={{ color: 'var(--text-muted)' }}>Email Address</label>
                <input type='email' className={inp} style={inpSt} value={profile.email}
                  onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <button type='submit' disabled={loading}
                className='flex items-center gap-2 w-fit px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition disabled:opacity-60'>
                {loading ? 'Saving…' : <><Check size={15} /> Save Changes</>}
              </button>
            </form>
          </div>
        )}

        {/* ── SECURITY TAB ── */}
        {tab === 'security' && (
          <div className='rounded-2xl border p-7' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <h3 className='text-lg font-semibold mb-5' style={{ color: 'var(--text-primary)' }}>Change Password</h3>
            <form onSubmit={handlePasswordSave} className='flex flex-col gap-4 max-w-md'>
              <div>
                <label className='text-xs font-medium mb-1.5 block' style={{ color: 'var(--text-muted)' }}>Current Password</label>
                <input type='password' className={inp} style={inpSt} value={passwords.currentPassword}
                  onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))} required placeholder='••••••••' />
              </div>
              <div>
                <label className='text-xs font-medium mb-1.5 block' style={{ color: 'var(--text-muted)' }}>New Password</label>
                <input type='password' className={inp} style={inpSt} value={passwords.newPassword}
                  onChange={e => { setPasswords(p => ({ ...p, newPassword: e.target.value })); setPwStrength(calcStrength(e.target.value)) }}
                  required minLength={8} placeholder='Min. 8 characters' />
                {passwords.newPassword && (
                  <div className='mt-2'>
                    <div className='flex gap-1 mb-1'>
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= pwStrength ? strengthColor[pwStrength] : 'bg-slate-200'}`} />
                      ))}
                    </div>
                    <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{strengthLabel[pwStrength]}</p>
                  </div>
                )}
              </div>
              <div>
                <label className='text-xs font-medium mb-1.5 block' style={{ color: 'var(--text-muted)' }}>Confirm New Password</label>
                <input type='password' className={inp} style={inpSt} value={passwords.confirm}
                  onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} required placeholder='Re-enter new password' />
                {passwords.confirm && passwords.confirm !== passwords.newPassword && (
                  <p className='text-xs text-red-500 mt-1'>Passwords do not match</p>
                )}
              </div>
              <button type='submit' disabled={loading || (passwords.confirm && passwords.confirm !== passwords.newPassword)}
                className='flex items-center gap-2 w-fit px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition disabled:opacity-60'>
                {loading ? 'Updating…' : <><Lock size={15} /> Update Password</>}
              </button>
            </form>
          </div>
        )}

        {/* ── ADDRESSES TAB ── */}
        {tab === 'addresses' && (
          <div className='rounded-2xl border p-7' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className='flex items-center justify-between mb-5'>
              <h3 className='text-lg font-semibold' style={{ color: 'var(--text-primary)' }}>Saved Addresses</h3>
              <button onClick={() => { setShowAddrForm(true); setEditAddr(null); setAddrForm(EMPTY_ADDR) }}
                className='flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition'>
                <Plus size={15} /> Add Address
              </button>
            </div>

            {/* Address form (inline) */}
            {showAddrForm && (
              <div className='mb-6 p-5 rounded-xl border' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                <div className='flex items-center justify-between mb-4'>
                  <h4 className='font-medium text-sm' style={{ color: 'var(--text-primary)' }}>{editAddr ? 'Edit Address' : 'New Address'}</h4>
                  <button onClick={() => { setShowAddrForm(false); setEditAddr(null) }} style={{ color: 'var(--text-muted)' }}>
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={handleAddrSubmit} className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {['name','email','street','city','state','zip','country','phone'].map(field => (
                    <input key={field} name={field} className={`${inp} ${field === 'street' ? 'sm:col-span-2' : ''}`} style={inpSt}
                      value={addrForm[field]} onChange={e => setAddrForm(f => ({ ...f, [field]: e.target.value }))}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      type={field === 'email' ? 'email' : 'text'} required />
                  ))}
                  <div className='sm:col-span-2 flex gap-3 mt-1'>
                    <button type='submit' disabled={addrLoading}
                      className='px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition disabled:opacity-60'>
                      {addrLoading ? 'Saving…' : editAddr ? 'Update Address' : 'Save Address'}
                    </button>
                    <button type='button' onClick={() => { setShowAddrForm(false); setEditAddr(null) }}
                      className='px-6 py-2.5 text-sm font-medium rounded-xl border transition' style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Address list */}
            {addresses.length === 0 ? (
              <div className='text-center py-10'>
                <MapPin size={40} className='mx-auto mb-3 opacity-20' style={{ color: 'var(--text-muted)' }} />
                <p className='text-sm' style={{ color: 'var(--text-muted)' }}>No saved addresses yet.</p>
              </div>
            ) : (
              <div className='flex flex-col gap-3'>
                {addresses.map(addr => (
                  <div key={addr.id} className='flex items-start justify-between gap-4 p-4 rounded-xl border' style={{ borderColor: 'var(--border-color)' }}>
                    <div>
                      <p className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>{addr.name}</p>
                      <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>{addr.street}, {addr.city}, {addr.state} {addr.zip}</p>
                      <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{addr.country} · {addr.phone}</p>
                    </div>
                    <div className='flex gap-2 flex-shrink-0'>
                      <button onClick={() => startEditAddr(addr)} className='p-2 rounded-lg hover:bg-slate-100 transition' style={{ color: 'var(--text-muted)' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleAddrDelete(addr.id)} className='p-2 rounded-lg hover:bg-red-50 transition text-red-400'>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
