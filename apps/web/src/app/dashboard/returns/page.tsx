import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type ReturnStatus = 'filed' | 'draft' | 'due' | 'upcoming'

type Return = {
  type: string
  period: string
  due: string
  status: ReturnStatus
  arn?: string
  amount?: string
}

const MOCK_RETURNS: Return[] = [
  { type: 'GSTR-1',  period: 'Mar 2026', due: '11 Apr 2026', status: 'filed',    arn: 'AA2603261234567', amount: '₹18,40,200' },
  { type: 'GSTR-3B', period: 'Mar 2026', due: '20 Apr 2026', status: 'filed',    arn: 'AA2604201234568', amount: '₹48,220' },
  { type: 'GSTR-2B', period: 'Mar 2026', due: '14 Apr 2026', status: 'filed',    arn: undefined,         amount: '₹2,14,800 ITC' },
  { type: 'GSTR-1',  period: 'Apr 2026', due: '11 May 2026', status: 'draft',    arn: undefined,         amount: '₹21,10,400' },
  { type: 'GSTR-3B', period: 'Apr 2026', due: '20 May 2026', status: 'upcoming', arn: undefined,         amount: undefined },
  { type: 'GSTR-2B', period: 'Apr 2026', due: '14 May 2026', status: 'upcoming', arn: undefined,         amount: undefined },
]

const STATUS_CONFIG: Record<ReturnStatus, { label: string; bg: string; text: string; dot: string }> = {
  filed:    { label: 'Filed',    bg: 'rgba(90,122,58,0.12)',  text: '#5a7a3a', dot: '#7ea860' },
  draft:    { label: 'Draft',    bg: 'rgba(200,160,50,0.12)', text: '#8a6a10', dot: '#c8a032' },
  due:      { label: 'Due soon', bg: 'rgba(200,80,60,0.12)',  text: '#902020', dot: '#dc5040' },
  upcoming: { label: 'Upcoming', bg: 'rgba(90,90,90,0.08)',   text: '#6b7061', dot: '#9aa090' },
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

function ReturnCard({ r }: { r: Return }) {
  const canBuild = r.status === 'draft' || r.status === 'due'
  const canFile  = r.status === 'draft'
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
        {/* Type badge */}
        <div style={{
          background: '#1e2118', color: '#7ea860',
          fontSize: 11, fontWeight: 600,
          padding: '6px 10px', borderRadius: 6, letterSpacing: '0.04em',
          minWidth: 64, textAlign: 'center', flexShrink: 0,
        }}>
          {r.type}
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1e2118', marginBottom: 3 }}>
            {r.period}
            {r.amount && (
              <span style={{ marginLeft: 10, fontSize: 12, color: '#5a7a3a', fontWeight: 400 }}>
                {r.amount}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#9aa090' }}>
            Due {r.due}
            {r.arn && <span style={{ marginLeft: 8, color: '#b0b8a0' }}>ARN: {r.arn}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StatusBadge status={r.status} />
        {canBuild && (
          <button style={{
            background: '#1e2118', color: '#9cc47a',
            border: 'none', fontSize: 11, fontWeight: 500,
            padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
            letterSpacing: '0.02em',
          }}>
            {canFile ? 'Review & File →' : 'Build →'}
          </button>
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

  const { data: primaryGstin } = member
    ? await supabase
        .from('gstins')
        .select('gstin')
        .eq('company_id', member.company_id)
        .eq('status', 'active')
        .limit(1)
        .single()
    : { data: null }

  const company     = member?.company as unknown as { name: string } | null
  const companyName = company?.name ?? '—'
  const gstinLabel  = primaryGstin?.gstin ?? '—'

  const filed   = MOCK_RETURNS.filter(r => r.status === 'filed')
  const pending = MOCK_RETURNS.filter(r => r.status !== 'filed')

  return (
    <div style={{ padding: '40px 40px', maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#1e2118', letterSpacing: '-0.4px', marginBottom: 6 }}>
          GST Returns
        </h1>
        <p style={{ fontSize: 13, color: '#6b7061' }}>
          {gstinLabel} · {companyName}
        </p>
      </div>

      {/* Summary row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32,
      }}>
        {[
          { label: 'Filed this quarter',   value: '3',      color: '#5a7a3a' },
          { label: 'Pending',              value: '2',      color: '#8a6a10' },
          { label: 'Total tax deposited',  value: '₹48,220', color: '#1e2118' },
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

      {/* Pending / in-progress */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7061', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
          Pending action
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pending.map(r => <ReturnCard key={`${r.type}-${r.period}`} r={r} />)}
        </div>
      </div>

      {/* Filed */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7061', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
          Filed returns
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filed.map(r => <ReturnCard key={`${r.type}-${r.period}`} r={r} />)}
        </div>
      </div>
    </div>
  )
}
