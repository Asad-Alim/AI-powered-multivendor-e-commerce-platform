'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from '@/context/ThemeContext'

export default function OrdersAreaChart({ allOrders }) {
  const { isDark } = useTheme()

  const ordersPerDay = allOrders.reduce((acc, order) => {
    const date = new Date(order.createdAt).toISOString().split('T')[0]
    if (!acc[date]) acc[date] = { date, orders: 0, revenue: 0 }
    acc[date].orders += 1
    acc[date].revenue += order.total || 0
    return acc
  }, {})

  const chartData = Object.values(ordersPerDay).sort((a, b) => a.date.localeCompare(b.date))

  const gridColor = isDark ? '#334155' : '#e2e8f0'
  const textColor = isDark ? '#94a3b8' : '#64748b'

  return (
    <div className='w-full max-w-4xl'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-base font-medium' style={{ color: 'var(--text-secondary)' }}>
          Orders &amp; Revenue <span style={{ color: 'var(--text-primary)' }}>/ Day</span>
        </h3>
        <span className='text-xs px-3 py-1 rounded-full' style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
          {chartData.length} days
        </span>
      </div>
      <div className='rounded-2xl p-4 border' style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <ResponsiveContainer width='100%' height={280}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id='ordersGrad' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='#6366f1' stopOpacity={0.3} />
                <stop offset='95%' stopColor='#6366f1' stopOpacity={0} />
              </linearGradient>
              <linearGradient id='revenueGrad' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='#22c55e' stopOpacity={0.3} />
                <stop offset='95%' stopColor='#22c55e' stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' stroke={gridColor} />
            <XAxis dataKey='date' tick={{ fill: textColor, fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fill: textColor, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${gridColor}`, borderRadius: 12, color: isDark ? '#f1f5f9' : '#1e293b', fontSize: 12 }}
              labelStyle={{ color: isDark ? '#94a3b8' : '#64748b', marginBottom: 4 }}
            />
            <Area type='monotone' dataKey='orders' name='Orders' stroke='#6366f1' fill='url(#ordersGrad)' strokeWidth={2} dot={false} />
            <Area type='monotone' dataKey='revenue' name='Revenue ($)' stroke='#22c55e' fill='url(#revenueGrad)' strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
