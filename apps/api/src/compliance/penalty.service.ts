import { Injectable } from '@nestjs/common'

export type PenaltyResult = {
  daysLate: number
  lateFee: number    // ₹
  cgst: number       // ₹
  sgst: number       // ₹
  interest: number   // ₹ (GSTR-3B only)
  total: number      // ₹
}

@Injectable()
export class PenaltyService {
  calculate(
    returnType: string,
    isNilReturn: boolean,
    dueDate: Date,
    filingDate: Date,
    taxPayablePaise = 0,
  ): PenaltyResult {
    const msPerDay = 86_400_000
    const daysLate = Math.max(
      0,
      Math.floor((filingDate.getTime() - dueDate.getTime()) / msPerDay),
    )

    if (daysLate === 0) {
      return { daysLate: 0, lateFee: 0, cgst: 0, sgst: 0, interest: 0, total: 0 }
    }

    // ── Late fee ────────────────────────────────────────────────────────────
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

    // ── Interest (GSTR-3B only) — 18% p.a. simple interest on tax payable ──
    const taxPayableRupees = taxPayablePaise / 100
    const interest =
      returnType === 'GSTR-3B' && taxPayableRupees > 0
        ? Math.round(taxPayableRupees * 0.18 * daysLate / 365)
        : 0

    return { daysLate, lateFee, cgst, sgst, interest, total: lateFee + interest }
  }
}
