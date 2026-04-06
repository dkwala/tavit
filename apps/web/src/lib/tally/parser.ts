// Pure TallyPrime XML parser — extraction only, zero computation.
// Runs in the browser via DOMParser (client component only).

export interface TallyLedger {
  name: string
  parent: string
  openingBalance: string  // raw Tally string, e.g. "150000.00" or ""
  closingBalance: string
}

export interface TallyVoucherCount {
  type: string   // "Sales", "Purchase", "Journal", …
  count: number
}

export interface TallyEntry {
  date: string          // "DD/MM/YYYY" converted from raw YYYYMMDD
  voucherType: string
  voucherNumber: string
  party: string
  amount: string        // raw string — no sign interpretation
  narration: string
}

export interface TallyParseResult {
  // Scalar counts — same names as old ParsedSummary so page.tsx needs zero field renames
  vouchers: number
  ledgers: number
  stockItems: number
  companies: string[]
  periodFrom: string | null
  periodTo: string | null
  fileName: string
  fileSizeKb: number

  // Rich extracted data
  ledgerList: TallyLedger[]        // capped at 200
  ledgerTotal: number              // true count before cap
  voucherTypes: TallyVoucherCount[] // sorted desc by count
  entries: TallyEntry[]            // Sales/Purchase/Credit Note/Debit Note only, capped at 500
  entryTotal: number
}

const ENTRY_TYPES = new Set([
  'Sales', 'Purchase',
  'Credit Note', 'Debit Note',
  'Sales Order', 'Purchase Order',
])

function text(el: Element | null, selector: string): string {
  if (!el) return ''
  return el.querySelector(selector)?.textContent?.trim() ?? ''
}

function toDisplayDate(raw: string): string {
  return raw.length === 8
    ? `${raw.slice(6)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`
    : raw
}

export function parseTallyXml(
  xmlString: string,
  fileName: string,
  fileSize: number,
): TallyParseResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('Malformed XML: ' + (parseError.textContent?.slice(0, 120) ?? 'parse failed'))
  }

  // ── Company names ────────────────────────────────────────────────────────────
  const companies = [
    ...new Set(
      Array.from(doc.querySelectorAll('COMPANYNAME'))
        .map(el => el.textContent?.trim() ?? '')
        .filter(Boolean)
    ),
  ]

  // ── Ledger masters ───────────────────────────────────────────────────────────
  const allLedgerEls = Array.from(doc.querySelectorAll('LEDGER'))

  const rawLedgers: TallyLedger[] = allLedgerEls
    .map(el => ({
      name:           (el.getAttribute('NAME') ?? text(el, 'NAME')).trim(),
      parent:         text(el, 'PARENT'),
      openingBalance: text(el, 'OPENINGBALANCE'),
      closingBalance: text(el, 'CLOSINGBALANCE'),
    }))
    .filter(l => l.name.length > 0)

  const ledgerTotal = rawLedgers.length
  const ledgerList  = rawLedgers.slice(0, 200)

  // ── Vouchers ─────────────────────────────────────────────────────────────────
  const voucherEls = Array.from(doc.querySelectorAll('VOUCHER'))

  const typeCounts = new Map<string, number>()
  const rawEntries: TallyEntry[] = []

  for (const el of voucherEls) {
    const vchType =
      (el.getAttribute('VCHTYPE') ?? text(el, 'VOUCHERTYPENAME') ?? 'Other').trim() || 'Other'

    typeCounts.set(vchType, (typeCounts.get(vchType) ?? 0) + 1)

    if (ENTRY_TYPES.has(vchType)) {
      const rawDate = text(el, 'DATE')
      rawEntries.push({
        date:          /^\d{8}$/.test(rawDate) ? toDisplayDate(rawDate) : rawDate,
        voucherType:   vchType,
        voucherNumber: text(el, 'VOUCHERNUMBER'),
        party:         text(el, 'PARTYLEDGERNAME'),
        amount:        text(el, 'AMOUNT'),
        narration:     text(el, 'NARRATION'),
      })
    }
  }

  const voucherTypes: TallyVoucherCount[] = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  const entryTotal = rawEntries.length
  const entries    = rawEntries.slice(0, 500)

  // ── Date range (across all vouchers) ────────────────────────────────────────
  const sortedDates = voucherEls
    .map(el => text(el, 'DATE'))
    .filter(d => /^\d{8}$/.test(d))
    .sort()

  const periodFrom = sortedDates.length > 0 ? toDisplayDate(sortedDates[0]) : null
  const periodTo   = sortedDates.length > 0 ? toDisplayDate(sortedDates[sortedDates.length - 1]) : null

  return {
    vouchers:   voucherEls.length,
    ledgers:    ledgerTotal,
    stockItems: doc.querySelectorAll('STOCKITEM').length,
    companies:  companies.length > 0 ? companies : ['Unknown company'],
    periodFrom,
    periodTo,
    fileName,
    fileSizeKb: Math.round(fileSize / 1024),
    ledgerList,
    ledgerTotal,
    voucherTypes,
    entries,
    entryTotal,
  }
}
