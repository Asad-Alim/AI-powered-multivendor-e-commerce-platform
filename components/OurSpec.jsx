import { ourSpecsData } from '@/assets/assets'

export default function OurSpecs() {
  return (
    <div className='px-6 my-20 max-w-6xl mx-auto'>
      <div className='flex flex-col items-center mb-16'>
        <h2 className='text-2xl font-semibold' style={{ color: 'var(--text-primary)' }}>Why Choose IntelliMart</h2>
        <p className='text-sm mt-2 text-center max-w-lg' style={{ color: 'var(--text-secondary)' }}>
          We offer top-tier service and convenience to ensure your shopping experience is smooth, secure, and completely hassle-free.
        </p>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-8 mt-4'>
        {ourSpecsData.map((spec, i) => (
          <div key={i} className='relative flex flex-col items-center text-center px-8 py-10 rounded-2xl border group hover:shadow-md transition-shadow'
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className='absolute -top-5 size-10 flex items-center justify-center rounded-xl text-white shadow-md group-hover:scale-110 transition-transform'
              style={{ backgroundColor: spec.accent }}>
              <spec.icon size={20} />
            </div>
            <h3 className='font-semibold mt-3' style={{ color: 'var(--text-primary)' }}>{spec.title}</h3>
            <p className='text-sm mt-3 leading-relaxed' style={{ color: 'var(--text-secondary)' }}>{spec.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
