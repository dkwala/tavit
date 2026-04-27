import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function mapStatus(dbStatus: string): 'upcoming' | 'due' | 'done' {
  if (dbStatus === 'filed') return 'done'
  if (dbStatus === 'overdue') return 'due'
  return 'upcoming'
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid #dde0cc',
      borderRadius: 12, padding: '20px 24px',
      borderTop: accent ? '2px solid #7ea860' : undefined,
    }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#6b7061', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 500, color: '#1e2118', letterSpacing: '-0.5px', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#9aa090' }}>{sub}</div>
    </div>
  )
}

function TaskRow({ title, due, status }: { title: string; due: string; status: 'upcoming' | 'due' | 'done' }) {
  const colors = {
    upcoming: { bg: '#eef5e4', text: '#3a6020' },
    due:      { bg: '#f5ede2', text: '#8a4a10' },
    done:     { bg: '#e8eedd', text: '#4a6630' },
  }
  const c = colors[status]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: '0.5px solid #eaecda',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1e2118', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#9aa090' }}>Due {due}</div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 500, padding: '3px 9px', borderRadius: 4,
        background: c.bg, color: c.text, letterSpacing: '0.04em',
      }}>
        {status === 'done' ? 'Filed' : status === 'due' ? 'Due soon' : 'Upcoming'}
      </span>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch the user's company membership + company details in one query
  const { data: member } = await supabase
    .from('company_members')
    .select('company_id, company:companies(name, pan, state_code)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!member) redirect('/onboarding')

  // Fetch the primary active GSTIN for the company (include id for subsequent queries)
  const { data: primaryGstin } = await supabase
    .from('gstins')
    .select('id, gstin, trade_name')
    .eq('company_id', member.company_id)
    .eq('status', 'active')
    .limit(1)
    .single()

  const company     = member.company as unknown as { name: string; pan: string; state_code: string } | null
  const companyName = company?.name ?? 'your company'
  const gstinLabel  = primaryGstin?.gstin ?? '—'
  const gstinId     = primaryGstin?.id ?? ''

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // ── Stats queries ─────────────────────────────────────────────────────────

  // Current Indian FY: April 1 – March 31
  const today = new Date()
  const fyYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1

  // Query A: Returns Filed count for current FY
  const { data: fyDeadlines } = gstinId ? await supabase
    .from('compliance_deadlines')
    .select('status, return_type, period_month, period_year, due_date')
    .eq('company_id', member.company_id)
    .eq('gstin_id', gstinId)
    .gte('due_date', `${fyYear}-04-01`)
    .lte('due_date', `${fyYear + 1}-03-31`)
    .order('due_date', { ascending: false }) : { data: null }

  const filedCount = fyDeadlines?.filter(d => d.status === 'filed').length ?? 0
  const totalCount = fyDeadlines?.length ?? 0
  const returnsDueSub = fyDeadlines?.filter(d => d.status === 'overdue' || d.status === 'pending').length === 1
    ? '1 due this month'
    : `${fyDeadlines?.filter(d => d.status === 'overdue' || d.status === 'pending').length ?? 0} pending`

  // Query B: Latest GSTR-3B draft for tax payable
  const { data: latestDraft } = gstinId ? await supabase
    .from('compliance_deadlines')
    .select('tax_payable, period_month, period_year')
    .eq('company_id', member.company_id)
    .eq('gstin_id', gstinId)
    .eq('return_type', 'GSTR-3B')
    .eq('status', 'draft')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .limit(1)
    .maybeSingle() : { data: null }

  const taxPayableStr = latestDraft?.tax_payable
    ? `₹${fmt(latestDraft.tax_payable / 100)}`
    : '—'
  const taxPayableSub = latestDraft
    ? `GSTR-3B · ${MONTHS[(latestDraft.period_month ?? 1) - 1]} ${latestDraft.period_year}`
    : 'No draft yet'

  // Query C: ITC available — purchase vouchers this month (sum of tax amounts)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)

  const { data: purchases } = gstinId ? await supabase
    .from('vouchers')
    .select('igst_amount, cgst_amount, sgst_amount')
    .eq('gstin_id', gstinId)
    .eq('voucher_type', 'purchase_invoice')
    .eq('status', 'finalized')
    .gte('invoice_date', monthStart)
    .lte('invoice_date', monthEnd) : { data: null }

  const itcPaise = purchases?.reduce(
    (s, v) => s + (v.igst_amount ?? 0) + (v.cgst_amount ?? 0) + (v.sgst_amount ?? 0), 0
  ) ?? 0
  const itcStr = itcPaise > 0 ? `₹${fmt(itcPaise / 100)}` : '—'
  const itcSub = itcPaise > 0
    ? `${MONTHS[today.getMonth()]} ${today.getFullYear()}`
    : 'Import GSTR-2B to reconcile'

  // Calendar: most recent 4 deadlines from FY query
  const calendarRows = (fyDeadlines ?? []).slice(0, 4).map(d => {
    const due = new Date(d.due_date)
    const dueLabel = `${due.getDate()} ${MONTHS[due.getMonth()]} ${due.getFullYear()}`
    return {
      title: `${d.return_type} · ${MONTHS[(d.period_month ?? 1) - 1]} ${d.period_year}`,
      due: dueLabel,
      status: mapStatus(d.status),
    }
  })

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(90,122,58,0.1)', border: '0.5px solid rgba(90,122,58,0.25)',
          borderRadius: 20, padding: '3px 12px', marginBottom: 16,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7ea860' }} />
          <span style={{ fontSize: 11, color: '#5a7a3a', fontWeight: 500, letterSpacing: '0.05em' }}>
            {gstinLabel}
          </span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 500, color: '#1e2118', letterSpacing: '-0.5px', marginBottom: 6 }}>
          {greeting}, <span style={{ color: '#5a7a3a' }}>{companyName}</span>
        </h1>
        <p style={{ fontSize: 14, color: '#6b7061' }}>
          Here&apos;s your compliance overview for this quarter.
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16, marginBottom: 40,
      }}>
        <StatCard label="ITC Available"  value={itcStr}                          sub={itcSub} accent />
        <StatCard label="Tax Payable"    value={taxPayableStr}                   sub={taxPayableSub} />
        <StatCard label="Returns Filed"  value={`${filedCount} / ${totalCount}`} sub={returnsDueSub} />
        <StatCard label="Mismatches"     value="—"                               sub="Import GSTR-2B to reconcile" />
      </div>

      {/* Two column content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Compliance calendar */}
        <div style={{ background: '#fff', border: '0.5px solid #dde0cc', borderRadius: 12, padding: '24px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1e2118', marginBottom: 20 }}>
            Compliance calendar
          </div>
          {calendarRows.length > 0
            ? calendarRows.map(r => <TaskRow key={r.title} title={r.title} due={r.due} status={r.status} />)
            : <p style={{ fontSize: 12, color: '#9aa090' }}>No deadlines found for this FY.</p>
          }
        </div>

        {/* Quick actions */}
        <div style={{ background: '#1e2118', border: '0.5px solid rgba(90,122,58,0.2)', borderRadius: 12, padding: '24px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#e8ddb5', marginBottom: 20 }}>
            Quick actions
          </div>
          {([
            { label: 'Reconcile ITC',  desc: 'Match GSTR-2A vs 2B',       icon: '⇄', href: '/dashboard/itc' },
            { label: 'Build GSTR-1',   desc: 'Auto-fill from Tally data',  icon: '↗', href: '/dashboard/returns' },
            { label: 'Build GSTR-3B',  desc: 'Compute tax payable',        icon: '↗', href: '/dashboard/returns' },
          ] as const).map(item => (
            <a
              key={item.label}
              href={item.href}
              style={{ textDecoration: 'none', display: 'block', marginBottom: 10 }}
            >
              <div
                style={{
                  width: '100%', background: 'rgba(90,122,58,0.1)',
                  border: '0.5px solid rgba(90,122,58,0.2)',
                  borderRadius: 8, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 16, color: '#7ea860', width: 20, textAlign: 'center' }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#e8ddb5' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(232,221,181,0.4)', marginTop: 1 }}>{item.desc}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
