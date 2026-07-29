'use client'
import Image from 'next/image'
import { useState } from 'react'
import { useAuth } from '@/context/AppContext'
import { useStore } from '@/context/StoreContext'
import toast from 'react-hot-toast'
import { Upload, X, CheckCircle } from 'lucide-react'

const CATEGORIES = ['Electronics','Clothing','Home & Kitchen','Beauty & Health','Toys & Games','Sports & Outdoors','Books & Media','Food & Drink','Hobbies & Crafts','Decoration','Camera','Watch','Speakers','Headphones','Others']
const EMPTY = { name: '', description: '', mrp: '', price: '', category: '', stockCount: '100' }

export default function StoreAddProduct() {
  const { authFetch } = useAuth()
  const { activeStoreId } = useStore()
  const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
  const [info, setInfo]   = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const onChange = e => setInfo(p => ({ ...p, [e.target.name]: e.target.value }))

  const uploadImage = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload/image', { method: 'POST', body: fd })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Upload failed')
    return data.data.url
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (parseFloat(info.price) > parseFloat(info.mrp)) { toast.error('Offer price cannot exceed MRP'); return }

    const hasImage = Object.values(images).some(Boolean)
    if (!hasImage) { toast.error('Please add at least one product image'); return }

    setLoading(true)
    try {
      // Upload all images in parallel
      const uploadPromises = Object.values(images)
        .filter(Boolean)
        .map(file => uploadImage(file))

      const imageUrls = await Promise.all(uploadPromises)

      const res = await authFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          ...info,
          storeId: activeStoreId,
          mrp: parseFloat(info.mrp),
          price: parseFloat(info.price),
          stockCount: parseInt(info.stockCount),
          images: imageUrls,
        }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setSuccess(true)
      setInfo(EMPTY)
      setImages({ 1: null, 2: null, 3: null, 4: null })
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      toast.error(err.message || 'Failed to add product')
    } finally {
      setLoading(false)
    }
  }

  const inp   = 'w-full p-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-green-400 transition'
  const inpSt = { backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }
  const lbl   = 'block text-sm font-medium mb-1.5'

  return (
    <form onSubmit={e => toast.promise(handleSubmit(e), { loading: 'Adding product…', success: ' ', error: e => e.message })}
      className='max-w-2xl mb-20' style={{ color: 'var(--text-secondary)' }}>

      <h1 className='text-2xl font-semibold mb-8' style={{ color: 'var(--text-primary)' }}>
        Add New <span className='text-green-500'>Product</span>
      </h1>

      {success && (
        <div className='flex items-center gap-3 p-4 rounded-xl bg-green-50 text-green-700 mb-6 border border-green-200'>
          <CheckCircle size={18} />
          <p className='text-sm font-medium'>Product added successfully! It's now live in your store.</p>
        </div>
      )}

      {/* Image Upload */}
      <div className='mb-6'>
        <p className={lbl}>Product Images <span className='text-xs font-normal' style={{ color: 'var(--text-muted)' }}>(up to 4 — first image is the main one)</span></p>
        <div className='flex gap-3 flex-wrap'>
          {Object.keys(images).map(key => (
            <label key={key} htmlFor={`img${key}`} className='relative cursor-pointer group'>
              <div className='size-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all hover:border-green-400 hover:scale-105'
                style={{ borderColor: images[key] ? '#22c55e' : 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                {images[key] ? (
                  <Image src={URL.createObjectURL(images[key])} alt='' fill className='object-cover rounded-2xl' />
                ) : (
                  <div className='flex flex-col items-center gap-1'>
                    <Upload size={18} style={{ color: 'var(--text-muted)' }} />
                    <span className='text-[10px]' style={{ color: 'var(--text-muted)' }}>Add photo</span>
                  </div>
                )}
              </div>
              {images[key] && (
                <button type='button'
                  onClick={e => { e.preventDefault(); setImages(p => ({ ...p, [key]: null })) }}
                  className='absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md'>
                  <X size={11} />
                </button>
              )}
              <input id={`img${key}`} type='file' accept='image/*' hidden
                onChange={e => setImages(p => ({ ...p, [key]: e.target.files[0] }))} />
            </label>
          ))}
        </div>
      </div>

      <div className='flex flex-col gap-5'>
        <div>
          <label className={lbl}>Product Name</label>
          <input name='name' value={info.name} onChange={onChange} placeholder='e.g. Wireless Headphones Pro Max' className={inp} style={inpSt} required maxLength={120} />
        </div>

        <div>
          <label className={lbl}>Description</label>
          <textarea name='description' value={info.description} onChange={onChange}
            placeholder='Describe your product — materials, features, what makes it great…'
            rows={5} className={`${inp} resize-none`} style={inpSt} required maxLength={2000} />
        </div>

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
              placeholder='100' min='1' className={inp} style={inpSt} required />
          </div>
        </div>

        {/* Discount preview */}
        {info.mrp && info.price && parseFloat(info.price) < parseFloat(info.mrp) && parseFloat(info.mrp) > 0 && (
          <div className='px-4 py-3 rounded-xl flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm'>
            <CheckCircle size={15} />
            Customers save <strong>{Math.round((1 - info.price / info.mrp) * 100)}%</strong> — great deal!
          </div>
        )}

        <div>
          <label className={lbl}>Category</label>
          <select name='category' value={info.category} onChange={onChange} className={inp} style={inpSt} required>
            <option value=''>Select a category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button type='submit' disabled={loading}
          className='py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition active:scale-95 disabled:opacity-60 mt-2'>
          {loading ? 'Uploading & Adding…' : 'Add Product to Store'}
        </button>
      </div>
    </form>
  )
}
