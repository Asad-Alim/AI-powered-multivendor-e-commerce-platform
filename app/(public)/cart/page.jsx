'use client'
import Counter from "@/components/Counter"
import OrderSummary from "@/components/OrderSummary"
import PageTitle from "@/components/PageTitle"
import { useCart } from "@/context/AppContext"
import { Trash2, ShoppingCart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function Cart() {
  const { cartArray, cartSubtotal, deleteFromCart, currency } = useCart()

  if (cartArray.length === 0) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4" style={{ color: 'var(--text-muted)' }}>
      <ShoppingCart size={64} className="opacity-30" />
      <h1 className="text-2xl sm:text-4xl font-semibold">Your cart is empty</h1>
      <Link href="/shop" className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium transition">Browse Products</Link>
    </div>
  )

  return (
    <div className="min-h-screen mx-6" style={{ color: 'var(--text-primary)' }}>
      <div className="max-w-7xl mx-auto">
        <PageTitle heading="My Cart" text={`${cartArray.length} item${cartArray.length !== 1 ? 's' : ''} in your cart`} path="/shop" linkText="Add more" />

        <div className="flex items-start justify-between gap-8 max-lg:flex-col">
          <div className="flex-1 w-full">
            <table className="w-full text-sm" style={{ color: 'var(--text-secondary)' }}>
              <thead>
                <tr className="text-left border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium text-center">Qty</th>
                  <th className="pb-3 font-medium text-center">Subtotal</th>
                  <th className="pb-3 font-medium text-center max-md:hidden">Remove</th>
                </tr>
              </thead>
              <tbody>
                {cartArray.map((item, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="py-5">
                      <div className="flex gap-4 items-center">
                        <div className="flex items-center justify-center size-20 rounded-xl shrink-0" style={{ backgroundColor: 'var(--bg-card)' }}>
                          <Image src={item.images[0]} className="h-14 w-auto object-contain" alt={item.name} width={50} height={50} />
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.category}</p>
                          <p className="mt-1 font-semibold text-green-500">{currency}{item.price}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center"><Counter productId={item.id} /></td>
                    <td className="text-center font-semibold" style={{ color: 'var(--text-primary)' }}>{currency}{(item.price * item.quantity).toFixed(2)}</td>
                    <td className="text-center max-md:hidden">
                      <button onClick={() => deleteFromCart(item.id)} className="p-2 rounded-full hover:bg-red-50 text-red-400 hover:text-red-600 transition active:scale-95">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <OrderSummary totalPrice={cartSubtotal} items={cartArray} />
        </div>
      </div>
    </div>
  )
}
