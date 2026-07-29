'use client'
import ProductCard from '@/components/ProductCard'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Mail, MapPin, Phone, Store } from 'lucide-react'
import Loading from '@/components/Loading'
import Image from 'next/image'
import { dummyStoreData, productDummyData } from '@/assets/assets'

export default function StoreShop() {
  const { username } = useParams()
  const [products, setProducts] = useState([])
  const [storeInfo, setStoreInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        const res = await fetch(`/api/store/public/${username}`)
        const data = await res.json()
        if (data.success) {
          setStoreInfo(data.data.store)
          setProducts(data.data.products)
          return
        }
      } catch { /* fallback */ }
      // FIX: fallback only sets data, does NOT call setLoading(false) here —
      // that is handled in the finally block below
      setStoreInfo({ ...dummyStoreData, username })
      setProducts(productDummyData)
    }
    // FIX: moved setLoading(false) into finally so spinner shows until data is ready
    fetchStoreData().finally(() => setLoading(false))
  }, [username])

  if (loading) return <Loading />

  return (
    <div className='min-h-[70vh] mx-6'>
      {storeInfo && (
        <div className='max-w-7xl mx-auto rounded-2xl p-6 md:p-10 mt-6 flex flex-col md:flex-row items-center gap-6 border'
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <Image src={storeInfo.logo} alt={storeInfo.name}
            className='size-28 rounded-2xl object-cover border-2 shadow' style={{ borderColor: 'var(--border-color)' }}
            width={112} height={112} />
          <div className='text-center md:text-left'>
            <div className='flex items-center gap-3 justify-center md:justify-start flex-wrap'>
              <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>{storeInfo.name}</h1>
              <span className='text-sm px-3 py-0.5 rounded-full bg-green-100 text-green-700 font-medium'>@{storeInfo.username}</span>
            </div>
            <p className='text-sm mt-2 max-w-lg' style={{ color: 'var(--text-secondary)' }}>{storeInfo.description}</p>
            <div className='flex flex-wrap gap-x-6 gap-y-1 mt-4 text-sm justify-center md:justify-start' style={{ color: 'var(--text-muted)' }}>
              {storeInfo.address && <span className='flex items-center gap-1.5'><MapPin size={13} />{storeInfo.address}</span>}
              {storeInfo.email   && <span className='flex items-center gap-1.5'><Mail size={13} />{storeInfo.email}</span>}
              {storeInfo.contact && <span className='flex items-center gap-1.5'><Phone size={13} />{storeInfo.contact}</span>}
            </div>
          </div>
        </div>
      )}

      <div className='max-w-7xl mx-auto mb-20'>
        <h2 className='text-xl font-semibold mt-10 mb-6' style={{ color: 'var(--text-primary)' }}>
          <span className='text-green-500'>{products.length}</span> Products Available
        </h2>
        {products.length === 0 ? (
          <div className='flex flex-col items-center gap-3 py-20' style={{ color: 'var(--text-muted)' }}>
            <Store size={48} className='opacity-30' />
            <p>No products listed yet</p>
          </div>
        ) : (
          <div className='grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-10'>
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
