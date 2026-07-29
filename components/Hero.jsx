'use client'
import { assets } from '@/assets/assets'
import { ArrowRight, ChevronRight, ShoppingBag, Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import CategoriesMarquee from './CategoriesMarquee'
import { useCart } from '@/context/AppContext'

export default function Hero() {
  const { currency } = useCart()

  return (
    <div className='mx-6'>
      <div className='flex max-xl:flex-col gap-6 max-w-7xl mx-auto my-10'>

        {/* Main hero card */}
        <div className='relative flex-1 flex flex-col rounded-3xl xl:min-h-96 group overflow-hidden'
          style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 60%, #6ee7b7 100%)' }}>
          <div className='p-6 sm:p-14 z-10'>
            <div className='inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm text-green-700 pr-4 p-1 rounded-full text-xs sm:text-sm font-medium mb-4'>
              <span className='bg-green-600 px-3 py-1 rounded-full text-white text-xs'>NEW</span>
              Free Shipping on Orders Above {currency}50!
              <ChevronRight size={14} className='group-hover:translate-x-1 transition-transform' />
            </div>
            <h2 className='text-3xl sm:text-5xl leading-tight font-bold bg-gradient-to-br from-slate-800 via-slate-700 to-green-600 bg-clip-text text-transparent max-w-sm sm:max-w-md'>
              Gadgets you'll love. Prices you'll trust.
            </h2>
            <p className='text-slate-600 text-sm mt-4 max-w-xs'>Discover the best electronics from top-rated vendors across IntelliMart.</p>
            <div className='mt-5 sm:mt-8'>
              <p className='text-slate-600 text-sm'>Starts from</p>
              <p className='text-3xl font-bold text-slate-800'>{currency}4.90</p>
            </div>
            <div className='flex items-center gap-3 mt-6 sm:mt-10'>
              <Link href='/shop' className='flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm py-3 px-8 rounded-xl active:scale-95 transition font-medium'>
                <ShoppingBag size={15} /> Shop Now
              </Link>
              <Link href='/shop' className='flex items-center gap-2 text-slate-700 hover:text-green-600 text-sm font-medium transition'>
                Explore all <ArrowRight size={14} className='group-hover:translate-x-1 transition-transform' />
              </Link>
            </div>
          </div>
          <Image className='sm:absolute bottom-0 right-0 md:right-6 w-full sm:max-w-xs opacity-90' src={assets.hero_model_img} alt='Hero model' />
        </div>

        {/* Side cards */}
        <div className='flex flex-col md:flex-row xl:flex-col gap-5 w-full xl:max-w-xs'>
          <Link href='/shop?category=Headphones' className='flex-1 flex items-center justify-between w-full rounded-3xl p-6 px-7 group hover:scale-[1.02] transition-transform'
            style={{ background: 'linear-gradient(135deg, #fed7aa, #fdba74)' }}>
            <div>
              <p className='text-2xl font-bold bg-gradient-to-r from-slate-800 to-orange-600 bg-clip-text text-transparent max-w-36'>Best Products</p>
              <p className='flex items-center gap-1 mt-3 text-sm text-slate-600'>
                View more <ArrowRight size={14} className='group-hover:translate-x-1 transition-transform' />
              </p>
            </div>
            <Image className='w-28' src={assets.hero_product_img1} alt='Best products' />
          </Link>
          <Link href='/pricing' className='flex-1 flex items-center justify-between w-full rounded-3xl p-6 px-7 group hover:scale-[1.02] transition-transform'
            style={{ background: 'linear-gradient(135deg, #bfdbfe, #93c5fd)' }}>
            <div>
              <p className='text-2xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent max-w-36'>20% Discounts</p>
              <p className='flex items-center gap-1 mt-3 text-sm text-slate-600'>
                <Zap size={13} /> Get Plus Plan
              </p>
            </div>
            <Image className='w-28' src={assets.hero_product_img2} alt='Discounts' />
          </Link>
        </div>
      </div>
      <CategoriesMarquee />
    </div>
  )
}
