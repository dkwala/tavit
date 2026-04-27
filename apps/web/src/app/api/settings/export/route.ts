import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const [profileResult, membershipsResult, alertPrefsResult] = await Promise.all([
    supabase.from('profiles').select('full_name, username, onboarded, created_at').eq('id', user.id).single(),
    supabase.from('company_members').select('role, companies(id, name, pan, state_code, tier)').eq('user_id', user.id),
    supabase.from('alert_preferences').select('alert_days, email_enabled, whatsapp_enabled, created_at, updated_at').eq('user_id', user.id),
  ])

  const payload = {
    exportedAt: new Date().toISOString(),
    email: user.email,
    profile: profileResult.data,
    companies: membershipsResult.data,
    alertPreferences: alertPrefsResult.data,
  }

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="tavit-data-export.json"',
    },
  })
}
