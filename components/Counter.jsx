'use client'
import { useCart } from "@/context/AppContext"

export default function Counter({ productId }) {
  const { cart, addToCart, removeFromCart } = useCart()
  return (
    <div className="inline-flex items-center gap-3 px-3 py-1 rounded border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
      <button onClick={() => removeFromCart(productId)} className="px-1 text-lg leading-none hover:text-red-500 transition select-none">−</button>
      <span className="min-w-[20px] text-center font-medium" style={{ color: 'var(--text-primary)' }}>{cart[productId] || 0}</span>
      <button onClick={() => addToCart(productId)} className="px-1 text-lg leading-none hover:text-green-500 transition select-none">+</button>
    </div>
  )
}
