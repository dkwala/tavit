import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingForm from './OnboardingForm'

// Server component — single source of truth for "is the user already set up?".
// Redirecting here (not in middleware) prevents the infinite loop that occurs
// when profiles.onboarded=true but company_members is missing (partial-failure
// state): middleware used to redirect /onboarding → /dashboard, which the
// dashboard page immediately bounced back to /onboarding → infinite loop.
export default async function OnboardingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // If the user already has a company, send them straight to the dashboard.
  const { data: member } = await supabase
    .from('company_members')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (member) redirect('/dashboard')

  return <OnboardingForm />
}
