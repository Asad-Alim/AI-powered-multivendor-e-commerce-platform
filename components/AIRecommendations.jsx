'use client'
import { useState, useEffect } from 'react'
import ProductCard from './ProductCard'
import { Sparkles, Loader2, Layers } from 'lucide-react'

export default function AIRecommendations({ currentProduct }) {
  return (
    <>
      <MoreLikeThis currentProduct={currentProduct} />
      <YouMightAlsoNeed currentProduct={currentProduct} />
    </>
  )
}

function MoreLikeThis({ currentProduct }) {
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentProduct) return
    setLoading(true)
    fetch(`/api/products/related?productId=${currentProduct.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProducts(data.data.products)
          setCategory(data.data.category)
        }
      })
      .finally(() => setLoading(false))
  }, [currentProduct?.id])

  if (!loading && products.length === 0) return null

  return (
    <section className="my-16">
      <div className="flex items-center gap-2 mb-6">
        <Layers size={20} className="text-green-500" />
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          More in {category || 'this category'}
        </h2>
      </div>
      {loading ? (
        <div className="flex items-center gap-3 py-8" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="animate-spin text-green-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-10">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  )
}

function YouMightAlsoNeed({ currentProduct }) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [reasoning, setReasoning] = useState('')

  useEffect(() => {
    if (!currentProduct) return

    const getRecommendations = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/ai/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentProduct: { id: currentProduct.id, name: currentProduct.name, category: currentProduct.category, price: currentProduct.price },
          }),
        })
        const data = await res.json()
        if (data.success && data.data.productIds.length) {
          const res2 = await fetch(`/api/products?ids=${data.data.productIds.join(',')}`)
          const catalog = await res2.json()
          const all = catalog.success ? catalog.data.products : []
          const recProducts = data.data.productIds
            .map(id => all.find(p => p.id === id))
            .filter(Boolean)
          setRecommendations(recProducts)
          setReasoning(data.data.reasoning || '')
        } else {
          setRecommendations([])
        }
      } catch {
        setRecommendations([])
      } finally {
        setLoading(false)
      }
    }

    getRecommendations()
  }, [currentProduct?.id])

  if (!loading && recommendations.length === 0) return null

  return (
    <section className="my-16">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={20} className="text-green-500" />
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>You might also need</h2>
      </div>
      {reasoning && (
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{reasoning}</p>
      )}
      {loading ? (
        <div className="flex items-center gap-3 py-8" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="animate-spin text-green-500" />
          <span className="text-sm">Finding the best picks for you…</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-10">
          {recommendations.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  )
}