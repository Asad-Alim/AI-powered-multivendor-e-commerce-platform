'use client'
import PageTitle from '@/components/PageTitle'
import OrderItem from '@/components/OrderItem'
import OrderTimeline from '@/components/OrderTimeline'
import Loading from '@/components/Loading'
import { useAuth } from '@/context/AppContext'
import { useEffect, useState } from 'react'
import { Package, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

export default function Orders() {
  const { user, authFetch } = useAuth()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [expandedGroups, setExpandedGroups] = useState({})

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true)
      try {
        if (user) {
          const res  = await authFetch('/api/orders')
          const data = await res.json()
          if (data.success) setOrders(data.data.orders)
        }
        // No dummy data fallback — show empty state when not logged in
      } catch {
        // API error — show empty orders
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [user])

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleExpandGroup = (id) => setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }))

  const handleStatusChange = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  }

  if (loading) return <Loading />

  // Group orders that share an orderGroupId as "one purchase, N shipments"
  // (item 1) — every order created after the multi-vendor split has a group
  // id, even single-vendor purchases, so this naturally collapses to a
  // group of 1 for those.
  const groups = []
  const groupIndex = {}
  for (const order of orders) {
    const key = order.orderGroupId || order.id
    if (groupIndex[key] === undefined) {
      groupIndex[key] = groups.length
      groups.push({ groupId: key, createdAt: order.createdAt, orders: [] })
    }
    groups[groupIndex[key]].orders.push(order)
  }
  

  if (!user) return (
    <div className='min-h-[80vh] flex flex-col items-center justify-center gap-5 mx-6'>
      <Package size={80} className='opacity-20' />
      <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-muted)' }}>Sign in to view your orders</h1>
      <p className='text-sm' style={{ color: 'var(--text-muted)' }}>Your order history will appear here once you sign in.</p>
      <Link href='/' className='px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full font-medium transition'>Go Home</Link>
    </div>
  )

  return (
    <div className='min-h-[70vh] mx-6' style={{ color: 'var(--text-primary)' }}>
      {orders.length > 0 ? (
        <div className='my-12 max-w-5xl mx-auto'>
          <PageTitle heading='My Orders' text={`${orders.length} order${orders.length !== 1 ? 's' : ''} placed`} path='/' linkText='Go to home' />

          <div className='flex flex-col gap-5 mt-4'>
            {groups.map(group => {
              const isSingle = group.orders.length === 1
              const groupTotal = group.orders.reduce((s, o) => s + o.total, 0)
              const itemCount = group.orders.reduce((s, o) => s + o.orderItems.length, 0)
              const groupIsExpanded = isSingle ? true : !!expandedGroups[group.groupId]

              return (
                <div key={group.groupId}
                  className={isSingle ? '' : 'rounded-2xl border overflow-hidden'}
                  style={isSingle ? {} : { borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                  {/* Outer "one purchase" header — only shown with real chrome for multi-store purchases */}
                  {!isSingle && (
                    <div className='flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b'
                      style={{ borderColor: 'var(--border-color)' }}>
                      <div>
                        <p className='text-sm font-semibold'>Purchase · {new Date(group.createdAt).toDateString()}</p>
                        <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>
                          {group.orders.length} store{group.orders.length !== 1 ? 's' : ''} · {itemCount} item{itemCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className='flex items-center gap-3'>
                        <span className='text-sm font-semibold text-green-500'>
                          {process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'}{groupTotal}
                        </span>
                        <button onClick={() => toggleExpandGroup(group.groupId)} className='p-1 rounded-lg transition hover:opacity-70' style={{ color: 'var(--text-muted)' }}>
                          {groupIsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {groupIsExpanded && (
                    <div className={isSingle ? 'flex flex-col gap-5' : 'flex flex-col gap-4 p-4'}>
                      {group.orders.map(order => (
                        <div key={order.id} className='rounded-2xl border overflow-hidden' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                          {/* Order header */}
                          <div className='flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b' style={{ borderColor: 'var(--border-color)' }}>
                            <div>
                              <p className='text-xs font-mono' style={{ color: 'var(--text-muted)' }}>Order #{order.id.slice(-10).toUpperCase()}</p>
                              <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>{new Date(order.createdAt).toDateString()}</p>
                            </div>
                            <div className='flex items-center gap-3'>
                              <span className='text-sm font-semibold text-green-500'>
                                {process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'}{order.total}
                              </span>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                order.status === 'DELIVERED' ? 'bg-green-100 text-green-700'
                                : order.status === 'CANCELLED' || order.status === 'REFUNDED' ? 'bg-red-100 text-red-600'
                                : order.status === 'SHIPPED' || order.status === 'OUT_FOR_DELIVERY' ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-slate-100 text-slate-600'
                              }`}>
                                {order.status?.replace(/_/g, ' ')}
                              </span>
                              <button onClick={() => toggleExpand(order.id)} className='p-1 rounded-lg transition hover:opacity-70' style={{ color: 'var(--text-muted)' }}>
                                {expanded[order.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>

                          {/* Order timeline */}
                          <div className='px-5 pt-4'>
                            <OrderTimeline order={order} />
                          </div>

                          {/* Expandable order items */}
                          {expanded[order.id] && (
                            <div className='px-5 pb-4'>
                              <table className='w-full text-sm mt-2' style={{ color: 'var(--text-secondary)' }}>
                                <thead>
                                  <tr className='border-b text-xs font-medium' style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                                    <th className='text-left pb-2'>Product</th>
                                    <th className='text-center pb-2 max-md:hidden'>Total</th>
                                    <th className='text-left pb-2 max-md:hidden'>Delivery Address</th>
                                    <th className='text-center pb-2'></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <OrderItem order={order} onStatusChange={handleStatusChange} />
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className='min-h-[80vh] flex flex-col items-center justify-center gap-5'>
          <Package size={80} className='opacity-20' />
          <h1 className='text-2xl sm:text-3xl font-semibold' style={{ color: 'var(--text-muted)' }}>No orders yet</h1>
          <p className='text-sm' style={{ color: 'var(--text-muted)' }}>Your order history will appear here once you make a purchase.</p>
          <Link href='/shop' className='px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium transition'>
            Start Shopping
          </Link>
        </div>
      )}
    </div>
  )
}