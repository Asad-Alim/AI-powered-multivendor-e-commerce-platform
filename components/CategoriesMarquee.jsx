'use client'
import { useProducts } from '@/context/AppContext'
import { useTheme } from '@/context/ThemeContext'
import { useRouter } from 'next/navigation'

export default function CategoriesMarquee() {
  const { products } = useProducts()
  const { isDark }   = useTheme()
  const router = useRouter()

  const defaultCats = ['Headphones', 'Speakers', 'Watch', 'Earbuds', 'Mouse', 'Decoration', 'Camera', 'Laptop']
  const productCats = [...new Set(products.map(p => p.category))]
  const allCats     = [...new Set([...defaultCats, ...productCats])]
  const doubled     = [...allCats, ...allCats]

  // Match the bg-primary CSS variable values
  const fadeBg = isDark ? '#0f172a' : '#ffffff'

  return (
    <div className='overflow-hidden w-full relative max-w-7xl mx-auto select-none group sm:my-16'>
      {/* Left fade */}
      <div className='absolute left-0 top-0 h-full w-20 z-10 pointer-events-none'
        style={{ background: `linear-gradient(to right, ${fadeBg}, transparent)` }} />

      <div className='flex min-w-[200%] animate-[marqueeScroll_35s_linear_infinite] group-hover:[animation-play-state:paused] gap-3'>
        {doubled.map((cat, i) => (
          <button key={i} onClick={() => router.push(`/shop?category=${cat}`)}
            className='px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 whitespace-nowrap'
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Right fade */}
      <div className='absolute right-0 top-0 h-full w-20 md:w-36 z-10 pointer-events-none'
        style={{ background: `linear-gradient(to left, ${fadeBg}, transparent)` }} />
    </div>
  )
}
