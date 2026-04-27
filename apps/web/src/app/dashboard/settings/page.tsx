import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileSection from './ProfileSection'
import CompanySection from './CompanySection'
import NotificationsSection from './NotificationsSection'
import PrivacySection from './PrivacySection'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single()

  // Company membership + company details
  const { data: memberData } = await supabase
    .from('company_members')
    .select('role, companies(id, name, pan, state_code, financial_year_start, tier)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const company = memberData?.companies as {
    id: string
    name: string
    pan: string
    state_code: string
    financial_year_start: number
    tier: string
  } | null

  // GSTINs and alert preferences (parallel)
  const [gstinsResult, alertPrefsResult] = await Promise.all([
    company?.id
      ? supabase.from('gstins').select('gstin, trade_name, status').eq('company_id', company.id)
      : Promise.resolve({ data: [] as { gstin: string; trade_name: string | null; status: string }[] }),
    company?.id
      ? supabase
          .from('alert_preferences')
          .select('alert_days, email_enabled, whatsapp_enabled, whatsapp_number')
          .eq('user_id', user.id)
          .eq('company_id', company.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const gstins      = gstinsResult.data ?? []
  const alertPrefs  = alertPrefsResult.data
  const isOwner     = memberData?.role === 'owner'

  return (
    <div style={{
      padding: '32px 28px 48px',
      maxWidth: 720,
      margin: '0 auto',
      fontFamily: 'var(--font-geist-sans, sans-serif)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#1e2118', letterSpacing: '-0.4px', marginBottom: 4 }}>
          Settings
        </h1>
        <p style={{ fontSize: 13, color: '#9aa090' }}>
          Manage your profile, company details, and notification preferences.
        </p>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ProfileSection
          fullName={profile?.full_name ?? ''}
          username={profile?.username ?? ''}
          email={user.email ?? ''}
        />

        {company && (
          <CompanySection
            companyId={company.id}
            name={company.name}
            pan={company.pan}
            stateCode={company.state_code}
            financialYearStart={company.financial_year_start}
            tier={company.tier}
            gstins={gstins}
            isOwner={isOwner}
          />
        )}

        {company && (
          <NotificationsSection
            companyId={company.id}
            prefs={alertPrefs ? {
              alertDays: alertPrefs.alert_days ?? [7, 3, 1],
              emailEnabled: alertPrefs.email_enabled ?? true,
              whatsappEnabled: alertPrefs.whatsapp_enabled ?? false,
              whatsappNumber: alertPrefs.whatsapp_number ?? null,
            } : null}
          />
        )}

        {company && (
          <PrivacySection companyId={company.id} />
        )}
      </div>
    </div>
  )
}
