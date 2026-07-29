'use client'
import ProductDescription from '@/components/ProductDescription'
import ProductDetails from '@/components/ProductDetails'
import AIRecommendations from '@/components/AIRecommendations'
import RecentlyViewed, { trackRecentlyViewed } from '@/components/RecentlyViewed'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useProducts } from '@/context/AppContext'
import Loading from '@/components/Loading'

export default function Product() {
  const { productId } = useParams()
  const [product, setProduct] = useState(null)
  const { products } = useProducts()

  useEffect(() => {
    const found = products.find(p => p.id === productId)
    setProduct(found || null)
    scrollTo(0, 0)
    // Track this product as recently viewed
    if (productId) trackRecentlyViewed(productId)
  }, [productId, products])

  if (!product) return <Loading />

  return (
    <div className='mx-6'>
      <div className='max-w-7xl mx-auto'>
        {/* Breadcrumb */}
        <div className='text-sm mt-8 mb-5' style={{ color: 'var(--text-muted)' }}>
          Home / Products / {product.category} / <span style={{ color: 'var(--text-primary)' }}>{product.name}</span>
        </div>
        <ProductDetails product={product} />
        <ProductDescription product={product} />
        <AIRecommendations currentProduct={product} />
        <RecentlyViewed excludeId={productId} />
      </div>
    </div>
  )
}
