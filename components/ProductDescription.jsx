'use client'
import { Star, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export default function ProductDescription({ product }) {
  const [tab, setTab] = useState('Description')

  return (
    <div className="my-16 text-sm" style={{ color: 'var(--text-secondary)' }}>
      {/* Tabs */}
      <div className="flex border-b mb-6 max-w-2xl" style={{ borderColor: 'var(--border-color)' }}>
        {['Description', 'Reviews'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2.5 font-medium transition-all relative"
            style={{ color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid #22c55e' : '2px solid transparent', marginBottom: '-1px' }}>
            {t} {t === 'Reviews' && <span className="ml-1 text-xs">({product.rating?.length || 0})</span>}
          </button>
        ))}
      </div>

      {tab === 'Description' && (
        <p className="max-w-2xl leading-relaxed">{product.description}</p>
      )}

      {tab === 'Reviews' && (
        <div className="flex flex-col gap-8 max-w-2xl">
          {product.rating?.length > 0 ? product.rating.map((r, i) => (
            <div key={i} className="flex gap-4 pb-6 border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
              {r.user?.image && <Image src={r.user.image} alt="" className="size-10 rounded-full shrink-0" width={40} height={40} />}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{r.user?.name || 'Anonymous'}</p>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(r.createdAt).toDateString()}</span>
                </div>
                <div className="flex mb-2">
                  {Array(5).fill('').map((_, j) => <Star key={j} size={13} fill={r.rating > j ? '#22c55e' : '#d1d5db'} className="text-transparent" />)}
                </div>
                <p className="leading-relaxed">{r.review}</p>
              </div>
            </div>
          )) : (
            <p style={{ color: 'var(--text-muted)' }}>No reviews yet. Be the first to review this product!</p>
          )}
        </div>
      )}

      {/* Store info */}
      {product.store && (
        <div className="flex items-center gap-3 mt-12 p-4 rounded-2xl border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <Image src={product.store.logo} alt="" className="size-12 rounded-full ring-2 ring-green-200 object-cover" width={48} height={48} />
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{product.store.name}</p>
            <Link href={`/shop/${product.store.username}`} className="flex items-center gap-1 text-green-500 hover:text-green-600 text-sm">
              View store <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
