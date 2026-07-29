'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AppContext'
import Loading from '@/components/Loading'
import OrdersAreaChart from '@/components/OrdersAreaChart'
import { dummyAdminDashboardData } from '@/assets/assets'
import { CircleDollarSign, ShoppingBasket, Store, Tags, TrendingUp, Package, AlertCircle, CheckCircle } from 'lucide-react'

export default function AdminDashboard() {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
  const { authFetch, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(dummyAdminDashboardData)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user) {
          const res = await authFetch('/api/admin/dashboard')
          const json = await res.json()
          if (json.success) setData(json.data)
          else setData(dummyAdminDashboardData)
        } else {
          setData(dummyAdminDashboardData)
        }
      } catch { setData(dummyAdminDashboardData) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [user])

  if (loading) return <Loading />

  const cards = [
    { title: 'Total Products', value: data.products, icon: ShoppingBasket, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { title: 'Total Revenue', value: `${currency}${Number(data.revenue).toLocaleString()}`, icon: CircleDollarSign, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { title: 'Total Orders', value: data.orders, icon: Tags, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { title: 'Active Stores', value: data.stores, icon: Store, color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  ]

  const statusCards = [
    { label: 'Pending Approvals', value: data.pendingApprovals ?? 2, icon: AlertCircle, color: '#f59e0b' },
    { label: 'Paid Orders', value: data.paidOrders ?? 4, icon: CheckCircle, color: '#22c55e' },
    { label: 'Avg Order Value', value: `${currency}${data.allOrders?.length ? (data.revenue / data.orders).toFixed(0) : 0}`, icon: TrendingUp, color: '#6366f1' },
    { label: 'Items Sold', value: data.itemsSold ?? data.orders * 2, icon: Package, color: '#ec4899' },
  ]

  return (
    <div style={{ color: 'var(--text-secondary)' }}>
      <div className='mb-8'>
        <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>
          Admin <span className='text-green-500'>Dashboard</span>
        </h1>
        <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>Welcome back, {user?.name || 'Asad'} 👋</p>
      </div>

      {/* Main stat cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
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

      {/* Secondary stat cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10'>
        {statusCards.map((card, i) => (
          <div key={i} className='flex items-center gap-3 p-4 rounded-xl border' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <card.icon size={16} style={{ color: card.color }} />
            <div>
              <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{card.label}</p>
              <p className='font-semibold text-sm' style={{ color: 'var(--text-primary)' }}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <OrdersAreaChart allOrders={data.allOrders || []} />
    </div>
  )
}
