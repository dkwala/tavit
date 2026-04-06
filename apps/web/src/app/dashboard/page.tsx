import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
    due: { bg: '#f5ede2', text: '#8a4a10' },
    done: { bg: '#e8eedd', text: '#4a6630' },
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, gstin, onboarded')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarded) redirect('/onboarding')

  const companyName = profile.company_name ?? 'your company'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

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
            {profile.gstin}
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
        <StatCard label="ITC Available" value="₹2,14,800" sub="Updated 2 hrs ago" accent />
        <StatCard label="Tax Payable" value="₹48,220" sub="GSTR-3B · Apr 2026" />
        <StatCard label="Returns Filed" value="8 / 9" sub="1 due this month" />
        <StatCard label="Mismatches" value="3" sub="In GSTR-2B vs 2A" />
      </div>

      {/* Two column content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Upcoming filings */}
        <div style={{
          background: '#fff', border: '0.5px solid #dde0cc',
          borderRadius: 12, padding: '24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1e2118', marginBottom: 20 }}>
            Compliance calendar
          </div>
          <TaskRow title="GSTR-1 · Apr 2026" due="11 May 2026" status="upcoming" />
          <TaskRow title="GSTR-3B · Apr 2026" due="20 May 2026" status="upcoming" />
          <TaskRow title="GSTR-1 · Mar 2026" due="11 Apr 2026" status="done" />
          <TaskRow title="GSTR-3B · Mar 2026" due="20 Apr 2026" status="done" />
        </div>

        {/* Quick actions */}
        <div style={{
          background: '#1e2118', border: '0.5px solid rgba(90,122,58,0.2)',
          borderRadius: 12, padding: '24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#e8ddb5', marginBottom: 20 }}>
            Quick actions
          </div>
          {[
            { label: 'Reconcile ITC', desc: 'Match GSTR-2A vs 2B', icon: '⇄' },
            { label: 'Build GSTR-1', desc: 'Auto-fill from Tally data', icon: '↗' },
            { label: 'Build GSTR-3B', desc: 'Compute tax payable', icon: '↗' },
          ].map(item => (
            <button
              key={item.label}
              style={{
                width: '100%', background: 'rgba(90,122,58,0.1)',
                border: '0.5px solid rgba(90,122,58,0.2)',
                borderRadius: 8, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer', marginBottom: 10,
                transition: 'background 0.15s', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 16, color: '#7ea860', width: 20, textAlign: 'center' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e8ddb5' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(232,221,181,0.4)', marginTop: 1 }}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
