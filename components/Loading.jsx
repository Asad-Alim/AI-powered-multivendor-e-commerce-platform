export default function Loading() {
  return (
    <div className='flex items-center justify-center h-screen' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className='flex flex-col items-center gap-4'>
        <div className='relative size-12'>
          <div className='absolute inset-0 rounded-full border-4 border-green-100' />
          <div className='absolute inset-0 rounded-full border-4 border-t-green-500 animate-spin' />
        </div>
        <p className='text-sm font-medium' style={{ color: 'var(--text-muted)' }}>Loading IntelliMart…</p>
      </div>
    </div>
  )
}
