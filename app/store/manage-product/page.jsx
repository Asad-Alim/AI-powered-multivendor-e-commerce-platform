'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AppContext'
import { useStore } from '@/context/StoreContext'
import Loading from '@/components/Loading'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { ToggleLeft, ToggleRight, Trash2, Search, Pencil } from 'lucide-react'
import Link from 'next/link'

export default function StoreManageProducts() {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
  const { authFetch, user } = useAuth()
  const { activeStoreId } = useStore()
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    const fetchProducts = async () => {
      if (!user || !activeStoreId) { setLoading(false); return }
      try {
        const res  = await authFetch(`/api/products?storeId=mine&activeStoreId=${activeStoreId}&limit=100`)
        const data = await res.json()
        if (data.success) setProducts(data.data.products)
      } catch { /* show empty */ }
      finally { setLoading(false) }
    }
    fetchProducts()
  }, [user, activeStoreId])

  
  const toggleStock = async (productId, current) => {
    try {
      const res  = await authFetch(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ inStock: !current }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
    } catch { /* allow UI update */ }
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, inStock: !current } : p))
    toast.success(`Stock ${!current ? 'enabled' : 'disabled'}`)
  }

  const deleteProduct = async (productId) => {
    try {
      const res  = await authFetch(`/api/products/${productId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
    } catch { /* allow UI update */ }
    setProducts(prev => prev.filter(p => p.id !== productId))
    toast.success('Product removed')
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Loading />

  return (
    <div style={{ color: 'var(--text-secondary)' }}>
      <div className='flex items-center justify-between mb-6 flex-wrap gap-3'>
        <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>
          Manage <span className='text-green-500'>Products</span>
          <span className='ml-2 text-sm font-normal' style={{ color: 'var(--text-muted)' }}>({products.length})</span>
        </h1>
        <div className='flex items-center gap-2 px-4 py-2 rounded-xl border text-sm' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--input-bg)' }}>
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input className='bg-transparent outline-none w-44' style={{ color: 'var(--text-primary)' }}
            placeholder='Search products…' value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {products.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-24 rounded-2xl border gap-4' style={{ borderColor: 'var(--border-color)' }}>
          <p className='text-lg font-medium' style={{ color: 'var(--text-muted)' }}>No products yet</p>
          <Link href='/store/add-product' className='px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition'>
            Add Your First Product
          </Link>
        </div>
      ) : (
        <div className='rounded-2xl border overflow-hidden' style={{ borderColor: 'var(--border-color)' }}>
          <table className='w-full text-sm'>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                {['Product', 'Category', 'MRP', 'Price', 'Stock', 'Actions'].map(h => (
                  <th key={h} className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y' style={{ borderColor: 'var(--border-color)' }}>
              {filtered.map(product => (
                <tr key={product.id} className='transition-colors' style={{ backgroundColor: 'var(--bg-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-3'>
                      <div className='size-10 rounded-lg flex items-center justify-center shrink-0' style={{ backgroundColor: 'var(--bg-card)' }}>
                        <Image src={product.images[0] || 'https://placehold.co/40'} alt='' width={36} height={36} className='object-contain h-8 w-auto' />
                      </div>
                      <span className='font-medium max-w-[140px] truncate' style={{ color: 'var(--text-primary)' }}>{product.name}</span>
                    </div>
                  </td>
                  <td className='px-4 py-3 text-xs'>{product.category}</td>
                  <td className='px-4 py-3'><span className='line-through text-xs'>{currency}{product.mrp}</span></td>
                  <td className='px-4 py-3 font-semibold text-green-500'>{currency}{product.price}</td>
                  <td className='px-4 py-3'>
                    <button onClick={() => toast.promise(toggleStock(product.id, product.inStock), { loading: 'Updating…' })}>
                      {product.inStock
                        ? <ToggleRight size={26} className='text-green-500' />
                        : <ToggleLeft size={26} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-1'>
                      <Link href={`/store/edit-product/${product.id}`}
                        className='p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition active:scale-90'>
                        <Pencil size={15} />
                      </Link>
                      <button onClick={() => toast.promise(deleteProduct(product.id), { loading: 'Removing…' })}
                        className='p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition active:scale-90'>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className='text-center py-12 text-sm' style={{ color: 'var(--text-muted)' }}>No products match your search</p>
          )}
        </div>
      )}
    </div>
  )
}
