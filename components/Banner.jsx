'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { X, Tag } from 'lucide-react'

export default function Banner() {
  const [isOpen, setIsOpen] = useState(true)
  const [couponCode, setCouponCode] = useState('NEW20')
  const [couponDesc, setCouponDesc] = useState('Get 20% OFF on Your First Order!')

  useEffect(() => {
    // Try to fetch a public coupon dynamically
    fetch('/api/coupon/public')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.coupon) {
          setCouponCode(data.data.coupon.code)
          setCouponDesc(data.data.coupon.description)
        }
      })
      .catch(() => {}) // silent fallback to defaults
  }, [])

  const handleClaim = () => {
    navigator.clipboard.writeText(couponCode).catch(() => {})
    toast.success(`Coupon "${couponCode}" copied to clipboard!`)
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className='w-full px-6 py-2 text-sm text-white bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500'>
      <div className='flex items-center justify-between max-w-7xl mx-auto gap-4'>
        <div className='flex items-center gap-2 min-w-0'>
          <Tag size={14} className='shrink-0' />
          <p className='truncate'>{couponDesc}</p>
        </div>
        <div className='flex items-center gap-3 shrink-0'>
          <button onClick={handleClaim}
            className='hidden sm:block font-medium bg-white text-purple-700 px-5 py-1 rounded-full text-xs hover:bg-purple-50 transition active:scale-95'>
            Copy: {couponCode}
          </button>
          <button onClick={() => setIsOpen(false)} className='opacity-80 hover:opacity-100 transition'>
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
