// Shared penalty calculation logic — used by server actions and client components.
// All monetary inputs/outputs are in RUPEES (not paise) for display purposes.

export type PenaltyBreakdown = {
  daysLate: number
  lateFee: number   // total late fee in ₹
  cgst: number      // late fee split — CGST portion
  sgst: number      // late fee split — SGST portion
  interest: number  // GSTR-3B interest in ₹ (0 for other return types)
  total: number     // lateFee + interest
}

export function calcPenalty(
  returnType: string,
  isNilReturn: boolean,
  dueDate: string,       // ISO date string
  filingDate: string,    // ISO date string (actual or estimated)
  taxPayableRupees = 0,  // for GSTR-3B interest
): PenaltyBreakdown {
  const due  = new Date(dueDate)
  const filed = new Date(filingDate)
  const msPerDay = 86_400_000
  const daysLate = Math.max(0, Math.floor((filed.getTime() - due.getTime()) / msPerDay))

  if (daysLate === 0) return { daysLate: 0, lateFee: 0, cgst: 0, sgst: 0, interest: 0, total: 0 }

  // ── Late fee ──────────────────────────────────────────────────────────────
  let ratePerDay: number
  let cap: number

  if (returnType === 'GSTR-9' || returnType === 'GSTR-9C') {
    ratePerDay = 200
    cap = 10_000
  } else if (isNilReturn) {
    ratePerDay = 20
    cap = 500
  } else {
    ratePerDay = 50
    cap = 2_000
  }

  const lateFee = Math.min(daysLate * ratePerDay, cap)
  const cgst    = lateFee / 2
  const sgst    = lateFee / 2

  // ── Interest (GSTR-3B only) ───────────────────────────────────────────────
  // 18% p.a. on tax payable, simple interest
  const interest =
    returnType === 'GSTR-3B' && taxPayableRupees > 0
      ? Math.round(taxPayableRupees * 0.18 * daysLate / 365)
      : 0

  return { daysLate, lateFee, cgst, sgst, interest, total: lateFee + interest }
}

// Display helper: "₹1,23,456"
export function fmtINR(rupees: number): string {
  if (rupees === 0) return '₹0'
  return '₹' + rupees.toLocaleString('en-IN')
}

// Period label: month+year → "Mar 2026"
export function periodLabel(month: number, year: number): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[month - 1]} ${year}`
}

// Annual return label: period_year = FY start year → "FY 2025-26"
export function fyLabel(startYear: number): string {
  return `FY ${startYear}-${String(startYear + 1).slice(2)}`
}

export const ANNUAL_RETURNS = new Set(['GSTR-9', 'GSTR-9C'])
