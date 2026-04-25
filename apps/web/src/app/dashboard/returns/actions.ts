'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type DeadlineRow = {
  id: string
  return_type: string
  period_month: number
  period_year: number
  due_date: string
  status: string
  filing_date: string | null
  tax_payable: number | null
  gstin_id: string
}

export async function loadReturns(companyId: string, gstinId: string): Promise<DeadlineRow[]> {
  const supabase = await createClient()

  const today = new Date()
  const from = new Date(today.getFullYear(), today.getMonth() - 6, 1)
  const to   = new Date(today.getFullYear(), today.getMonth() + 4, 1)

  const { data, error } = await supabase
    .from('compliance_deadlines')
    .select('id, return_type, period_month, period_year, due_date, status, filing_date, tax_payable, gstin_id')
    .eq('company_id', companyId)
    .eq('gstin_id', gstinId)
    .gte('due_date', from.toISOString().slice(0, 10))
    .lt('due_date', to.toISOString().slice(0, 10))
    .order('due_date', { ascending: false })

  if (error) return []
  return (data ?? []) as DeadlineRow[]
}

export async function buildGstr3bAction(
  gstinId: string,
  deadlineId: string,
  periodMonth: number,
  periodYear: number,
): Promise<{ summary?: { total_cash: string }; error?: string }> {
  const apiUrl = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'

  let result: Record<string, unknown>
  try {
    const res = await fetch(`${apiUrl}/compliance/gstr3b/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gstinId, periodMonth, periodYear }),
    })
    result = await res.json() as Record<string, unknown>
    if (!res.ok) {
      return { error: (result['message'] as string) ?? 'Build failed' }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not reach API' }
  }

  // Extract cash payable totals from Table 6.1
  const t61 = result['table_6.1'] as Record<string, Record<string, string>> | undefined
  if (t61) {
    const totalCash = ['igst', 'cgst', 'sgst', 'cess'].reduce((sum, head) => {
      return sum + parseFloat(t61[head]?.['tax_paid_in_cash'] ?? '0')
    }, 0)

    const supabase = await createClient()
    const taxPayablePaise = Math.round(totalCash * 100)
    await supabase
      .from('compliance_deadlines')
      .update({ tax_payable: taxPayablePaise, status: 'draft' })
      .eq('id', deadlineId)
      .in('status', ['pending', 'overdue'])
  }

  revalidatePath('/dashboard/returns')
  return { summary: { total_cash: String(t61 ? ['igst', 'cgst', 'sgst', 'cess'].reduce((s, h) => s + parseFloat(t61[h]?.['tax_paid_in_cash'] ?? '0'), 0).toFixed(2) : '0.00') } }
}

export async function buildGstr1Action(
  gstinId: string,
  deadlineId: string,
  periodMonth: number,
  periodYear: number,
): Promise<{ totals?: Record<string, string>; error?: string }> {
  const apiUrl = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'

  let result: Record<string, unknown>
  try {
    const res = await fetch(`${apiUrl}/compliance/gstr1/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gstinId, periodMonth, periodYear }),
    })
    result = await res.json() as Record<string, unknown>
    if (!res.ok) {
      return { error: (result['message'] as string) ?? 'Build failed' }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not reach API' }
  }

  const totals = result['totals'] as Record<string, string> | undefined

  // Update compliance_deadlines: store tax_payable (paise) and set status to 'draft'
  if (totals) {
    const supabase = await createClient()
    const totalTaxRupees = parseFloat(totals['total_tax'] ?? '0')
    const taxPayablePaise = Math.round(totalTaxRupees * 100)

    await supabase
      .from('compliance_deadlines')
      .update({
        tax_payable: taxPayablePaise,
        status: 'draft',
      })
      .eq('id', deadlineId)
      .in('status', ['pending', 'overdue'])
  }

  revalidatePath('/dashboard/returns')
  return { totals }
}
