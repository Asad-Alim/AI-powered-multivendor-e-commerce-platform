'use client'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function Title({ title, description, visibleButton = true, href = '' }) {
  return (
    <div className='flex flex-col items-center text-center'>
      <h2 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <div className='flex items-center gap-4 text-sm mt-2'>
        <p className='max-w-lg' style={{ color: 'var(--text-secondary)' }}>{description}</p>
        {visibleButton && href && (
          <Link href={href} className='flex items-center gap-1 text-green-500 hover:text-green-600 transition shrink-0 font-medium'>
            View more <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </div>
  )
}
