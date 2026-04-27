'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Gstr2bRow = {
  invoice_no: string
  invoice_date: string   // ISO date string 'YYYY-MM-DD'
  supplier_gstin: string
  taxable_value: number  // paise
  igst: number           // paise
  cgst: number           // paise
  sgst: number           // paise
  cess: number           // paise
  itc_availability: string // 'Y' | 'N' | 'T'
}

export async function importGstr2b(
  rows: Gstr2bRow[],
  companyId: string,
  gstinId: string,
  periodMonth: number,
  periodYear: number,
): Promise<{ inserted: number; error?: string }> {
  if (rows.length === 0) return { inserted: 0 }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { inserted: 0, error: 'Not authenticated' }

  const records = rows.map(r => ({
    ...r,
    company_id: companyId,
    gstin_id: gstinId,
    period_month: periodMonth,
    period_year: periodYear,
  }))

  // Batch upsert in chunks of 500 to avoid PostgREST body size limits
  for (let i = 0; i < records.length; i += 500) {
    const { error } = await supabase
      .from('gstr2b_imports')
      .upsert(records.slice(i, i + 500), {
        onConflict: 'gstin_id,period_month,period_year,invoice_no,supplier_gstin',
        ignoreDuplicates: true,
      })
    if (error) return { inserted: i, error: error.message }
  }

  revalidatePath('/dashboard/itc')
  return { inserted: rows.length }
}
