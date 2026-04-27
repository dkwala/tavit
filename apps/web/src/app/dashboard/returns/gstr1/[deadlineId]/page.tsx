import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Gstr1DraftClient, type Gstr1Draft } from './Gstr1DraftClient'

function formatPeriod(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
}

export default async function Gstr1DraftPage({
  params,
}: {
  params: Promise<{ deadlineId: string }>
}) {
  const { deadlineId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: member } = await supabase
    .from('company_members')
    .select('company_id, company:companies(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!member) redirect('/dashboard/returns')

  const { data: deadline } = await supabase
    .from('compliance_deadlines')
    .select('id, gstin_id, period_month, period_year, return_type')
    .eq('id', deadlineId)
    .eq('company_id', member.company_id)
    .single()

  if (!deadline || deadline.return_type !== 'GSTR-1') notFound()

  const { data: gstinRecord } = await supabase
    .from('gstins')
    .select('id, gstin')
    .eq('id', deadline.gstin_id)
    .single()

  if (!gstinRecord) notFound()

  const apiUrl = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'

  let draft: Gstr1Draft | null = null
  let buildError: string | null = null

  try {
    const res = await fetch(`${apiUrl}/compliance/gstr1/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gstinId: deadline.gstin_id,
        periodMonth: deadline.period_month,
        periodYear: deadline.period_year,
      }),
      cache: 'no-store',
    })
    const json = await res.json() as Record<string, unknown>
    if (!res.ok) {
      buildError = (json['message'] as string) ?? 'Failed to build GSTR-1'
    } else {
      draft = json as unknown as Gstr1Draft
    }
  } catch (e) {
    buildError = e instanceof Error ? e.message : 'Could not reach API'
  }

  const company = member.company as unknown as { name: string } | null
  const periodLabel = formatPeriod(deadline.period_month, deadline.period_year)

  if (buildError || !draft) {
    return (
      <div style={{ padding: '60px 40px', maxWidth: 600 }}>
        <div style={{ background: '#fff', border: '0.5px solid #dde0cc', borderRadius: 10, padding: '28px 32px' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1e2118', marginBottom: 8 }}>Could not build GSTR-1</div>
          <div style={{ fontSize: 13, color: '#6b7061', marginBottom: 20 }}>
            {buildError ?? 'Unknown error'}<br />
            Make sure sales vouchers are imported for {periodLabel} and the API is running.
          </div>
          <a href="/dashboard/returns" style={{ fontSize: 12, color: '#5a7a3a', textDecoration: 'none' }}>
            ← Back to Returns
          </a>
        </div>
      </div>
    )
  }

  return (
    <Gstr1DraftClient
      draft={draft}
      deadlineId={deadlineId}
      gstinLabel={gstinRecord.gstin}
      periodLabel={periodLabel}
      companyName={company?.name ?? '—'}
    />
  )
}
