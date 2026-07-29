import AdminLayout from '@/components/admin/AdminLayout'

export const metadata = {
  title: 'IntelliMart — Admin Dashboard',
  description: 'Admin dashboard for IntelliMart. Built by Asad.',
}

export default function RootAdminLayout({ children }) {
  return <AdminLayout>{children}</AdminLayout>
}
