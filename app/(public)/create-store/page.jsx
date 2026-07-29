'use client'
import { assets } from "@/assets/assets"
import { useEffect, useState } from "react"
import Image from "next/image"
import toast from "react-hot-toast"
import Loading from "@/components/Loading"
import { useAuth } from "@/context/AppContext"
import { useRouter } from "next/navigation"
import { CheckCircle, Clock, XCircle } from "lucide-react"

export default function CreateStore() {
  const { user, authFetch } = useAuth()
  const router = useRouter()
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true)

  const [storeInfo, setStoreInfo] = useState({ name: "", username: "", description: "", email: "", contact: "", address: "", image: null })

  const onChange = e => setStoreInfo(s => ({ ...s, [e.target.name]: e.target.value }))

  useEffect(() => {
    const check = async () => {
      try {
        if (user) {
          const res = await authFetch('/api/store/me')
          const data = await res.json()
          // Multi-store: only block the form while a store is PENDING review.
          // If the user's existing stores are all APPROVED/REJECTED, let them
          // submit another application instead of hard-blocking forever.
          const pendingStore = data.data?.stores?.find(s => s.status === 'PENDING')
          if (data.success && pendingStore) {
            setAlreadySubmitted(true)
            setStatus(pendingStore.status)
          }
        }
      } catch { /* no store yet */ }
      finally { setLoading(false) }
    }
    check()
  }, [user])

  

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) { toast.error('Please login first'); return }
    try {
      const res = await authFetch('/api/store', {
        method: 'POST',
        body: JSON.stringify({ ...storeInfo, logo: storeInfo.image ? 'https://placehold.co/200' : 'https://placehold.co/200' }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setAlreadySubmitted(true)
      setStatus('PENDING')
      toast.success('Store application submitted!')
    } catch (err) {
      toast.error(err.message || 'Failed to submit')
    }
  }

  if (loading) return <Loading />

  const inputClass = "border outline-none w-full max-w-lg p-3 rounded-xl text-sm transition focus:ring-2 focus:ring-green-400"
  const inputStyle = { borderColor: 'var(--border-color)', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)' }

  if (alreadySubmitted) {
    const STATUS_UI = {
      PENDING: { icon: Clock, color: '#f59e0b', label: 'Application Under Review', msg: "We've received your store application. Our team will review it within 24–48 hours." },
      APPROVED: { icon: CheckCircle, color: '#22c55e', label: 'Store Approved!', msg: "Congratulations! Your store has been approved. Redirecting to your dashboard…" },
      REJECTED: { icon: XCircle, color: '#ef4444', label: 'Application Rejected', msg: "Unfortunately your application was not approved. Please contact support for details." },
    }
    const ui = STATUS_UI[status] || STATUS_UI.PENDING
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-5 px-6">
        <ui.icon size={64} style={{ color: ui.color }} />
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{ui.label}</h2>
        <p className="text-center max-w-md" style={{ color: 'var(--text-secondary)' }}>{ui.msg}</p>
      </div>
    )
  }

  return (
    <div className="mx-6 min-h-[70vh] my-16">
      <form onSubmit={e => toast.promise(handleSubmit(e), { loading: 'Submitting…', success: 'Submitted!', error: e => e.message })}
        className="max-w-2xl mx-auto flex flex-col gap-5" style={{ color: 'var(--text-secondary)' }}>

        <div className="mb-4">
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>Create Your <span className="text-green-500">Store</span></h1>
          <p className="mt-1 text-sm">Submit your store for review. We'll activate it after verification — usually within 48 hours.</p>
        </div>

        <label className="cursor-pointer">
          <p className="text-sm font-medium mb-2">Store Logo</p>
          <Image src={storeInfo.image ? URL.createObjectURL(storeInfo.image) : assets.upload_area}
            className="rounded-xl h-20 w-auto border-2 border-dashed hover:opacity-80 transition" style={{ borderColor: 'var(--border-color)' }} alt="" width={150} height={100} />
          <input type="file" accept="image/*" onChange={e => setStoreInfo(s => ({ ...s, image: e.target.files[0] }))} hidden />
        </label>

        {[['username','Store Username','text'], ['name','Store Name','text'], ['email','Store Email','email'], ['contact','Contact Number','text']].map(([name, placeholder, type]) => (
          <div key={name}>
            <p className="text-sm font-medium mb-1.5">{placeholder}</p>
            <input name={name} type={type} value={storeInfo[name]} onChange={onChange} placeholder={`Enter ${placeholder.toLowerCase()}`} className={inputClass} style={inputStyle} required maxLength={name === 'username' ? 30 : name === 'contact' ? 20 : 100} />
          </div>
        ))}

        <div>
          <p className="text-sm font-medium mb-1.5">Description</p>
          <textarea name="description" value={storeInfo.description} onChange={onChange} rows={4} placeholder="Describe your store" className={inputClass} style={inputStyle} required maxLength={500} />
        </div>
        <div>
          <p className="text-sm font-medium mb-1.5">Store Address</p>
          <textarea name="address" value={storeInfo.address} onChange={onChange} rows={3} placeholder="Enter full store address" className={inputClass} style={inputStyle} required maxLength={200} />
        </div>

        <button className="mt-4 w-full max-w-lg py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl active:scale-95 transition">
          Submit Application
        </button>
      </form>
    </div>
  )
}
