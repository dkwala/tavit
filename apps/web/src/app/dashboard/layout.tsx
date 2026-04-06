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

  const { data: member } = await supabase
    .from('company_members')
    .select('company:companies(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const company     = member?.company as unknown as { name: string } | null
  const companyName = company?.name ?? 'My Company'

  return (
    <div style={{ minHeight: '100vh', background: '#f2f3eb', fontFamily: 'var(--font-geist-sans, sans-serif)', display: 'flex' }}>
      <Sidebar email={user.email ?? ''} companyName={companyName} />
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
