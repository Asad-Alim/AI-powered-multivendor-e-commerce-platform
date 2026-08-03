'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AppContext'
import { useStore } from '@/context/StoreContext'
import Loading from '@/components/Loading'
import OrdersAreaChart from '@/components/OrdersAreaChart'
import { dummyAdminDashboardData } from '@/assets/assets'
import { TrendingUp, DollarSign, ShoppingBag, Target, Award, Package } from 'lucide-react'
import Image from 'next/image'

export default function StoreAnalytics() {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
  const { authFetch, user } = useAuth()
  const { activeStoreId } = useStore()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch(`/api/store/analytics${activeStoreId ? `?storeId=${activeStoreId}` : ''}`)
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        } else {
          // Demo fallback
          setData({
            summary: { totalRevenue: 2840, totalOrders: 24, avgOrderValue: 118.33, fulfillmentRate: 75.0 },
            orders: dummyAdminDashboardData.allOrders,
            topProducts: [],
            categoryBreakdown: [],
          })
        }
      } catch {
        setData({
          summary: { totalRevenue: 2840, totalOrders: 24, avgOrderValue: 118.33, conversionRate: 75.0 },
          orders: dummyAdminDashboardData.allOrders,
          topProducts: [],
          categoryBreakdown: [],
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeStoreId])

  if (loading) return <Loading />

  const summaryCards = [
    { title: 'Total Revenue', value: `${currency}${Number(data.summary.totalRevenue).toFixed(2)}`, icon: DollarSign, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', change: '+12.5%' },
    { title: 'Total Orders', value: data.summary.totalOrders, icon: ShoppingBag, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', change: '+8.2%' },
    { title: 'Avg Order Value', value: `${currency}${Number(data.summary.avgOrderValue).toFixed(2)}`, icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', change: '+3.1%' },
    { title: 'Fulfillment Rate', value: `${data.summary.fulfillmentRate}%`, icon: Target, color: '#ec4899', bg: 'rgba(236,72,153,0.1)', change: '+1.5%' },
  ]

  const statusColors = {
    DELIVERED: 'bg-green-100 text-green-700',
    PENDING: 'bg-slate-100 text-slate-600',
    SHIPPED: 'bg-indigo-100 text-indigo-700',
    CANCELLED: 'bg-red-100 text-red-600',
  }

  return (
    <div style={{ color: 'var(--text-secondary)' }}>
      <div className='mb-8'>
        <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>
          Store <span className='text-green-500'>Analytics</span>
        </h1>
        <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>Your store performance insights</p>
      </div>

      {/* Summary Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
        {summaryCards.map((card, i) => (
          <div key={i} className='p-5 rounded-2xl border' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className='flex items-center justify-between mb-3'>
              <div className='p-2.5 rounded-xl' style={{ backgroundColor: card.bg }}>
                <card.icon size={18} style={{ color: card.color }} />
              </div>
              <span className='text-xs font-medium text-green-500'>{card.change}</span>
            </div>
            <p className='text-xs mb-1' style={{ color: 'var(--text-muted)' }}>{card.title}</p>
            <p className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className='mb-8'>
        <h2 className='text-base font-semibold mb-4' style={{ color: 'var(--text-primary)' }}>
          Revenue <span className='text-green-500'>Over Time</span>
        </h2>
        <OrdersAreaChart allOrders={data.orders || []} />
      </div>

      <div className='grid lg:grid-cols-2 gap-6'>
        {/* Top Products */}
        <div className='rounded-2xl border p-5' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <h2 className='text-base font-semibold mb-4 flex items-center gap-2' style={{ color: 'var(--text-primary)' }}>
            <Award size={16} className='text-green-500' /> Top Products
          </h2>
          {data.topProducts?.length > 0 ? (
            <div className='flex flex-col gap-3'>
              {data.topProducts.map((item, i) => (
                <div key={i} className='flex items-center gap-3'>
                  <span className='text-lg font-bold w-6 text-center' style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
                  {item.product?.images?.[0] && (
                    <div className='size-10 rounded-lg flex items-center justify-center shrink-0' style={{ backgroundColor: 'var(--bg-card)' }}>
                      <Image src={item.product.images[0]} alt='' width={36} height={36} className='object-contain h-8 w-auto' />
                    </div>
                  )}
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate' style={{ color: 'var(--text-primary)' }}>{item.product?.name || 'Product'}</p>
                    <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{item._sum?.quantity || 0} sold</p>
                  </div>
                  <p className='text-sm font-semibold text-green-500'>{currency}{Number(item._sum?.price || 0).toFixed(0)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className='flex flex-col items-center py-8 gap-2' style={{ color: 'var(--text-muted)' }}>
              <Package size={36} className='opacity-30' />
              <p className='text-sm'>No sales data yet</p>
            </div>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div className='rounded-2xl border p-5' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <h2 className='text-base font-semibold mb-4 flex items-center gap-2' style={{ color: 'var(--text-primary)' }}>
            <TrendingUp size={16} className='text-green-500' /> Order Breakdown
          </h2>
          {data.categoryBreakdown?.length > 0 ? (
            <div className='flex flex-col gap-3'>
              {data.categoryBreakdown.map((item, i) => {
                const total = data.summary.totalOrders || 1
                const pct = Math.round((item._count.id / total) * 100)
                return (
                  <div key={i}>
                    <div className='flex justify-between text-sm mb-1'>
                      <span style={{ color: 'var(--text-primary)' }}>{item.status?.replace(/_/g, ' ')}</span>
                      <span className='font-medium' style={{ color: 'var(--text-primary)' }}>{item._count.id} ({pct}%)</span>
                    </div>
                    <div className='h-2 rounded-full overflow-hidden' style={{ backgroundColor: 'var(--bg-card)' }}>
                      <div className='h-full rounded-full bg-green-500 transition-all duration-500' style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Demo data when API returns nothing
            <div className='flex flex-col gap-3'>
              {[['DELIVERED', 18, 75], ['PENDING', 3, 12.5], ['SHIPPED', 2, 8.3], ['CANCELLED', 1, 4.2]].map(([status, count, pct]) => (
                <div key={status}>
                  <div className='flex justify-between text-sm mb-1'>
                    <span style={{ color: 'var(--text-primary)' }}>{status.replace(/_/g, ' ')}</span>
                    <span className='font-medium' style={{ color: 'var(--text-primary)' }}>{count} ({pct}%)</span>
                  </div>
                  <div className='h-2 rounded-full overflow-hidden' style={{ backgroundColor: 'var(--bg-card)' }}>
                    <div className='h-full rounded-full bg-green-500 transition-all duration-500' style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
