'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { useProducts } from '@/context/AppContext'
import { Loader2 } from 'lucide-react'

const BATCH_SIZE = 8

export default function LatestProducts() {
  const { products } = useProducts()
  const sorted = [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const sentinelRef = useRef(null)

  const loadMore = useCallback(() => {
    setVisibleCount(c => Math.min(c + BATCH_SIZE, sorted.length))
  }, [sorted.length])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  const visible = sorted.slice(0, visibleCount)
  const hasMore = visibleCount < sorted.length

  return (
    <div className='px-6 my-24 max-w-6xl mx-auto'>
      <Title title='Latest Products' description={`Showing ${visible.length} of ${sorted.length} products`} href='/shop' />
      <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 justify-between'>
        {visible.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-green-500" />
        </div>
      )}
    </div>
  )
}