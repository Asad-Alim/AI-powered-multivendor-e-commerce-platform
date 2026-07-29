'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AppContext'
import StoreInfo from '@/components/admin/StoreInfo'
import Loading from '@/components/Loading'
import { storesDummyData } from '@/assets/assets'
import toast from 'react-hot-toast'
import { ToggleLeft, ToggleRight } from 'lucide-react'

export default function AdminStores() {
  const { authFetch, user } = useAuth()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStores = async () => {
      try {
        if (user) {
          const res = await authFetch('/api/admin/stores')
          const data = await res.json()
          if (data.success) { setStores(data.data.stores); return }
        }
        setStores(storesDummyData)
      } catch { setStores(storesDummyData) }
      finally { setLoading(false) }
    }
    fetchStores()
  }, [user])

  const toggleActive = async (storeId, current) => {
    try {
      const res = await authFetch(`/api/admin/stores/${storeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !current }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, isActive: !current } : s))
      toast.success(`Store ${!current ? 'activated' : 'deactivated'}`)
    } catch (err) {
      toast.error(err.message || 'Failed to update store')
      // still update UI for demo
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, isActive: !current } : s))
    }
  }

  if (loading) return <Loading />

  return (
    <div style={{ color: 'var(--text-secondary)' }}>
      <h1 className='text-2xl font-semibold mb-6' style={{ color: 'var(--text-primary)' }}>
        Live <span className='text-green-500'>Stores</span>
        <span className='ml-2 text-sm font-normal' style={{ color: 'var(--text-muted)' }}>({stores.length} total)</span>
      </h1>

      {stores.length === 0 ? (
        <div className='flex items-center justify-center h-64 rounded-2xl border' style={{ borderColor: 'var(--border-color)' }}>
          <p className='text-xl' style={{ color: 'var(--text-muted)' }}>No stores yet</p>
        </div>
      ) : (
        <div className='flex flex-col gap-4'>
          {stores.map(store => (
            <div key={store.id} className='rounded-2xl border p-6 flex max-md:flex-col gap-4 md:items-end transition hover:shadow-md'
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <StoreInfo store={store} />
              <div className='flex items-center gap-3 shrink-0'>
                <span className='text-sm' style={{ color: 'var(--text-secondary)' }}>Active</span>
                <button onClick={() => toast.promise(toggleActive(store.id, store.isActive), { loading: 'Updating…' })}
                  className='transition-transform hover:scale-110'>
                  {store.isActive
                    ? <ToggleRight size={32} className='text-green-500' />
                    : <ToggleLeft size={32} style={{ color: 'var(--text-muted)' }} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
