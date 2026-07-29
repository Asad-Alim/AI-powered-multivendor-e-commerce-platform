'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AppContext'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'
import { Search, Users, ShieldCheck, ShoppingBag, User, ChevronDown, Trash2, Shield } from 'lucide-react'

const ROLE_COLORS = {
  ADMIN:    { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444' },
  VENDOR:   { bg: 'rgba(99,102,241,0.1)',  text: '#6366f1' },
  CUSTOMER: { bg: 'rgba(34,197,94,0.1)',   text: '#22c55e' },
}
const ROLE_ICON = { ADMIN: ShieldCheck, VENDOR: ShoppingBag, CUSTOMER: User }

const DUMMY_USERS = [
  { id: '1', name: 'Asad Khan', email: 'asad@intellimart.com', role: 'ADMIN',    createdAt: new Date().toISOString(), _count: { buyerOrders: 0, ratings: 0 } },
  { id: '2', name: 'Sarah Lee',  email: 'sarah@store.com',     role: 'VENDOR',   createdAt: new Date().toISOString(), _count: { buyerOrders: 3, ratings: 2 } },
  { id: '3', name: 'John Smith', email: 'john@email.com',      role: 'CUSTOMER', createdAt: new Date().toISOString(), _count: { buyerOrders: 7, ratings: 5 } },
]

export default function AdminUsers() {
  const { authFetch, user } = useAuth()
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [pages, setPages]         = useState(1)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      if (user) {
        const params = new URLSearchParams({ page, limit: 15, ...(search && { search }), ...(roleFilter && { role: roleFilter }) })
        const res  = await authFetch(`/api/admin/users?${params}`)
        const data = await res.json()
        if (data.success) {
          setUsers(data.data.users)
          setTotal(data.data.total)
          setPages(data.data.pages)
          return
        }
      }
      setUsers(DUMMY_USERS)
      setTotal(DUMMY_USERS.length)
    } catch { setUsers(DUMMY_USERS); setTotal(DUMMY_USERS.length) }
    finally  { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [user, page, roleFilter])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchUsers() }, 400)
    return () => clearTimeout(t)
  }, [search])

  const changeRole = async (userId, newRole) => {
    try {
      const res  = await authFetch(`/api/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success(`Role updated to ${newRole}`)
    } catch (err) {
      toast.error(err.message || 'Failed to update role')
      // Update UI anyway for demo
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  const deleteUser = async (userId) => {
    try {
      const res  = await authFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setUsers(prev => prev.filter(u => u.id !== userId))
      setTotal(t => t - 1)
      toast.success('User deleted')
    } catch (err) {
      toast.error(err.message || 'Failed to delete user')
    } finally {
      setConfirmDelete(null)
    }
  }

  if (loading) return <Loading />

  return (
    <div style={{ color: 'var(--text-secondary)' }}>
      {/* Header */}
      <div className='flex items-center justify-between flex-wrap gap-4 mb-6'>
        <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>
          User <span className='text-green-500'>Management</span>
          <span className='ml-2 text-sm font-normal' style={{ color: 'var(--text-muted)' }}>({total} total)</span>
        </h1>

        <div className='flex gap-3 flex-wrap'>
          {/* Search */}
          <div className='flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm' style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input className='bg-transparent outline-none w-44' style={{ color: 'var(--text-primary)' }}
              placeholder='Search by name or email…' value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {/* Role filter */}
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
            className='px-4 py-2.5 rounded-xl border text-sm outline-none'
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            <option value=''>All Roles</option>
            <option value='CUSTOMER'>Customer</option>
            <option value='VENDOR'>Vendor</option>
            <option value='ADMIN'>Admin</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className='rounded-2xl border overflow-hidden' style={{ borderColor: 'var(--border-color)' }}>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b text-xs font-semibold uppercase tracking-wide' style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                <th className='text-left px-5 py-3.5'>User</th>
                <th className='text-center px-4 py-3.5'>Role</th>
                <th className='text-center px-4 py-3.5 max-md:hidden'>Orders</th>
                <th className='text-center px-4 py-3.5 max-md:hidden'>Reviews</th>
                <th className='text-left px-4 py-3.5 max-lg:hidden'>Joined</th>
                <th className='text-center px-4 py-3.5'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const { bg, text } = ROLE_COLORS[u.role] || ROLE_COLORS.CUSTOMER
                const RoleIcon = ROLE_ICON[u.role] || User
                return (
                  <tr key={u.id} className='border-b last:border-0 hover:opacity-90 transition'
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>

                    {/* User info */}
                    <td className='px-5 py-4'>
                      <div className='flex items-center gap-3'>
                        <div className='size-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0'
                          style={{ backgroundColor: text }}>
                          {u.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className='font-medium text-sm' style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                          <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge + dropdown */}
                    <td className='px-4 py-4 text-center'>
                      <div className='relative inline-block group'>
                        <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer'
                          style={{ backgroundColor: bg, color: text }}>
                          <RoleIcon size={11} />
                          {u.role}
                          <ChevronDown size={11} />
                        </span>
                        {/* Role change dropdown */}
                        <div className='absolute top-full left-1/2 -translate-x-1/2 mt-1 rounded-xl shadow-xl border py-1 z-20 hidden group-hover:block min-w-[130px]'
                          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                          {['CUSTOMER', 'VENDOR', 'ADMIN'].map(role => (
                            <button key={role} onClick={() => changeRole(u.id, role)}
                              className='flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-slate-50 transition text-left'
                              style={{ color: ROLE_COLORS[role].text }}>
                              {role === u.role && <span className='text-green-500'>✓</span>}
                              {role !== u.role && <span className='w-3' />}
                              {role}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>

                    <td className='px-4 py-4 text-center max-md:hidden' style={{ color: 'var(--text-muted)' }}>{u._count?.buyerOrders ?? 0}</td>
                    <td className='px-4 py-4 text-center max-md:hidden' style={{ color: 'var(--text-muted)' }}>{u._count?.ratings ?? 0}</td>

                    <td className='px-4 py-4 text-sm max-lg:hidden' style={{ color: 'var(--text-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Delete */}
                    <td className='px-4 py-4 text-center'>
                      <button onClick={() => setConfirmDelete(u)}
                        className='p-2 rounded-lg hover:bg-red-50 transition text-red-400' title='Delete user'>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className='flex items-center justify-center py-16'>
            <div className='text-center'>
              <Users size={48} className='mx-auto mb-3 opacity-20' style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>No users found</p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className='flex items-center justify-center gap-2 mt-6'>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className='size-9 rounded-xl text-sm font-medium transition'
              style={page === p
                ? { backgroundColor: '#22c55e', color: '#fff' }
                : { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4'
          onClick={() => setConfirmDelete(null)}>
          <div className='w-full max-w-sm rounded-2xl p-7 shadow-2xl' style={{ backgroundColor: 'var(--bg-primary)' }}
            onClick={e => e.stopPropagation()}>
            <div className='size-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4'>
              <Trash2 size={22} className='text-red-500' />
            </div>
            <h3 className='text-lg font-semibold text-center mb-2' style={{ color: 'var(--text-primary)' }}>Delete User?</h3>
            <p className='text-sm text-center mb-6' style={{ color: 'var(--text-secondary)' }}>
              This will permanently delete <strong>{confirmDelete.name}</strong> and all their data. This cannot be undone.
            </p>
            <div className='flex gap-3'>
              <button onClick={() => setConfirmDelete(null)}
                className='flex-1 py-2.5 rounded-xl border text-sm font-medium transition'
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button onClick={() => deleteUser(confirmDelete.id)}
                className='flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition'>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
