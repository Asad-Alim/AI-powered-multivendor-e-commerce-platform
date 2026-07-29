'use client'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function PageTitle({ heading, text, path = '/', linkText }) {
  return (
    <div className='my-6'>
      <h2 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>{heading}</h2>
      <div className='flex items-center gap-3 mt-1'>
        <p className='text-sm' style={{ color: 'var(--text-secondary)' }}>{text}</p>
        {linkText && (
          <Link href={path} className='flex items-center gap-1 text-green-500 hover:text-green-600 text-sm font-medium transition'>
            {linkText} <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </div>
  )
}
