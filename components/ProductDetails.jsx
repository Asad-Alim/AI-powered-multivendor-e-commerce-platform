'use client'
import { useCart, useWishlist } from "@/context/AppContext"
import { Heart, Star, Tag, Globe, CreditCard, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Image from "next/image"
import Counter from "./Counter"
import toast from "react-hot-toast"

export default function ProductDetails({ product }) {
  const { currency, addToCart, cart } = useCart()
  const { toggleWishlist, isWishlisted } = useWishlist()
  const router = useRouter()
  const [mainImage, setMainImage] = useState(product.images[0])

  const productId = product.id
  const wishlisted = isWishlisted(productId)
  const avgRating = product.rating?.length
    ? product.rating.reduce((a, r) => a + r.rating, 0) / product.rating.length
    : 0

  const handleWishlist = () => {
    toggleWishlist(productId)
    toast.success(wishlisted ? 'Removed from wishlist' : '❤️ Added to wishlist!')
  }

  return (
    <div className="flex max-lg:flex-col gap-12 py-6">
      {/* Images */}
      <div className="flex max-sm:flex-col-reverse gap-3">
        <div className="flex sm:flex-col gap-3">
          {product.images.map((img, i) => (
            <div key={i} onClick={() => setMainImage(img)} className="flex items-center justify-center size-20 rounded-lg cursor-pointer transition hover:ring-2 ring-green-400" style={{ backgroundColor: 'var(--bg-card)' }}>
              <Image src={img} className="h-14 w-auto object-contain" alt="" width={45} height={45} />
            </div>
          ))}
        </div>
        <div className="flex justify-center items-center h-80 sm:size-96 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
          <Image src={mainImage} alt={product.name} width={280} height={280} className="object-contain max-h-72" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1">
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>{product.name}</h1>

        <div className="flex items-center gap-2 mt-2">
          {Array(5).fill('').map((_, i) => (
            <Star key={i} size={16} className="text-transparent" fill={avgRating >= i + 1 ? '#00C950' : '#D1D5DB'} />
          ))}
          <span className="text-sm ml-1" style={{ color: 'var(--text-secondary)' }}>({product.rating?.length || 0} reviews)</span>
        </div>

        <div className="flex items-baseline gap-3 mt-5">
          <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{currency}{product.price}</span>
          {product.mrp > product.price && (
            <span className="text-xl line-through" style={{ color: 'var(--text-muted)' }}>{currency}{product.mrp}</span>
          )}
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
            Save {Math.round((product.mrp - product.price) / product.mrp * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-2 mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Tag size={13} />
          <span>Limited time offer</span>
        </div>

        {/* Add to cart / counter */}
        <div className="flex items-center gap-4 mt-8">
          {cart[productId] ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Quantity</p>
              <Counter productId={productId} />
            </div>
          ) : null}
          <button
            onClick={() => !cart[productId] ? (addToCart(productId), toast.success('Added to cart!')) : router.push('/cart')}
            className="px-10 py-3 text-sm font-medium rounded-xl text-white bg-slate-800 hover:bg-slate-900 active:scale-95 transition"
          >
            {cart[productId] ? 'View Cart' : 'Add to Cart'}
          </button>
          <button onClick={handleWishlist} className="p-3 rounded-xl border transition hover:scale-105" style={{ borderColor: 'var(--border-color)' }}>
            <Heart size={18} className={wishlisted ? 'fill-red-500 text-red-500' : ''} style={{ color: wishlisted ? '' : 'var(--text-secondary)' }} />
          </button>
        </div>

        <hr className="my-6" style={{ borderColor: 'var(--border-color)' }} />

        <div className="flex flex-col gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <p className="flex gap-3 items-center"><Globe size={15} className="text-green-500" /> Free shipping worldwide</p>
          <p className="flex gap-3 items-center"><CreditCard size={15} className="text-green-500" /> 100% secured payment via Stripe</p>
          <p className="flex gap-3 items-center"><ShieldCheck size={15} className="text-green-500" /> Trusted by 10,000+ customers</p>
        </div>

        {product.store && (
          <div className="mt-6 p-4 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
            Sold by <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{product.store.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
