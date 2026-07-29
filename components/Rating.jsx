import { Star } from 'lucide-react'

export default function Rating({ value = 0 }) {
  return (
    <div className='flex items-center gap-0.5'>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={14} fill={value > i ? '#22c55e' : 'transparent'} stroke={value > i ? '#22c55e' : '#d1d5db'} />
      ))}
    </div>
  )
}
