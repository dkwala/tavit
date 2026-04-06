import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name')
    .eq('id', user.id)
    .single()

  const companyName = profile?.company_name ?? 'My Company'

  return (
    <div style={{ minHeight: '100vh', background: '#f2f3eb', fontFamily: 'var(--font-geist-sans, sans-serif)', display: 'flex' }}>
      <Sidebar email={user.email ?? ''} companyName={companyName} />
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
