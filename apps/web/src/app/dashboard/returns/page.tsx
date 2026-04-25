import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { loadReturns, type DeadlineRow } from './actions'
import { BuildButton } from './BuildButton'

type ReturnStatus = 'filed' | 'draft' | 'due' | 'upcoming'

const STATUS_CONFIG: Record<ReturnStatus, { label: string; bg: string; text: string; dot: string }> = {
  filed:    { label: 'Filed',    bg: 'rgba(90,122,58,0.12)',  text: '#5a7a3a', dot: '#7ea860' },
  draft:    { label: 'Draft',    bg: 'rgba(200,160,50,0.12)', text: '#8a6a10', dot: '#c8a032' },
  due:      { label: 'Due soon', bg: 'rgba(200,80,60,0.12)',  text: '#902020', dot: '#dc5040' },
  upcoming: { label: 'Upcoming', bg: 'rgba(90,90,90,0.08)',   text: '#6b7061', dot: '#9aa090' },
}

function mapStatus(dbStatus: string): ReturnStatus {
  if (dbStatus === 'filed')   return 'filed'
  if (dbStatus === 'draft')   return 'draft'
  if (dbStatus === 'overdue') return 'due'
  return 'upcoming'
}

function formatPeriod(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' })
}

function formatDue(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatPaise(paise: number | null) {
  if (!paise) return null
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function StatusBadge({ status }: { status: ReturnStatus }) {
  const c = STATUS_CONFIG[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, color: c.text,
      fontSize: 11, fontWeight: 500, padding: '3px 9px',
      borderRadius: 6, letterSpacing: '0.02em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  )
}

function ReturnCard({ row, gstinId }: { row: DeadlineRow; gstinId: string }) {
  const status   = mapStatus(row.status)
  const canBuild  = status === 'draft' || status === 'due' || status === 'upcoming'
  const isBuildable = row.return_type === 'GSTR-1' || row.return_type === 'GSTR-3B'
  const amount    = formatPaise(row.tax_payable)

  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid #dde0cc',
      borderRadius: 10,
      padding: '16px 20px',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 12,
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          background: '#1e2118', color: '#7ea860',
          fontSize: 11, fontWeight: 600,
          padding: '6px 10px', borderRadius: 6, letterSpacing: '0.04em',
          minWidth: 64, textAlign: 'center', flexShrink: 0,
        }}>
          {row.return_type}
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1e2118', marginBottom: 3 }}>
            {formatPeriod(row.period_month, row.period_year)}
            {amount && (
              <span style={{ marginLeft: 10, fontSize: 12, color: '#5a7a3a', fontWeight: 400 }}>
                {amount}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#9aa090' }}>
            Due {formatDue(row.due_date)}
            {row.filing_date && (
              <span style={{ marginLeft: 8, color: '#b0b8a0' }}>
                Filed {formatDue(row.filing_date)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StatusBadge status={status} />
        {canBuild && isBuildable && (
          <BuildButton
            deadlineId={row.id}
            gstinId={gstinId}
            periodMonth={row.period_month}
            periodYear={row.period_year}
            isReview={status === 'draft'}
            returnType={row.return_type}
          />
        )}
      </div>
    </div>
  )
}

export default async function ReturnsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: member } = await supabase
    .from('company_members')
    .select('company_id, company:companies(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const { data: primaryGstinRow } = member
    ? await supabase
        .from('gstins')
        .select('id, gstin')
        .eq('company_id', member.company_id)
        .eq('status', 'active')
        .limit(1)
        .single()
    : { data: null }

  const company     = member?.company as unknown as { name: string } | null
  const companyName = company?.name ?? '—'
  const gstinLabel  = primaryGstinRow?.gstin ?? '—'
  const gstinId     = primaryGstinRow?.id ?? ''

  const rows = member && gstinId
    ? await loadReturns(member.company_id, gstinId)
    : []

  const filed   = rows.filter(r => r.status === 'filed')
  const pending = rows.filter(r => r.status !== 'filed')

  const filedCount   = filed.length
  const pendingCount = pending.filter(r => r.status === 'overdue' || r.status === 'pending' || r.status === 'draft').length
  const totalTaxPaise = filed.reduce((sum, r) => sum + (r.tax_payable ?? 0), 0)
  const totalTaxLabel = totalTaxPaise > 0 ? formatPaise(totalTaxPaise) ?? '—' : '—'

  return (
    <div style={{ padding: '40px 40px', maxWidth: 860 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#1e2118', letterSpacing: '-0.4px', marginBottom: 6 }}>
          GST Returns
        </h1>
        <p style={{ fontSize: 13, color: '#6b7061' }}>
          {gstinLabel} · {companyName}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Filed this period',   value: String(filedCount),  color: '#5a7a3a' },
          { label: 'Pending',             value: String(pendingCount), color: '#8a6a10' },
          { label: 'Total tax deposited', value: totalTaxLabel,        color: '#1e2118' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', border: '0.5px solid #dde0cc',
            borderRadius: 10, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 11, color: '#9aa090', marginBottom: 8, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 500, color: s.color, letterSpacing: '-0.4px' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7061', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            Pending action
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(r => <ReturnCard key={r.id} row={r} gstinId={gstinId} />)}
          </div>
        </div>
      )}

      {filed.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7061', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            Filed returns
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filed.map(r => <ReturnCard key={r.id} row={r} gstinId={gstinId} />)}
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9aa090', fontSize: 13 }}>
          No compliance deadlines found. Visit the Compliance tab to set up your return schedule.
        </div>
      )}
    </div>
  )
}
