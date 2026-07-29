'use client'
import { Heart, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart, useWishlist } from '@/context/AppContext'
import toast from 'react-hot-toast'

export default function ProductCard({ product }) {
  const { currency, addToCart, cart } = useCart()
  const { toggleWishlist, isWishlisted } = useWishlist()

  const rating = product.rating?.length
    ? Math.round(product.rating.reduce((a, c) => a + c.rating, 0) / product.rating.length)
    : 0

  const wishlisted = isWishlisted(product.id)

  const handleWishlist = (e) => {
    e.preventDefault()
    toggleWishlist(product.id)
    toast.success(isWishlisted(product.id) ? 'Removed from wishlist' : 'Added to wishlist!')
  }

  const handleAddToCart = (e) => {
    e.preventDefault()
    addToCart(product.id)
    toast.success('Added to cart!')
  }

  return (
    <Link href={`/product/${product.id}`} className="group relative max-xl:mx-auto">
      {/* Wishlist button */}
      <button onClick={handleWishlist} className="absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 hover:scale-110" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Heart size={14} className={wishlisted ? 'fill-red-500 text-red-500' : 'text-slate-400'} />
      </button>

      <div className="h-40 sm:w-60 sm:h-68 rounded-xl flex items-center justify-center overflow-hidden transition-colors" style={{ backgroundColor: 'var(--bg-card)' }}>
        <Image width={500} height={500} className="max-h-30 sm:max-h-44 w-auto group-hover:scale-110 transition duration-300 object-contain" src={product.images[0]} alt={product.name} />
      </div>

      <div className="flex justify-between gap-3 text-sm pt-2.5 max-w-60" style={{ color: 'var(--text-primary)' }}>
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium">{product.name}</p>
          <div className="flex mt-0.5">
            {Array(5).fill('').map((_, i) => (
              <Star key={i} size={12} className="text-transparent mt-0.5" fill={rating > i ? '#00C950' : '#D1D5DB'} />
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold">{currency}{product.price}</p>
          {product.mrp > product.price && (
            <p className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>{currency}{product.mrp}</p>
          )}
        </div>
      </div>

      {/* Quick add to cart */}
      <button onClick={handleAddToCart} className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-all bg-green-500 hover:bg-green-600 text-white">
        {cart[product.id] ? `In cart (${cart[product.id]})` : 'Add to cart'}
      </button>
    </Link>
  )
}
