'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AppContext'
import { useStore } from '@/context/StoreContext'
import Loading from '@/components/Loading'
import OrdersAreaChart from '@/components/OrdersAreaChart'
import { dummyStoreDashboardData, dummyRatingsData } from '@/assets/assets'
import { CircleDollarSign, ShoppingBasket, Star, Tags, TrendingUp, Package } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function StoreDashboard() {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
  const { authFetch, user } = useAuth()
  const { activeStoreId } = useStore()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(dummyStoreDashboardData)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user && activeStoreId) {
          const res = await authFetch(`/api/store/dashboard?storeId=${activeStoreId}`)
          const json = await res.json()
          if (json.success) setData(json.data)
          else setData(dummyStoreDashboardData)
        } else if (!user) {
          setData(dummyStoreDashboardData)
        }
      } catch { setData(dummyStoreDashboardData) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [user, activeStoreId])

  if (loading) return <Loading />

  const cards = [
    { title: 'Total Products',  value: data.totalProducts,                          icon: ShoppingBasket, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { title: 'Total Earnings',  value: `${currency}${data.totalEarnings}`,          icon: CircleDollarSign, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { title: 'Total Orders',    value: data.totalOrders,                            icon: Tags, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { title: 'Total Reviews',   value: data.ratings?.length ?? 0,                  icon: Star, color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  ]

  return (
    <div style={{ color: 'var(--text-secondary)' }}>
      <div className='mb-8'>
        <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>
          Seller <span className='text-green-500'>Dashboard</span>
        </h1>
        <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>Your store performance overview</p>
      </div>

      {/* Stat cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10'>
        {cards.map((card, i) => (
          <div key={i} className='flex items-center gap-4 p-5 rounded-2xl border' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className='p-3 rounded-xl shrink-0' style={{ backgroundColor: card.bg }}>
              <card.icon size={20} style={{ color: card.color }} />
            </div>
            <div>
              <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{card.title}</p>
              <p className='text-xl font-bold mt-0.5' style={{ color: 'var(--text-primary)' }}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart from orders */}
      {data.allOrders?.length > 0 && (
        <div className='mb-10'>
          <OrdersAreaChart allOrders={data.allOrders} />
        </div>
      )}

      {/* Reviews */}
      <div>
        <h2 className='text-lg font-semibold mb-4' style={{ color: 'var(--text-primary)' }}>
          Customer <span className='text-green-500'>Reviews</span>
        </h2>
        {(data.ratings || dummyRatingsData).slice(0, 5).map((review, i) => (
          <div key={i} className='flex max-sm:flex-col gap-5 sm:items-start justify-between py-5 border-b text-sm'
            style={{ borderColor: 'var(--border-color)' }}>
            <div className='flex gap-3'>
              {/* FIX: guard against empty image src crashing Next.js Image */}
              {review.user.image ? (
                <Image src={review.user.image} alt='' className='w-10 h-10 rounded-full shrink-0 object-cover' width={40} height={40} />
              ) : (
                <div className='w-10 h-10 rounded-full shrink-0 bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm'>
                  {review.user.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <p className='font-medium' style={{ color: 'var(--text-primary)' }}>{review.user.name}</p>
                <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>{new Date(review.createdAt).toDateString()}</p>
                <div className='flex mt-1'>
                  {Array(5).fill('').map((_, j) => (
                    <Star key={j} size={13} fill={review.rating > j ? '#22c55e' : '#d1d5db'} className='text-transparent' />
                  ))}
                </div>
                <p className='mt-2 max-w-sm leading-relaxed' style={{ color: 'var(--text-secondary)' }}>{review.review}</p>
              </div>
            </div>
            <div className='flex flex-col items-end gap-2 shrink-0'>
              <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{review.product?.category}</p>
              <p className='font-medium text-sm' style={{ color: 'var(--text-primary)' }}>{review.product?.name}</p>
              <button onClick={() => router.push(`/product/${review.product?.id}`)}
                className='text-xs px-4 py-1.5 rounded-lg transition'
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                View Product
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
