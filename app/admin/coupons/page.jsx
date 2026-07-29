'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AppContext'
import { couponDummyData } from '@/assets/assets'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Trash2, Plus, Tag } from 'lucide-react'

const CATEGORIES = ['All','Headphones','Speakers','Watch','Earbuds','Mouse','Decoration','Camera','Laptop','Electronics','Clothing']
const INIT = { code: '', description: '', discount: '', newUsersOnly: false, allowedPlans: [], category: '', isPublic: true, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) }

export default function AdminCoupons() {
  const { authFetch, user } = useAuth()
  const [coupons, setCoupons] = useState([])
  const [form, setForm] = useState(INIT)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        if (user) {
          const res = await authFetch('/api/admin/coupons')
          const data = await res.json()
          if (data.success) { setCoupons(data.data.coupons); return }
        }
        setCoupons(couponDummyData)
      } catch { setCoupons(couponDummyData) }
    }
    fetchCoupons()
  }, [user])

  const handleAdd = async (e) => {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await authFetch('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({ ...form, discount: parseFloat(form.discount), expiresAt: new Date(form.expiresAt).toISOString() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setCoupons(prev => [data.data.coupon, ...prev])
      toast.success('Coupon created!')
      setForm(INIT)
    } catch (err) {
      toast.error(err.message || 'Failed')
      // demo fallback
      setCoupons(prev => [{ ...form, discount: parseFloat(form.discount), createdAt: new Date().toISOString() }, ...prev])
      setForm(INIT)
    } finally { setAdding(false) }
  }

  const handleDelete = async (code) => {
    try {
      await authFetch(`/api/admin/coupons/${code}`, { method: 'DELETE' })
      setCoupons(prev => prev.filter(c => c.code !== code))
      toast.success('Coupon deleted')
    } catch {
      setCoupons(prev => prev.filter(c => c.code !== code))
      toast.success('Coupon deleted')
    }
  }

  const inp = 'w-full p-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-green-400 transition'
  const inpStyle = { backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }

  return (
    <div style={{ color: 'var(--text-secondary)' }}>
      <h1 className='text-2xl font-semibold mb-8' style={{ color: 'var(--text-primary)' }}>
        Manage <span className='text-green-500'>Coupons</span>
      </h1>

      <div className='grid lg:grid-cols-2 gap-10'>
        {/* Add Form */}
        <div>
          <h2 className='text-base font-medium mb-4 flex items-center gap-2' style={{ color: 'var(--text-primary)' }}>
            <Plus size={16} className='text-green-500' /> Add New Coupon
          </h2>
          <form onSubmit={e => toast.promise(handleAdd(e), { loading: 'Creating…', success: ' ', error: ' ' })}
            className='flex flex-col gap-3 p-6 rounded-2xl border' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className='flex gap-3'>
              <input placeholder='COUPON CODE' className={inp} style={inpStyle} value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required />
              <input type='number' placeholder='Discount %' min={1} max={100} className={inp} style={{ ...inpStyle, maxWidth: 120 }}
                value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} required />
            </div>
            <input placeholder='Description' className={inp} style={inpStyle} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
            <div>
              <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Expires At</label>
              <input type='date' className={inp} style={inpStyle} value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} required />
            </div>
            <div className='flex flex-col gap-2 pt-1'>
              <label className='flex items-center gap-3 cursor-pointer text-sm'>
                <input type='checkbox' checked={form.newUsersOnly}
                  onChange={e => setForm(f => ({ ...f, newUsersOnly: e.target.checked }))} />
                New users only
              </label>
              <label className='flex items-center gap-3 cursor-pointer text-sm'>
                <input type='checkbox' checked={form.isPublic}
                  onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} />
                Publicly Visible
              </label>
              <div>
                <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Allowed Plans (none = everyone)</label>
                <div className='flex gap-3'>
                  {['FREE','PLUS','PRO'].map(p => (
                    <label key={p} className='flex items-center gap-1.5 text-xs cursor-pointer'>
                      <input type='checkbox' checked={form.allowedPlans.includes(p)}
                        onChange={e => setForm(f => ({
                          ...f,
                          allowedPlans: e.target.checked ? [...f.allowedPlans, p] : f.allowedPlans.filter(x => x !== p),
                        }))} />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Category (optional)</label>
                <select className={inp} style={inpStyle} value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value=''>Cart-wide</option>
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button type='submit' disabled={adding}
              className='mt-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium text-sm transition active:scale-95 disabled:opacity-60'>
              {adding ? 'Creating…' : 'Create Coupon'}
            </button>
          </form>
        </div>

        {/* Coupon List */}
        <div>
          <h2 className='text-base font-medium mb-4 flex items-center gap-2' style={{ color: 'var(--text-primary)' }}>
            <Tag size={16} className='text-green-500' /> Active Coupons ({coupons.length})
          </h2>
          <div className='flex flex-col gap-3'>
            {coupons.map(c => (
              <div key={c.code} className='flex items-center justify-between p-4 rounded-xl border' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <div>
                  <div className='flex items-center gap-2'>
                    <span className='font-mono font-bold text-green-500'>{c.code}</span>
                    <span className='text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700'>{c.discount}% off</span>
                    {c.newUsersOnly && <span className='text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700'>New users</span>}
                    {c.allowedPlans?.length > 0 && <span className='text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700'>{c.allowedPlans.join('/')}</span>}
                    {c.category && <span className='text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700'>{c.category}</span>}
                  </div>
                  <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>{c.description} · Expires {format(new Date(c.expiresAt), 'MMM d, yyyy')}</p>
                </div>
                <button onClick={() => toast.promise(handleDelete(c.code), { loading: 'Deleting…', success: ' ', error: ' ' })}
                  className='p-2 rounded-full hover:bg-red-50 text-red-400 hover:text-red-600 transition active:scale-90'>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {coupons.length === 0 && <p className='text-sm py-8 text-center' style={{ color: 'var(--text-muted)' }}>No coupons yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
