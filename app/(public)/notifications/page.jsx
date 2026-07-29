'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AppContext'
import PageTitle from '@/components/PageTitle'
import Loading from '@/components/Loading'
import { Bell, BellOff, Check, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const TYPE_ICON = {
  info:    { Icon: Info,          color: '#6366f1' },
  success: { Icon: CheckCircle,   color: '#22c55e' },
  warning: { Icon: AlertTriangle, color: '#f59e0b' },
  error:   { Icon: XCircle,       color: '#ef4444' },
}

export default function NotificationsPage() {
  const { user, authFetch } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [loading, setLoading]             = useState(true)
  const [markingAll, setMarkingAll]       = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!user) { setLoading(false); return }
    try {
      const res  = await authFetch('/api/notifications?limit=50')
      const data = await res.json()
      if (data.success) {
        setNotifications(data.data.notifications)
        setUnreadCount(data.data.unreadCount)
      }
    } catch { /* ignore */ }
    finally  { setLoading(false) }
  }, [user])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const markRead = async (id) => {
    try {
      const res  = await authFetch(`/api/notifications/${id}`, { method: 'PATCH' })
      const data = await res.json()
      if (data.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        setUnreadCount(c => Math.max(0, c - 1))
      }
    } catch { /* ignore */ }
  }

  const deleteNotif = async (id) => {
    try {
      const res  = await authFetch(`/api/notifications/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        const wasUnread = notifications.find(n => n.id === id)?.isRead === false
        setNotifications(prev => prev.filter(n => n.id !== id))
        if (wasUnread) setUnreadCount(c => Math.max(0, c - 1))
        toast.success('Notification removed')
      }
    } catch { toast.error('Failed to delete') }
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      const res  = await authFetch('/api/notifications', { method: 'PATCH' })
      const data = await res.json()
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
        toast.success('All marked as read')
      }
    } catch { toast.error('Failed') }
    finally { setMarkingAll(false) }
  }

  if (loading) return <Loading />

  if (!user) return (
    <div className='min-h-[70vh] flex flex-col items-center justify-center gap-4 mx-6'>
      <BellOff size={60} className='opacity-20' style={{ color: 'var(--text-muted)' }} />
      <h2 className='text-xl font-semibold' style={{ color: 'var(--text-primary)' }}>Sign in to view notifications</h2>
      <Link href='/' className='px-6 py-2.5 bg-indigo-500 text-white rounded-full text-sm font-medium hover:bg-indigo-600 transition'>Go Home</Link>
    </div>
  )

  return (
    <div className='min-h-[70vh] mx-6 my-12'>
      <div className='max-w-3xl mx-auto'>
        <div className='flex items-start justify-between gap-4 mb-8 flex-wrap'>
          <PageTitle heading='Notifications' text={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} path='/' linkText='Go home' />
          {unreadCount > 0 && (
            <button onClick={markAllRead} disabled={markingAll}
              className='flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border transition disabled:opacity-60'
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              <CheckCheck size={15} />
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className='min-h-[50vh] flex flex-col items-center justify-center gap-4'>
            <Bell size={70} className='opacity-10' style={{ color: 'var(--text-muted)' }} />
            <h3 className='text-xl font-semibold' style={{ color: 'var(--text-muted)' }}>No notifications yet</h3>
            <p className='text-sm' style={{ color: 'var(--text-muted)' }}>You're all caught up! Notifications appear here for orders, approvals, and more.</p>
          </div>
        ) : (
          <div className='flex flex-col gap-2'>
            {notifications.map(notif => {
              const { Icon, color } = TYPE_ICON[notif.type] || TYPE_ICON.info
              return (
                <div key={notif.id}
                  className='flex items-start gap-4 p-4 rounded-2xl border transition-all'
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: notif.isRead ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                    opacity: notif.isRead ? 0.8 : 1,
                  }}>
                  {/* Icon */}
                  <div className='size-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'
                    style={{ backgroundColor: `${color}18` }}>
                    <Icon size={18} style={{ color }} />
                  </div>

                  {/* Content */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between gap-2'>
                      <p className='text-sm font-semibold leading-tight' style={{ color: 'var(--text-primary)' }}>{notif.title}</p>
                      {!notif.isRead && (
                        <span className='size-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5' />
                      )}
                    </div>
                    <p className='text-xs mt-1 leading-relaxed' style={{ color: 'var(--text-secondary)' }}>{notif.message}</p>
                    <div className='flex items-center gap-3 mt-2'>
                      <span className='text-[11px]' style={{ color: 'var(--text-muted)' }}>
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                      {notif.link && (
                        <Link href={notif.link} className='text-[11px] text-indigo-500 hover:underline'>View →</Link>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className='flex gap-1 flex-shrink-0'>
                    {!notif.isRead && (
                      <button onClick={() => markRead(notif.id)} title='Mark as read'
                        className='p-1.5 rounded-lg hover:bg-slate-100 transition' style={{ color: 'var(--text-muted)' }}>
                        <Check size={14} />
                      </button>
                    )}
                    <button onClick={() => deleteNotif(notif.id)} title='Delete'
                      className='p-1.5 rounded-lg hover:bg-red-50 transition text-red-400'>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
