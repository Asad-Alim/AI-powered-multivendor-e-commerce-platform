'use client'
// StoreContext.jsx — tracks which of a vendor's (possibly several) stores
// is currently active in the /store dashboard, and persists the choice.
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AppContext'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const { user, authFetch, isAuthLoading } = useAuth()
  const [stores, setStores] = useState([])
  const [activeStoreId, setActiveStoreIdState] = useState(null)
  const [loading, setLoading] = useState(true)

  const setActiveStoreId = useCallback((id) => {
    setActiveStoreIdState(id)
    try { localStorage.setItem('im_active_store', id) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const fetchStores = async () => {
      if (!user) { setStores([]); setActiveStoreIdState(null); setLoading(false); return }
      try {
        let savedId = null
        try { savedId = localStorage.getItem('im_active_store') } catch { /* ignore */ }

        const res  = await authFetch(`/api/store/me${savedId ? `?storeId=${savedId}` : ''}`)
        const data = await res.json()
        if (data.success) {
          setStores(data.data.stores || [])
          const resolvedId = data.data.store?.id || null
          setActiveStoreIdState(resolvedId)
          if (resolvedId) {
            try { localStorage.setItem('im_active_store', resolvedId) } catch { /* ignore */ }
          }
        }
      } catch { /* leave stores empty — StoreLayout shows the "no store" state */ }
      finally { setLoading(false) }
    }
    if (!isAuthLoading) fetchStores()
  }, [user, isAuthLoading])

  const activeStore = stores.find(s => s.id === activeStoreId) || null

  return (
    <StoreContext.Provider value={{ stores, setStores, activeStoreId, activeStore, setActiveStoreId, loading }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}