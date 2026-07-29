'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AppContext'
import { useRouter, useParams } from 'next/navigation'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'
import { Upload, X, CheckCircle, ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = ['Electronics','Clothing','Home & Kitchen','Beauty & Health','Toys & Games','Sports & Outdoors','Books & Media','Food & Drink','Hobbies & Crafts','Decoration','Camera','Watch','Speakers','Headphones','Others']

export default function StoreEditProduct() {
  const { authFetch } = useAuth()
  const router = useRouter()
  const { productId } = useParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  // Existing product images (URLs from server)
  const [existingImages, setExistingImages] = useState([]) // string[]
  // New image files to upload
  const [newImages, setNewImages] = useState({ 1: null, 2: null, 3: null, 4: null })

  const [info, setInfo] = useState({
    name: '', description: '', mrp: '', price: '', category: '', stockCount: '', inStock: true
  })

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res  = await authFetch(`/api/products/${productId}`)
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Product not found')
        const p = data.data.product
        setInfo({
          name: p.name, description: p.description,
          mrp: p.mrp, price: p.price,
          category: p.category, stockCount: p.stockCount,
          inStock: p.inStock,
        })
        setExistingImages(p.images || [])
      } catch (err) {
        toast.error(err.message || 'Failed to load product')
        router.push('/store/manage-product')
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [productId])

  const onChange = e => {
    const { name, value, type, checked } = e.target
    setInfo(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const removeExistingImage = (url) => setExistingImages(prev => prev.filter(u => u !== url))

  const uploadImage = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const res  = await fetch('/api/upload/image', { method: 'POST', body: fd })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Upload failed')
    return data.data.url
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (parseFloat(info.price) > parseFloat(info.mrp)) {
      toast.error('Sale price cannot exceed MRP'); return
    }
    const hasImage = existingImages.length > 0 || Object.values(newImages).some(Boolean)
    if (!hasImage) { toast.error('Please add at least one product image'); return }

    setSaving(true)
    try {
      // Upload any new image files
      const uploadedUrls = await Promise.all(
        Object.values(newImages).filter(Boolean).map(uploadImage)
      )
      const allImages = [...existingImages, ...uploadedUrls]

      const res  = await authFetch(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: info.name,
          description: info.description,
          mrp: parseFloat(info.mrp),
          price: parseFloat(info.price),
          category: info.category,
          stockCount: parseInt(info.stockCount),
          inStock: info.inStock,
          images: allImages,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      toast.success('Product updated successfully!')
      router.push('/store/manage-product')
    } catch (err) {
      toast.error(err.message || 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const inp   = 'w-full p-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-green-400 transition'
  const inpSt = { backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }
  const lbl   = 'block text-sm font-medium mb-1.5'

  if (loading) return <Loading />

  return (
    <div className='max-w-2xl mb-20' style={{ color: 'var(--text-secondary)' }}>
      <div className='flex items-center gap-3 mb-8'>
        <Link href='/store/manage-product' className='p-2 rounded-xl hover:opacity-70 transition' style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>
          Edit <span className='text-green-500'>Product</span>
        </h1>
      </div>

      <form onSubmit={handleSubmit} className='flex flex-col gap-5'>

        {/* ── Existing Images ── */}
        <div>
          <p className={lbl}>Current Images</p>
          {existingImages.length > 0 ? (
            <div className='flex gap-3 flex-wrap mb-3'>
              {existingImages.map((url, i) => (
                <div key={i} className='relative group size-24'>
                  <div className='size-24 rounded-2xl border overflow-hidden' style={{ borderColor: 'var(--border-color)' }}>
                    <img src={url} alt='' className='w-full h-full object-cover' />
                  </div>
                  <button type='button' onClick={() => removeExistingImage(url)}
                    className='absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md'>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-xs mb-3' style={{ color: 'var(--text-muted)' }}>No existing images — please add new ones below.</p>
          )}

          {/* Upload new images */}
          <p className={lbl}>Add New Images <span className='text-xs font-normal' style={{ color: 'var(--text-muted)' }}>(optional — adds to existing)</span></p>
          <div className='flex gap-3 flex-wrap'>
            {Object.keys(newImages).map(key => (
              <label key={key} htmlFor={`newimg${key}`} className='relative cursor-pointer group'>
                <div className='size-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all hover:border-green-400 hover:scale-105'
                  style={{ borderColor: newImages[key] ? '#22c55e' : 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                  {newImages[key] ? (
                    <Image src={URL.createObjectURL(newImages[key])} alt='' fill className='object-cover rounded-2xl' />
                  ) : (
                    <div className='flex flex-col items-center gap-1'>
                      <Upload size={18} style={{ color: 'var(--text-muted)' }} />
                      <span className='text-[10px]' style={{ color: 'var(--text-muted)' }}>Add photo</span>
                    </div>
                  )}
                </div>
                {newImages[key] && (
                  <button type='button'
                    onClick={e => { e.preventDefault(); setNewImages(p => ({ ...p, [key]: null })) }}
                    className='absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md'>
                    <X size={11} />
                  </button>
                )}
                <input id={`newimg${key}`} type='file' accept='image/*' hidden
                  onChange={e => setNewImages(p => ({ ...p, [key]: e.target.files[0] }))} />
              </label>
            ))}
          </div>
        </div>

        {/* ── Product Name ── */}
        <div>
          <label className={lbl}>Product Name</label>
          <input name='name' value={info.name} onChange={onChange}
            placeholder='e.g. Wireless Headphones Pro Max' className={inp} style={inpSt} required maxLength={120} />
        </div>

        {/* ── Description ── */}
        <div>
          <label className={lbl}>Description</label>
          <textarea name='description' value={info.description} onChange={onChange}
            placeholder='Describe your product…' rows={5} className={`${inp} resize-none`} style={inpSt} required maxLength={2000} />
        </div>

        {/* ── Pricing & Stock ── */}
        <div className='grid grid-cols-3 gap-4'>
          <div>
            <label className={lbl}>MRP ($)</label>
            <input type='number' name='mrp' value={info.mrp} onChange={onChange}
              placeholder='0.00' min='0.01' step='0.01' className={inp} style={inpSt} required />
          </div>
          <div>
            <label className={lbl}>Sale Price ($)</label>
            <input type='number' name='price' value={info.price} onChange={onChange}
              placeholder='0.00' min='0.01' step='0.01' className={inp} style={inpSt} required />
          </div>
          <div>
            <label className={lbl}>Stock</label>
            <input type='number' name='stockCount' value={info.stockCount} onChange={onChange}
              placeholder='100' min='0' className={inp} style={inpSt} required />
          </div>
        </div>

        {/* Discount preview */}
        {info.mrp && info.price && parseFloat(info.price) < parseFloat(info.mrp) && parseFloat(info.mrp) > 0 && (
          <div className='px-4 py-3 rounded-xl flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm'>
            <CheckCircle size={15} />
            Customers save <strong>{Math.round((1 - info.price / info.mrp) * 100)}%</strong> — great deal!
          </div>
        )}

        {/* ── Category ── */}
        <div>
          <label className={lbl}>Category</label>
          <select name='category' value={info.category} onChange={onChange} className={inp} style={inpSt} required>
            <option value=''>Select a category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* ── In Stock toggle ── */}
        <label className='flex items-center gap-3 cursor-pointer'>
          <div className={`relative size-11 w-11 h-6 rounded-full transition-colors ${info.inStock ? 'bg-green-500' : 'bg-slate-300'}`}>
            <input type='checkbox' name='inStock' checked={info.inStock} onChange={onChange} className='sr-only' />
            <span className={`absolute top-0.5 left-0.5 size-5 bg-white rounded-full shadow transition-transform ${info.inStock ? 'translate-x-5' : ''}`} />
          </div>
          <span className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>
            {info.inStock ? 'In Stock' : 'Out of Stock'}
          </span>
        </label>

        {/* ── Submit ── */}
        <div className='flex gap-3 mt-2'>
          <button type='submit' disabled={saving}
            className='flex items-center gap-2 flex-1 justify-center py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition active:scale-95 disabled:opacity-60'>
            {saving ? 'Saving…' : <><Save size={16} /> Save Changes</>}
          </button>
          <Link href='/store/manage-product'
            className='px-6 py-3.5 rounded-xl border text-sm font-medium transition flex items-center'
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
