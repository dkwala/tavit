import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ItcClient, type ITCRow, type PeriodOption } from './ItcClient'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(d: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return `${String(dt.getDate()).padStart(2, '0')} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`
}

export default async function ITCPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
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

  // Fetch primary GSTIN
  const { data: primaryGstin } = await supabase
    .from('gstins')
    .select('id, gstin')
    .eq('company_id', member.company_id)
    .eq('status', 'active')
    .limit(1)
    .single()

  const gstinId   = primaryGstin?.id   ?? ''
  const companyId = member.company_id

  // Fetch available periods from compliance_deadlines
  const { data: deadlinePeriods } = gstinId ? await supabase
    .from('compliance_deadlines')
    .select('period_month, period_year')
    .eq('gstin_id', gstinId)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .limit(24) : { data: null }

  // Deduplicate periods
  const seen = new Set<string>()
  const periods: PeriodOption[] = []
  for (const d of deadlinePeriods ?? []) {
    const val = `${d.period_year}-${String(d.period_month).padStart(2, '0')}`
    if (!seen.has(val)) {
      seen.add(val)
      periods.push({ value: val, label: `${MONTHS[d.period_month - 1]} ${d.period_year}` })
    }
  }

  // Determine selected period from URL param or default to latest
  const sp = await searchParams
  const rawPeriod = sp.period
  const selectedPeriod = (rawPeriod && /^\d{4}-\d{2}$/.test(rawPeriod))
    ? rawPeriod
    : (periods[0]?.value ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)

  const [yearStr, monthStr] = selectedPeriod.split('-')
  const pYear  = parseInt(yearStr, 10)
  const pMonth = parseInt(monthStr, 10)
  const periodLabel = `${MONTHS[pMonth - 1]} ${pYear}`

  // Date range for the selected month
  const monthStart = new Date(pYear, pMonth - 1, 1).toISOString()
  const monthEnd   = new Date(pYear, pMonth, 1).toISOString()    // exclusive upper bound

  // ── Fetch GSTR-2B imports for this period ────────────────────────────────────
  const { data: b2bRows } = gstinId ? await supabase
    .from('gstr2b_imports')
    .select('invoice_no, supplier_gstin, invoice_date, taxable_value, igst, cgst, sgst, cess, itc_availability')
    .eq('gstin_id', gstinId)
    .eq('period_month', pMonth)
    .eq('period_year', pYear) : { data: null }

  const hasGstr2b = (b2bRows?.length ?? 0) > 0

  // ── Fetch purchase vouchers for this period ───────────────────────────────────
  const { data: purchaseRows } = gstinId ? await supabase
    .from('vouchers')
    .select('id, party_gstin, party_name, voucher_number, invoice_date, total_amount, igst_amount, cgst_amount, sgst_amount, grand_total')
    .eq('gstin_id', gstinId)
    .eq('voucher_type', 'purchase_invoice')
    .eq('status', 'finalized')
    .gte('invoice_date', monthStart)
    .lt('invoice_date', monthEnd) : { data: null }

  // ── Reconciliation ────────────────────────────────────────────────────────────

  type B2bRow = NonNullable<typeof b2bRows>[number] & { invoice_no: string; supplier_gstin: string; invoice_date: string; taxable_value: number; igst: number; cgst: number; sgst: number }

  const b2bMap = new Map<string, B2bRow>()
  for (const row of (b2bRows ?? []) as B2bRow[]) {
    b2bMap.set(`${row.supplier_gstin}|${row.invoice_no}`, row)
  }

  const itcRows: ITCRow[] = []

  for (const pr of purchaseRows ?? []) {
    if (!pr.party_gstin) continue

    const key    = `${pr.party_gstin}|${pr.voucher_number}`
    const b2b    = b2bMap.get(key)
    const prIgst = pr.igst_amount ?? 0
    const prCgst = pr.cgst_amount ?? 0
    const prSgst = pr.sgst_amount ?? 0
    const prItc  = prIgst + prCgst + prSgst

    if (b2b) {
      const b2bIgst = b2b.igst ?? 0
      const b2bCgst = b2b.cgst ?? 0
      const b2bSgst = b2b.sgst ?? 0
      const b2bItc  = b2bIgst + b2bCgst + b2bSgst
      const variance = prItc - b2bItc  // paise

      itcRows.push({
        id: `pr_${key}`,
        gstin: pr.party_gstin,
        supplierName: pr.party_name ?? pr.party_gstin,
        invoiceNo: pr.voucher_number,
        invoiceDate: formatDate(pr.invoice_date),
        invoiceValue: Math.round((pr.grand_total ?? 0) / 100),
        taxableValue: Math.round((pr.total_amount ?? 0) / 100),
        igst: Math.round(prIgst / 100),
        cgst: Math.round(prCgst / 100),
        sgst: Math.round(prSgst / 100),
        totalITC: Math.round(prItc / 100),
        source2B: true,
        sourceBooks: true,
        period: periodLabel,
        status: Math.abs(variance) <= 100 ? 'eligible' : 'pending',  // ≤₹1 tolerance
        variance: Math.round(variance / 100),
        mismatchReason: Math.abs(variance) > 100 ? 'Tax amount mismatch' : undefined,
      })
      b2bMap.delete(key)
    } else {
      itcRows.push({
        id: `pr_${pr.id}`,
        gstin: pr.party_gstin,
        supplierName: pr.party_name ?? pr.party_gstin,
        invoiceNo: pr.voucher_number,
        invoiceDate: formatDate(pr.invoice_date),
        invoiceValue: Math.round((pr.grand_total ?? 0) / 100),
        taxableValue: Math.round((pr.total_amount ?? 0) / 100),
        igst: Math.round(prIgst / 100),
        cgst: Math.round(prCgst / 100),
        sgst: Math.round(prSgst / 100),
        totalITC: Math.round(prItc / 100),
        source2B: false,
        sourceBooks: true,
        period: periodLabel,
        status: 'pending',
        mismatchReason: 'Not reported in GSTR-2B',
      })
    }
  }

  // Remaining 2B-only rows
  for (const [, b2b] of b2bMap) {
    const row = b2b as B2bRow
    const igst  = row.igst ?? 0
    const cgst  = row.cgst ?? 0
    const sgst  = row.sgst ?? 0
    const total = igst + cgst + sgst
    itcRows.push({
      id: `b2b_${row.supplier_gstin}_${row.invoice_no}`,
      gstin: row.supplier_gstin,
      supplierName: row.supplier_gstin,   // no supplier name in GSTR-2B data
      invoiceNo: row.invoice_no,
      invoiceDate: formatDate(row.invoice_date),
      invoiceValue: Math.round(((row.taxable_value ?? 0) + total) / 100),
      taxableValue: Math.round((row.taxable_value ?? 0) / 100),
      igst: Math.round(igst / 100),
      cgst: Math.round(cgst / 100),
      sgst: Math.round(sgst / 100),
      totalITC: Math.round(total / 100),
      source2B: true,
      sourceBooks: false,
      period: periodLabel,
      status: 'deferred',
      deferReason: 'Invoice not in purchase register',
    })
  }

  return (
    <ItcClient
      rows={itcRows}
      periods={periods}
      initialPeriod={selectedPeriod}
      periodLabel={periodLabel}
      companyId={companyId}
      gstinId={gstinId}
      hasGstr2b={hasGstr2b}
    />
  )
}
