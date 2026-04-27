'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────────

type GstinSeed = {
  gstinId: string
  registrationType: string
}

export type AlertPrefState =
  | { errors?: { whatsappNumber?: string }; message?: string }
  | undefined

// ── Deadline seeding ──────────────────────────────────────────────────────────
// Generates GSTR-1 and GSTR-3B monthly deadlines for -3 to +6 months from today.
// GSTR-9 annual for the current and previous FY.
// Uses ON CONFLICT DO NOTHING so re-calling is safe.

export async function seedDeadlines(
  companyId: string,
  gstins: GstinSeed[],
) {
  const supabase = await createClient()
  const today = new Date()

  const rows: {
    company_id: string
    gstin_id: string
    return_type: string
    period_month: number
    period_year: number
    due_date: string
    status: string
  }[] = []

  for (const { gstinId, registrationType } of gstins) {
    const isComposition = registrationType === 'composition'

    if (!isComposition) {
      // Monthly returns: GSTR-1 and GSTR-3B, from -3 to +6 months
      for (let offset = -3; offset <= 6; offset++) {
        const d = new Date(today.getFullYear(), today.getMonth() + offset, 1)
        const month = d.getMonth() + 1 // 1-12
        const year  = d.getFullYear()

        // GSTR-1: due 11th of following month
        const gstr1Due = new Date(year, month, 11) // month is already 0-indexed next month
        // GSTR-3B: due 20th of following month
        const gstr3bDue = new Date(year, month, 20)

        const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())

        rows.push({
          company_id: companyId,
          gstin_id: gstinId,
          return_type: 'GSTR-1',
          period_month: month,
          period_year: year,
          due_date: gstr1Due.toISOString().slice(0, 10),
          status: gstr1Due < today0 ? 'overdue' : 'pending',
        })

        rows.push({
          company_id: companyId,
          gstin_id: gstinId,
          return_type: 'GSTR-3B',
          period_month: month,
          period_year: year,
          due_date: gstr3bDue.toISOString().slice(0, 10),
          status: gstr3bDue < today0 ? 'overdue' : 'pending',
        })
      }
    } else {
      // Composition dealers: CMP-08 quarterly
      for (let qOffset = -2; qOffset <= 3; qOffset++) {
        const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3 + qOffset * 3
        const d = new Date(today.getFullYear(), quarterStartMonth, 1)
        const month = d.getMonth() + 1
        const year  = d.getFullYear()
        // CMP-08 due 18th of month after quarter end
        const quarterEndMonth = Math.floor((month - 1) / 3) * 3 + 3 // last month of quarter
        const dueDate = new Date(year, quarterEndMonth, 18)
        const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        rows.push({
          company_id: companyId,
          gstin_id: gstinId,
          return_type: 'CMP-08',
          period_month: month,
          period_year: year,
          due_date: dueDate.toISOString().slice(0, 10),
          status: dueDate < today0 ? 'overdue' : 'pending',
        })
      }
    }

    // GSTR-9 annual: current FY and previous FY (due 31 Dec after FY end)
    if (!isComposition) {
      for (const fyStart of [today.getFullYear() - 2, today.getFullYear() - 1]) {
        const dueDate = new Date(fyStart + 1, 11, 31) // 31 Dec of year after FY start
        const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        rows.push({
          company_id: companyId,
          gstin_id: gstinId,
          return_type: 'GSTR-9',
          period_month: 3,   // March = end of FY
          period_year: fyStart,
          due_date: dueDate.toISOString().slice(0, 10),
          status: dueDate < today0 ? 'overdue' : 'pending',
        })
      }
    }
  }

  if (rows.length === 0) return

  // Insert only rows that don't already exist (ON CONFLICT DO NOTHING)
  await supabase
    .from('compliance_deadlines')
    .upsert(rows, {
      onConflict: 'gstin_id,return_type,period_month,period_year',
      ignoreDuplicates: true,
    })

  // Also update status of past-due 'pending' rows to 'overdue'
  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  await supabase
    .from('compliance_deadlines')
    .update({ status: 'overdue' })
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .lt('due_date', today0.toISOString().slice(0, 10))
}

// ── Mark as filed ─────────────────────────────────────────────────────────────

export async function markFiled(deadlineId: string, filingDate?: string) {
  const supabase = await createClient()
  const date = filingDate ?? new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('compliance_deadlines')
    .update({ status: 'filed', filing_date: date })
    .eq('id', deadlineId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/compliance')
  revalidatePath('/dashboard/returns')
  revalidatePath('/dashboard')
  return {}
}

// ── Mark as pending (undo filed) ──────────────────────────────────────────────

export async function markPending(deadlineId: string, dueDate: string) {
  const supabase = await createClient()
  const today0 = new Date()
  today0.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)

  const { error } = await supabase
    .from('compliance_deadlines')
    .update({
      status: due < today0 ? 'overdue' : 'pending',
      filing_date: null,
    })
    .eq('id', deadlineId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/compliance')
  return {}
}

// ── Save alert preferences ────────────────────────────────────────────────────

export async function saveAlertPreferences(
  _prevState: AlertPrefState,
  formData: FormData,
): Promise<AlertPrefState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Not authenticated' }

  const companyId       = formData.get('companyId') as string
  const emailEnabled    = formData.get('emailEnabled') === 'true'
  const whatsappEnabled = formData.get('whatsappEnabled') === 'true'
  const whatsappNumber  = (formData.get('whatsappNumber') as string)?.trim() || null
  const alertDays       = (formData.getAll('alertDays') as string[]).map(Number).filter(Boolean)

  if (whatsappEnabled && whatsappNumber) {
    const cleaned = whatsappNumber.replace(/\D/g, '')
    if (cleaned.length < 10 || cleaned.length > 13) {
      return { errors: { whatsappNumber: 'Enter a valid mobile number (10 digits)' } }
    }
  }

  const days = alertDays.length > 0 ? alertDays.sort((a, b) => b - a) : [7, 3, 1]

  const { error } = await supabase
    .from('alert_preferences')
    .upsert({
      user_id: user.id,
      company_id: companyId,
      alert_days: days,
      email_enabled: emailEnabled,
      whatsapp_enabled: whatsappEnabled,
      whatsapp_number: whatsappEnabled ? whatsappNumber : null,
    }, { onConflict: 'user_id,company_id' })

  if (error) return { message: `Could not save: ${error.message}` }

  revalidatePath('/dashboard/compliance')
  return {}
}
