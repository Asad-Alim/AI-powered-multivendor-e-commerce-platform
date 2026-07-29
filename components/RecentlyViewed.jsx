'use client'
// NEW FEATURE: Recently Viewed Products — stored in localStorage, displayed on product pages
import { useEffect, useState } from 'react'
import { useProducts } from '@/context/AppContext'
import ProductCard from './ProductCard'
import { History } from 'lucide-react'

const MAX_RECENT = 8
const STORAGE_KEY = 'im_recently_viewed'

// Utility: add a product ID to the recently viewed list
export function trackRecentlyViewed(productId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    const filtered = list.filter(id => id !== productId)
    const updated = [productId, ...filtered].slice(0, MAX_RECENT)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

export default function RecentlyViewed({ excludeId }) {
  const { products } = useProducts()
  const [recentIds, setRecentIds] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const list = raw ? JSON.parse(raw) : []
      setRecentIds(list.filter(id => id !== excludeId))
    } catch { /* ignore */ }
  }, [excludeId])

  const recentProducts = recentIds
    .map(id => products.find(p => p.id === id))
    .filter(Boolean)
    .slice(0, 4)

  if (recentProducts.length === 0) return null

  return (
    <section className="my-14">
      <div className="flex items-center gap-2 mb-2">
        <History size={18} className="text-indigo-500" />
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Recently Viewed
        </h2>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Products you've browsed recently
      </p>
      <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-10">
        {recentProducts.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  )
}
