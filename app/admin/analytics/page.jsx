'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AppContext'
import Loading from '@/components/Loading'
import OrdersAreaChart from '@/components/OrdersAreaChart'
import { dummyAdminDashboardData } from '@/assets/assets'
import { DollarSign, ShoppingBag, CreditCard, TrendingUp, Building2, Users } from 'lucide-react'
import Image from 'next/image'

export default function AdminAnalytics() {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
  const { authFetch, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch('/api/admin/analytics')
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        } else {
          setData({
            summary: { totalRevenue: 9591, totalOrders: 42, paidOrders: 38, platformCommission: 959.1 },
            orders: dummyAdminDashboardData.allOrders,
            topStores: [],
            paymentMethodBreakdown: [],
          })
        }
      } catch {
        setData({
          summary: { totalRevenue: 9591, totalOrders: 42, paidOrders: 38, platformCommission: 959.1 },
          orders: dummyAdminDashboardData.allOrders,
          topStores: [],
          paymentMethodBreakdown: [],
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  if (loading) return <Loading />

  const cards = [
    { title: 'Gross Revenue', value: `${currency}${Number(data.summary.totalRevenue).toFixed(2)}`, icon: DollarSign, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', note: 'All paid orders' },
    { title: 'Platform Commission', value: `${currency}${Number(data.summary.platformCommission).toFixed(2)}`, icon: TrendingUp, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', note: '10% of GMV' },
    { title: 'Total Orders', value: data.summary.totalOrders, icon: ShoppingBag, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', note: `${data.summary.paidOrders} paid` },
    { title: 'Payment Rate', value: `${data.summary.totalOrders > 0 ? Math.round(data.summary.paidOrders / data.summary.totalOrders * 100) : 0}%`, icon: CreditCard, color: '#ec4899', bg: 'rgba(236,72,153,0.1)', note: 'Paid vs total' },
  ]

  const paymentSplit = data.paymentMethodBreakdown?.length > 0
    ? data.paymentMethodBreakdown
    : [{ paymentMethod: 'STRIPE', _count: { id: 28 }, _sum: { total: 7200 } }, { paymentMethod: 'COD', _count: { id: 14 }, _sum: { total: 2391 } }]

  const totalPMOrders = paymentSplit.reduce((s, p) => s + (p._count?.id || 0), 0)

  return (
    <div style={{ color: 'var(--text-secondary)' }}>
      <div className='mb-8'>
        <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>
          Platform <span className='text-green-500'>Analytics</span>
        </h1>
        <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>IntelliMart marketplace performance</p>
      </div>

      {/* Summary Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
        {cards.map((card, i) => (
          <div key={i} className='p-5 rounded-2xl border' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className='flex items-center justify-between mb-3'>
              <div className='p-2.5 rounded-xl' style={{ backgroundColor: card.bg }}>
                <card.icon size={18} style={{ color: card.color }} />
              </div>
            </div>
            <p className='text-xs mb-1' style={{ color: 'var(--text-muted)' }}>{card.title}</p>
            <p className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>{card.value}</p>
            <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>{card.note}</p>
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
        {/* Top Stores */}
        <div className='rounded-2xl border p-5' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <h2 className='text-base font-semibold mb-4 flex items-center gap-2' style={{ color: 'var(--text-primary)' }}>
            <Building2 size={16} className='text-green-500' /> Top Earning Stores
          </h2>
          {data.topStores?.length > 0 ? (
            <div className='flex flex-col gap-3'>
              {data.topStores.map((store, i) => (
                <div key={i} className='flex items-center gap-3'>
                  <span className='w-6 text-center font-bold text-lg' style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
                  <div className='size-9 rounded-lg overflow-hidden shrink-0' style={{ backgroundColor: 'var(--bg-card)' }}>
                    {store.logo && <Image src={store.logo} alt='' width={36} height={36} className='object-cover w-full h-full' />}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate' style={{ color: 'var(--text-primary)' }}>{store.name}</p>
                    <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{store.totalOrders} orders</p>
                  </div>
                  <p className='text-sm font-semibold text-green-500'>{currency}{Number(store.totalEarnings).toFixed(0)}</p>
                </div>
              ))}
            </div>
          ) : (
            // Demo stores
            <div className='flex flex-col gap-3'>
              {[['Happy Shop', 18, 4820], ['TechZone', 14, 3210], ['TechStore', 6, 1561]].map(([name, orders, earnings], i) => (
                <div key={i} className='flex items-center gap-3'>
                  <span className='w-6 text-center font-bold text-lg' style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
                  <div className='size-9 rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0 bg-gradient-to-br from-green-400 to-indigo-500'>
                    {name[0]}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>{name}</p>
                    <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{orders} orders</p>
                  </div>
                  <p className='text-sm font-semibold text-green-500'>{currency}{earnings}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method Split */}
        <div className='rounded-2xl border p-5' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <h2 className='text-base font-semibold mb-4 flex items-center gap-2' style={{ color: 'var(--text-primary)' }}>
            <CreditCard size={16} className='text-green-500' /> Payment Methods
          </h2>
          <div className='flex flex-col gap-4'>
            {paymentSplit.map((pm, i) => {
              const pct = totalPMOrders > 0 ? Math.round((pm._count?.id || 0) / totalPMOrders * 100) : 0
              const isStripe = pm.paymentMethod === 'STRIPE'
              return (
                <div key={i}>
                  <div className='flex justify-between text-sm mb-2'>
                    <span className='flex items-center gap-2' style={{ color: 'var(--text-primary)' }}>
                      <span className={`inline-block size-2.5 rounded-full ${isStripe ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                      {pm.paymentMethod}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {pm._count?.id || 0} orders · {pct}%
                    </span>
                  </div>
                  <div className='h-3 rounded-full overflow-hidden' style={{ backgroundColor: 'var(--bg-card)' }}>
                    <div className={`h-full rounded-full transition-all duration-700 ${isStripe ? 'bg-indigo-500' : 'bg-amber-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
                    {currency}{Number(pm._sum?.total || 0).toFixed(2)} revenue
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
