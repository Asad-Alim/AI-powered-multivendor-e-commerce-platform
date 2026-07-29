'use client'
// NEW FEATURE: SearchBar with live autocomplete suggestions
import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Tag, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

function debounce(fn, delay) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay) }
}

export default function SearchBar({ onClose }) {
  const router = useRouter()
  const [query, setQuery]           = useState('')
  const [suggestions, setSuggestions] = useState({ products: [], categories: [] })
  const [loading, setLoading]       = useState(false)
  const [focused, setFocused]       = useState(false)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Debounced API call
  const fetchSuggestions = useCallback(
    debounce(async (q) => {
      if (!q || q.length < 2) { setSuggestions({ products: [], categories: [] }); return }
      setLoading(true)
      try {
        const res  = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (data.success) setSuggestions(data.data)
      } catch { /* silent */ }
      finally { setLoading(false) }
    }, 280),
    []
  )

  useEffect(() => { fetchSuggestions(query) }, [query])

  // Click outside closes dropdown
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setFocused(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/shop?search=${encodeURIComponent(query.trim())}`)
    onClose?.()
  }

  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
  const showPanel = focused && (query.length >= 2) && (loading || suggestions.products.length > 0 || suggestions.categories.length > 0)

  return (
    <div ref={panelRef} className="relative w-full max-w-xl">
      <form onSubmit={handleSearch} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }}>
        <Search size={16} style={{ color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search products, categories…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text-primary)' }}
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); setSuggestions({ products: [], categories: [] }) }}>
            <X size={15} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
        <button type="submit" className="px-4 py-1.5 text-xs font-medium bg-green-500 hover:bg-green-600 text-white rounded-xl transition">
          Search
        </button>
      </form>

      {/* Suggestions panel */}
      {showPanel && (
        <div className="absolute top-full mt-2 left-0 right-0 rounded-2xl border shadow-xl z-50 overflow-hidden"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>

          {loading && (
            <div className="px-4 py-3 text-xs flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <div className="size-3 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
              Searching…
            </div>
          )}

          {/* Categories */}
          {suggestions.categories.length > 0 && (
            <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-[10px] uppercase font-semibold tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Categories</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.categories.map(cat => (
                  <Link key={cat} href={`/shop?category=${encodeURIComponent(cat)}`}
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition hover:bg-green-50 hover:text-green-700"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    <Tag size={11} /> {cat}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {suggestions.products.length > 0 && (
            <div className="py-2">
              <p className="text-[10px] uppercase font-semibold tracking-widest px-4 pt-1 pb-2" style={{ color: 'var(--text-muted)' }}>Products</p>
              {suggestions.products.map(p => (
                <Link key={p.id} href={`/product/${p.id}`} onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 transition hover:opacity-80"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div className="size-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--bg-card)' }}>
                    {p.image
                      ? <Image src={p.image} alt="" width={36} height={36} className="object-contain h-8 w-auto" />
                      : <div className="size-8 rounded-md bg-slate-200" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      {p.category}
                      {p.rating && <><Star size={10} className="fill-yellow-400 text-yellow-400" /> {p.rating}</>}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-500 flex-shrink-0">{currency}{p.price}</span>
                </Link>
              ))}
            </div>
          )}

          {/* No results */}
          {!loading && suggestions.products.length === 0 && suggestions.categories.length === 0 && query.length >= 2 && (
            <div className="px-4 py-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No results for "<strong>{query}</strong>"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
