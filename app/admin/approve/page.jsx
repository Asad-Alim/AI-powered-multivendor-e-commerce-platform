'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AppContext'
import StoreInfo from '@/components/admin/StoreInfo'
import Loading from '@/components/Loading'
import { storesDummyData } from '@/assets/assets'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Inbox } from 'lucide-react'

export default function AdminApprove() {
  const { authFetch, user } = useAuth()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStores = async () => {
      try {
        if (user) {
          const res = await authFetch('/api/admin/stores?status=PENDING')
          const data = await res.json()
          if (data.success) { setStores(data.data.stores); return }
        }
        // demo: show all as pending
        setStores(storesDummyData.map(s => ({ ...s, status: 'PENDING' })))
      } catch { setStores(storesDummyData.map(s => ({ ...s, status: 'PENDING' }))) }
      finally { setLoading(false) }
    }
    fetchStores()
  }, [user])

  const handleDecision = async (storeId, status) => {
    try {
      const res = await authFetch(`/api/admin/stores/${storeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setStores(prev => prev.filter(s => s.id !== storeId))
      toast.success(`Store ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully`)
    } catch (err) {
      toast.error(err.message || 'Action failed')
      setStores(prev => prev.filter(s => s.id !== storeId))
    }
  }

  if (loading) return <Loading />

  return (
    <div style={{ color: 'var(--text-secondary)' }}>
      <h1 className='text-2xl font-semibold mb-2' style={{ color: 'var(--text-primary)' }}>
        Approve <span className='text-green-500'>Stores</span>
      </h1>
      <p className='text-sm mb-6' style={{ color: 'var(--text-muted)' }}>
        {stores.length} application{stores.length !== 1 ? 's' : ''} awaiting review
      </p>

      {stores.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-4 h-64 rounded-2xl border' style={{ borderColor: 'var(--border-color)' }}>
          <Inbox size={48} style={{ color: 'var(--text-muted)' }} />
          <p className='text-lg font-medium' style={{ color: 'var(--text-muted)' }}>All caught up!</p>
          <p className='text-sm' style={{ color: 'var(--text-muted)' }}>No pending store applications</p>
        </div>
      ) : (
        <div className='flex flex-col gap-4'>
          {stores.map(store => (
            <div key={store.id} className='rounded-2xl border p-6 flex max-md:flex-col gap-4 md:items-end transition hover:shadow-md'
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <StoreInfo store={store} />
              <div className='flex gap-3 shrink-0'>
                <button
                  onClick={() => toast.promise(handleDecision(store.id, 'APPROVED'), { loading: 'Approving…', success: 'Approved!', error: 'Failed' })}
                  className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition active:scale-95'>
                  <CheckCircle size={15} /> Approve
                </button>
                <button
                  onClick={() => toast.promise(handleDecision(store.id, 'REJECTED'), { loading: 'Rejecting…', success: 'Rejected', error: 'Failed' })}
                  className='flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition active:scale-95 border'
                  style={{ borderColor: '#ef4444', color: '#ef4444', backgroundColor: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <XCircle size={15} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
