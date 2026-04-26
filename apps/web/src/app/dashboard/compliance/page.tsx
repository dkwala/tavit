import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { seedDeadlines } from './actions'
import CalendarView from './CalendarView'
import PenaltyCalculator from './PenaltyCalculator'
import AlertSettings from './AlertSettings'
import LiveClock from './LiveClock'
import DeadlineCountdown from './DeadlineCountdown'
import AlertActivityPanel from './AlertActivityPanel'

export default async function CompliancePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch company membership
  const { data: member } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!member) redirect('/onboarding')

  const companyId = member.company_id

  // Fetch all active GSTINs
  const { data: gstins } = await supabase
    .from('gstins')
    .select('id, gstin, trade_name, registration_type')
    .eq('company_id', companyId)
    .eq('status', 'active')

  const gstinList = gstins ?? []

  // Seed deadlines (idempotent — safe to call on every page load)
  if (gstinList.length > 0) {
    await seedDeadlines(
      companyId,
      gstinList.map(g => ({ gstinId: g.id, registrationType: g.registration_type })),
    )
  }

  // Fetch all deadlines for this company (with GSTIN string)
  const { data: rawDeadlines } = await supabase
    .from('compliance_deadlines')
    .select(`
      id, gstin_id, return_type, period_month, period_year,
      due_date, filing_date, status, is_nil_return, tax_payable, notes
    `)
    .eq('company_id', companyId)
    .order('due_date', { ascending: false })

  // Build a gstin lookup map
  const gstinMap = Object.fromEntries(gstinList.map(g => [g.id, g.gstin]))

  const deadlines = (rawDeadlines ?? []).map(d => ({
    id:          d.id,
    gstinId:     d.gstin_id,
    gstin:       gstinMap[d.gstin_id] ?? '—',
    returnType:  d.return_type,
    periodMonth: d.period_month,
    periodYear:  d.period_year,
    dueDate:     d.due_date,
    filingDate:  d.filing_date ?? null,
    status:      d.status as 'pending' | 'filed' | 'overdue',
    isNilReturn: d.is_nil_return,
    taxPayable:  d.tax_payable,
    notes:       d.notes ?? null,
  }))

  // Fetch alert preferences for this user+company
  const { data: alertPrefs } = await supabase
    .from('alert_preferences')
    .select('alert_days, email_enabled, whatsapp_enabled, whatsapp_number')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .maybeSingle()

  // Summary counts
  const overdue  = deadlines.filter(d => d.status === 'overdue').length
  const upcoming = deadlines.filter(d => d.status === 'pending').length
  const filed    = deadlines.filter(d => d.status === 'filed').length
  const nextDue  = deadlines
    .filter(d => d.status === 'pending')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const nextDueLabel = nextDue
    ? `${nextDue.returnType} · ${months[nextDue.periodMonth - 1]} ${nextDue.periodYear}`
    : 'None upcoming'
  const nextDueDateLabel = nextDue
    ? new Date(nextDue.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div style={{ maxWidth: 1220, margin: '0 auto', padding: '32px 24px 48px' }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 18,
        flexWrap: 'wrap',
        marginBottom: 28,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 7 }}>
            <h1 style={{ fontSize: 27, fontWeight: 600, color: '#1e2118', letterSpacing: '-0.6px' }}>
              Compliance Calendar
            </h1>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#5a7a3a',
              background: 'rgba(90,122,58,0.09)',
              border: '0.5px solid rgba(90,122,58,0.2)',
              borderRadius: 999,
              padding: '4px 10px',
            }}>
              FY 2025-26
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#6b7061' }}>
            GST return deadlines, penalties, and filing status across all GSTINs.
          </p>
        </div>
        <LiveClock />
      </div>

      {/* Summary stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14, marginBottom: 32,
      }}>
        {[
          { label: 'Overdue',     value: String(overdue),   accent: overdue > 0 ? '#dc6450' : undefined },
          { label: 'Pending',     value: String(upcoming),  accent: undefined },
          { label: 'Filed',       value: String(filed),     accent: undefined },
          { label: 'Next due',    value: nextDueLabel,      sub: nextDueDateLabel, accent: undefined },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} style={{
            background: '#fff',
            border: `0.5px solid ${accent ? 'rgba(220,100,80,0.25)' : '#dde0cc'}`,
            borderTop: accent ? `2px solid ${accent}` : '2px solid #7ea860',
            borderRadius: 10, padding: '16px 20px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: '#6b7061', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
              {label}
            </div>
            <div style={{ fontSize: label === 'Next due' ? 13 : 24, fontWeight: 500, color: accent ?? '#1e2118', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              {value}
            </div>
            {sub && <div style={{ fontSize: 11, color: '#9aa090', marginTop: 4 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Main two-column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 340px)',
        gap: 20,
        alignItems: 'start',
      }}>

        {/* Left: Calendar list */}
        <CalendarView deadlines={deadlines} />

        {/* Right: countdowns, alerts, and penalty tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DeadlineCountdown deadlines={deadlines} />
          <AlertActivityPanel
            deadlines={deadlines}
            prefs={alertPrefs ? {
              alertDays:       alertPrefs.alert_days ?? [7, 3, 1],
              emailEnabled:    alertPrefs.email_enabled,
              whatsappEnabled: alertPrefs.whatsapp_enabled,
              whatsappNumber:  alertPrefs.whatsapp_number ?? '',
            } : null}
          />
          <PenaltyCalculator />
          <AlertSettings
            companyId={companyId}
            prefs={alertPrefs ? {
              alertDays:       alertPrefs.alert_days ?? [7, 3, 1],
              emailEnabled:    alertPrefs.email_enabled,
              whatsappEnabled: alertPrefs.whatsapp_enabled,
              whatsappNumber:  alertPrefs.whatsapp_number ?? '',
            } : null}
          />
        </div>
      </div>
    </div>
  )
}
