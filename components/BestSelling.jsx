'use client'
import Title from './Title'
import ProductCard from './ProductCard'
import { useProducts } from '@/context/AppContext'

export default function BestSelling() {
  const { products } = useProducts()
  const displayQty = 40
  const sorted = [...products].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, displayQty)


  return (
    <div className='px-6 my-24 max-w-6xl mx-auto'>
      <Title title='Best Selling' description={`Showing ${sorted.length} of ${products.length} products`} href='/shop' />
      <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-10'>
        {sorted.map((product, i) => <ProductCard key={i} product={product} />)}
      </div>
    </div>
  )
}
