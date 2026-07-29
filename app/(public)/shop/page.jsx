'use client'
import { Suspense, useState, useMemo } from 'react'
import ProductCard from '@/components/ProductCard'
import { useRouter, useSearchParams } from 'next/navigation'
import { useProducts } from '@/context/AppContext'
import { MoveLeft, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react'

const CATEGORIES = ['All','Headphones','Speakers','Watch','Earbuds','Mouse','Decoration','Camera','Laptop','Electronics','Clothing']
const SORTS = [
  { label: 'Newest',           value: 'newest' },
  { label: 'Price: Low → High',value: 'price_asc' },
  { label: 'Price: High → Low',value: 'price_desc' },
  { label: 'Top Rated',        value: 'rating' },
]
const PAGE_SIZE = 12

function ShopContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const { products } = useProducts()

  const search      = searchParams.get('search') || ''
  const categoryParam = searchParams.get('category') || ''

  const [category, setCategory] = useState(categoryParam || 'All')
  const [sort, setSort]         = useState('newest')
  const [maxPrice, setMaxPrice] = useState(1000)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage]         = useState(1)

  const filtered = useMemo(() => {
    let list = [...products]
    if (search)  list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
    if (category && category !== 'All') list = list.filter(p => p.category === category)
    list = list.filter(p => p.price <= maxPrice)
    if (sort === 'newest')    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price)
    if (sort === 'price_desc')list.sort((a, b) => b.price - a.price)
    if (sort === 'rating')    list.sort((a, b) => (b.rating?.length || 0) - (a.rating?.length || 0))
    return list
  }, [products, search, category, sort, maxPrice])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetPage = () => setPage(1)

  const inpSt = { backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }

  return (
    <div className='min-h-[70vh] mx-6'>
      <div className='max-w-7xl mx-auto'>

        {/* Header row */}
        <div className='flex items-center justify-between my-6 flex-wrap gap-3'>
          <h1 className='text-2xl flex items-center gap-2 cursor-pointer' style={{ color: 'var(--text-secondary)' }}
            onClick={() => { setCategory('All'); resetPage(); router.push('/shop') }}>
            {(search || category !== 'All') && <MoveLeft size={20} />}
            All <span className='font-semibold' style={{ color: 'var(--text-primary)' }}>Products</span>
            <span className='text-sm font-normal' style={{ color: 'var(--text-muted)' }}>({filtered.length})</span>
          </h1>
          <div className='flex items-center gap-3'>
            <button onClick={() => setShowFilters(f => !f)}
              className='flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition hover:border-green-400'
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: showFilters ? 'rgba(34,197,94,0.08)' : 'transparent' }}>
              <SlidersHorizontal size={15} /> Filters
            </button>
            <select value={sort} onChange={e => { setSort(e.target.value); resetPage() }}
              className='px-3 py-2 rounded-xl border text-sm outline-none' style={inpSt}>
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Active tags */}
        {(search || category !== 'All') && (
          <div className='flex gap-2 mb-4 flex-wrap'>
            {search && (
              <span className='flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 text-green-700'>
                "{search}" <button onClick={() => { router.push('/shop'); resetPage() }}><X size={13} /></button>
              </span>
            )}
            {category !== 'All' && (
              <span className='flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700'>
                {category} <button onClick={() => { setCategory('All'); resetPage() }}><X size={13} /></button>
              </span>
            )}
          </div>
        )}

        <div className='flex gap-6 items-start'>
          {/* Filters sidebar */}
          {showFilters && (
            <div className='w-52 shrink-0 rounded-2xl border p-5 sticky top-4' style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
              <h3 className='font-semibold mb-3 text-sm' style={{ color: 'var(--text-primary)' }}>Category</h3>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => { setCategory(cat); resetPage() }}
                  className='block w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition'
                  style={{
                    backgroundColor: category === cat ? 'rgba(34,197,94,0.1)' : 'transparent',
                    color: category === cat ? '#22c55e' : 'var(--text-secondary)',
                    fontWeight: category === cat ? 600 : 400,
                  }}>
                  {cat}
                </button>
              ))}

              <h3 className='font-semibold mt-5 mb-2 text-sm' style={{ color: 'var(--text-primary)' }}>Max Price: ${maxPrice}</h3>
              <input type='range' min={10} max={1000} step={10} value={maxPrice}
                onChange={e => { setMaxPrice(Number(e.target.value)); resetPage() }}
                className='w-full accent-green-500' />
              <div className='flex justify-between text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
                <span>$10</span><span>$1000</span>
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className='flex-1'>
            {paginated.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-64 gap-3' style={{ color: 'var(--text-muted)' }}>
                <p className='text-xl font-medium'>No products found</p>
                <button onClick={() => { setCategory('All'); setMaxPrice(1000); resetPage(); router.push('/shop') }}
                  className='text-green-500 hover:underline text-sm'>Clear all filters</button>
              </div>
            ) : (
              <>
                <div className='grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-10'>
                  {paginated.map(p => <ProductCard key={p.id} product={p} />)}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='flex items-center justify-center gap-2 mt-12 mb-6'>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className='p-2 rounded-xl border transition disabled:opacity-40 hover:border-green-400'
                      style={{ borderColor: 'var(--border-color)' }}>
                      <ChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                      .reduce((acc, n, idx, arr) => {
                        if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…')
                        acc.push(n)
                        return acc
                      }, [])
                      .map((n, i) => n === '…' ? (
                        <span key={`ellipsis-${i}`} className='px-2 text-sm' style={{ color: 'var(--text-muted)' }}>…</span>
                      ) : (
                        <button key={n} onClick={() => setPage(n)}
                          className='size-9 rounded-xl text-sm font-medium border transition'
                          style={{
                            borderColor: n === page ? '#22c55e' : 'var(--border-color)',
                            backgroundColor: n === page ? 'rgba(34,197,94,0.1)' : 'transparent',
                            color: n === page ? '#22c55e' : 'var(--text-secondary)',
                          }}>
                          {n}
                        </button>
                      ))
                    }

                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className='p-2 rounded-xl border transition disabled:opacity-40 hover:border-green-400'
                      style={{ borderColor: 'var(--border-color)' }}>
                      <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Shop() {
  return (
    <Suspense fallback={
      <div className='min-h-screen flex items-center justify-center' style={{ color: 'var(--text-muted)' }}>
        Loading shop…
      </div>
    }>
      <ShopContent />
    </Suspense>
  )
}
