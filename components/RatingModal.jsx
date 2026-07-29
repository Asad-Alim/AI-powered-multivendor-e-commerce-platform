'use client'
import { Star, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth, useRatings } from '@/context/AppContext'
import toast from 'react-hot-toast'

export default function RatingModal({ ratingModal, setRatingModal }) {
  const { authFetch, user } = useAuth()
  const { addRating } = useRatings()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [review, setReview] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!user) { toast.error('Please login to submit a review'); return }
    if (rating === 0) { toast.error('Please select a star rating'); return }
    if (review.trim().length < 5) { toast.error('Please write at least 5 characters'); return }
    setLoading(true)
    try {
      const res = await authFetch('/api/ratings', {
        method: 'POST',
        body: JSON.stringify({ ...ratingModal, rating, review: review.trim() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      addRating({ ...ratingModal, rating, review, id: data.data?.id || Date.now() })
      toast.success('Review submitted!')
      setRatingModal(null)
    } catch (err) {
      toast.error(err.message || 'Failed to submit review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl p-7 shadow-2xl relative" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <button onClick={() => setRatingModal(null)} className="absolute top-4 right-4 hover:text-red-500 transition" style={{ color: 'var(--text-secondary)' }}>
          <X size={20} />
        </button>
        <h2 className="text-xl font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Rate Product</h2>

        <div className="flex justify-center gap-2 mb-5">
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={32} className="cursor-pointer transition-transform hover:scale-110"
              fill={(hover || rating) >= i ? '#22c55e' : 'transparent'}
              stroke={(hover || rating) >= i ? '#22c55e' : '#d1d5db'}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => setRating(i)} />
          ))}
        </div>

        <div className='relative mb-4'>
          <textarea value={review} onChange={e => setReview(e.target.value)} placeholder="Share your experience…" rows={4} maxLength={500}
            className="w-full p-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-green-400 resize-none"
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          <span className='absolute bottom-2 right-3 text-[11px]' style={{ color: 'var(--text-muted)' }}>
            {review.length}/500
          </span>
        </div>

        <button onClick={() => toast.promise(handleSubmit(), { loading: 'Submitting…', success: ' ', error: ' ' })} disabled={loading}
          className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition disabled:opacity-60">
          Submit Review
        </button>
      </div>
    </div>
  )
}
