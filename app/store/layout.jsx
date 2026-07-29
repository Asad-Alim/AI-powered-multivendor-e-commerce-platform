import StoreLayout from '@/components/store/StoreLayout'

export const metadata = {
  title: 'IntelliMart — Store Dashboard',
  description: 'Seller dashboard for IntelliMart. Built by Asad.',
}

export default function RootStoreLayout({ children }) {
  return <StoreLayout>{children}</StoreLayout>
}
