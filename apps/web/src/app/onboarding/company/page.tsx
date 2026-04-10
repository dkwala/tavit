import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CompanyForm from './CompanyForm'

// Step 2 of 2 — Company setup (name, GSTIN, PAN, address).
// Guards:
//   • no session          → /auth/login
//   • has company_member  → /dashboard  (already fully onboarded)
//   • no username set     → /onboarding (step 1 not done yet)
//   • otherwise           → show company form
export default async function CompanyPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Already has a company — fully done
  const { data: member } = await supabase
    .from('company_members')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (member) redirect('/dashboard')

  // Step 1 not done yet — username missing
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.username) redirect('/onboarding')

  return <CompanyForm />
}
