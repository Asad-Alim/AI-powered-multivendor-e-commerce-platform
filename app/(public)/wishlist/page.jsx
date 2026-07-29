'use client'
import { useWishlist, useProducts, useCart } from "@/context/AppContext"
import ProductCard from "@/components/ProductCard"
import { Heart } from "lucide-react"
import Link from "next/link"
import PageTitle from "@/components/PageTitle"

export default function Wishlist() {
  const { wishlist } = useWishlist()
  const { products } = useProducts()

  const wishlisted = products.filter(p => wishlist.includes(p.id))

  return (
    <div className="min-h-[70vh] mx-6">
      <div className="max-w-7xl mx-auto">
        {wishlisted.length > 0 ? (
          <>
            <PageTitle heading="My Wishlist" text={`${wishlisted.length} saved item${wishlisted.length !== 1 ? 's' : ''}`} path="/shop" linkText="Continue shopping" />
            <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-10 mb-20">
              {wishlisted.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </>
        ) : (
          <div className="min-h-[80vh] flex flex-col items-center justify-center gap-5">
            <Heart size={80} className="opacity-20" style={{ color: 'var(--text-muted)' }} />
            <h1 className="text-2xl sm:text-3xl font-semibold" style={{ color: 'var(--text-muted)' }}>Your wishlist is empty</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Save items you love by clicking the heart icon on any product.</p>
            <Link href="/shop" className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium transition">Browse Products</Link>
          </div>
        )}
      </div>
    </div>
  )
}
