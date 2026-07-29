'use client'
import { X } from "lucide-react"
import { useState } from "react"
import { useAddresses, useAuth } from "@/context/AppContext"
import toast from "react-hot-toast"

export default function AddressModal({ setShowAddressModal }) {
  const { addAddress } = useAddresses()
  const { user, authFetch } = useAuth()

  const [address, setAddress] = useState({ name: '', email: '', street: '', city: '', state: '', zip: '', country: '', phone: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = e => setAddress(a => ({ ...a, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (user) {
        const res = await authFetch('/api/address', { method: 'POST', body: JSON.stringify(address) })
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        addAddress(data.data.address)
      } else {
        // Guest: just add locally with temp id
        addAddress({ ...address, id: `local_${Date.now()}` })
      }
      toast.success('Address saved!')
      setShowAddressModal(false)
    } catch (err) {
      toast.error(err.message || 'Failed to save address')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full p-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-green-400 transition"
  const inputStyle = { backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => setShowAddressModal(false)}>
      <div className="w-full max-w-md rounded-2xl p-7 shadow-2xl relative" style={{ backgroundColor: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
        <button onClick={() => setShowAddressModal(false)} className="absolute top-4 right-4 hover:text-red-500 transition" style={{ color: 'var(--text-secondary)' }}>
          <X size={20} />
        </button>
        <h2 className="text-2xl font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Add New <span className="text-green-500">Address</span></h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input name="name" value={address.name} onChange={handleChange} placeholder="Full name" className={inputClass} style={inputStyle} required maxLength={80} />
          <input name="email" type="email" value={address.email} onChange={handleChange} placeholder="Email address" className={inputClass} style={inputStyle} required maxLength={100} />
          <input name="street" value={address.street} onChange={handleChange} placeholder="Street address" className={inputClass} style={inputStyle} required maxLength={150} />
          <div className="flex gap-3">
            <input name="city" value={address.city} onChange={handleChange} placeholder="City" className={inputClass} style={inputStyle} required maxLength={60} />
            <input name="state" value={address.state} onChange={handleChange} placeholder="State" className={inputClass} style={inputStyle} required maxLength={60} />
          </div>
          <div className="flex gap-3">
            <input name="zip" value={address.zip} onChange={handleChange} placeholder="ZIP code" className={inputClass} style={inputStyle} required maxLength={20} />
            <input name="country" value={address.country} onChange={handleChange} placeholder="Country" className={inputClass} style={inputStyle} required maxLength={60} />
          </div>
          <input name="phone" value={address.phone} onChange={handleChange} placeholder="Phone number" className={inputClass} style={inputStyle} required maxLength={20} />
          <button type="submit" disabled={loading} className="w-full py-3 mt-1 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 active:scale-95 transition disabled:opacity-60">
            {loading ? 'Saving…' : 'Save Address'}
          </button>
        </form>
      </div>
    </div>
  )
}
