'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ITCStatus = 'eligible' | 'pending' | 'blocked' | 'deferred'
type TabKey = 'matched' | 'unmatched' | '2b_only'
type SortDir = 'asc' | 'desc'
type SortKey = keyof ITCRow

export interface ITCRow {
  id: string
  gstin: string
  supplierName: string
  invoiceNo: string
  invoiceDate: string
  invoiceValue: number   // rupees
  taxableValue: number   // rupees
  igst: number           // rupees
  cgst: number           // rupees
  sgst: number           // rupees
  totalITC: number       // rupees
  source2B: boolean
  sourceBooks: boolean
  period: string
  status: ITCStatus
  variance?: number        // rupees: PR ITC minus 2B ITC
  blockReason?: string
  mismatchReason?: string
  deferReason?: string
}

interface Toast {
  id: number
  msg: string
  icon: string
}

export interface PeriodOption {
  value: string   // "2026-03"
  label: string   // "Mar 2026"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtShort = (n: number) => {
  const v = Math.abs(n)
  if (v >= 10_000_000) return '₹' + (v / 10_000_000).toFixed(2) + 'Cr'
  if (v >= 100_000)    return '₹' + (v / 100_000).toFixed(2) + 'L'
  return fmt(n)
}

function exportCSV(rows: ITCRow[], tabLabel: string, period: string) {
  const hasBlock    = rows.some(r => r.blockReason)
  const hasMismatch = rows.some(r => r.mismatchReason)
  const hasDefer    = rows.some(r => r.deferReason)

  const headers = [
    'GSTIN', 'Supplier Name', 'Invoice No.', 'Invoice Date',
    'Invoice Value', 'Taxable Value', 'IGST', 'CGST', 'SGST',
    'Total ITC', 'In GSTR-2B', 'In Books', 'Status',
    ...(hasBlock    ? ['Block Reason']    : []),
    ...(hasMismatch ? ['Mismatch Reason'] : []),
    ...(hasDefer    ? ['Deferral Reason'] : []),
  ]
  const csvRows = rows.map(r => [
    r.gstin, `"${r.supplierName}"`, r.invoiceNo, r.invoiceDate,
    r.invoiceValue, r.taxableValue, r.igst, r.cgst, r.sgst,
    r.totalITC, r.source2B ? 'Yes' : 'No', r.sourceBooks ? 'Yes' : 'No', r.status,
    ...(hasBlock    ? [`"${r.blockReason    ?? ''}"`] : []),
    ...(hasMismatch ? [`"${r.mismatchReason ?? ''}"`] : []),
    ...(hasDefer    ? [`"${r.deferReason    ?? ''}"`] : []),
  ])
  const content = [headers, ...csvRows].map(row => row.join(',')).join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `itc-${tabLabel.toLowerCase().replace(/\s+/g, '-')}-${period.replace(' ', '-')}.csv`,
  })
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Status + Tab config ──────────────────────────────────────────────────────

const S = {
  eligible: { label: 'ITC Eligible',  dot: '#2e7d32', bg: 'rgba(46,125,50,0.07)',  text: '#1b5e20', border: 'rgba(46,125,50,0.28)', row: 'rgba(46,125,50,0.03)' },
  pending:  { label: 'ITC Pending',   dot: '#c8a032', bg: 'rgba(200,160,50,0.09)', text: '#7a5800', border: 'rgba(200,160,50,0.30)', row: 'rgba(200,160,50,0.04)' },
  blocked:  { label: 'ITC Blocked',   dot: '#c04040', bg: 'rgba(192,64,64,0.07)',  text: '#7a1e1e', border: 'rgba(192,64,64,0.26)', row: 'rgba(192,64,64,0.04)' },
  deferred: { label: 'ITC Deferred',  dot: '#1565c0', bg: 'rgba(21,101,192,0.07)', text: '#0d47a1', border: 'rgba(21,101,192,0.26)', row: 'rgba(21,101,192,0.04)' },
} as const

const TC: Record<TabKey, { label: string; activeColor: string; activeBorder: string; badgeBg: string; badgeText: string }> = {
  matched:   { label: 'Matched',   activeColor: '#1b5e20', activeBorder: '#2e7d32', badgeBg: 'rgba(46,125,50,0.10)',   badgeText: '#2e7d32' },
  unmatched: { label: 'Unmatched', activeColor: '#7a1e1e', activeBorder: '#c04040', badgeBg: 'rgba(192,64,64,0.10)',   badgeText: '#c04040' },
  '2b_only': { label: '2B Only',   activeColor: '#0d47a1', activeBorder: '#1565c0', badgeBg: 'rgba(21,101,192,0.10)',  badgeText: '#1565c0' },
}

const tabRows = (tab: TabKey, rows: ITCRow[]) =>
  rows.filter(r =>
    tab === 'matched'   ? r.status === 'eligible' :
    tab === 'unmatched' ? r.status === 'pending' || r.status === 'blocked' :
    r.status === 'deferred'
  )

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ rows }: { rows: ITCRow[] }) {
  const cards = [
    { key: 'eligible' as ITCStatus, label: 'ITC Eligible',  topColor: '#2e7d32', textColor: '#2e7d32' },
    { key: 'pending'  as ITCStatus, label: 'ITC Pending',   topColor: '#c8a032', textColor: '#7a5800' },
    { key: 'blocked'  as ITCStatus, label: 'ITC Blocked',   topColor: '#c04040', textColor: '#c04040' },
    { key: 'deferred' as ITCStatus, label: 'ITC Deferred',  topColor: '#1565c0', textColor: '#1565c0' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {cards.map(c => {
        const subset = rows.filter(r => r.status === c.key)
        const amount = subset.reduce((s, r) => s + r.totalITC, 0)
        return (
          <div key={c.key} style={{
            background: '#fff', border: '0.5px solid #dde0cc',
            borderRadius: 10, padding: '16px 18px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.topColor }} />
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: '#9aa090', marginBottom: 10 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: c.textColor, letterSpacing: '-0.5px', marginBottom: 6 }}>
              {fmtShort(amount)}
            </div>
            <div style={{ fontSize: 12, color: '#9aa090', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10, background: S[c.key].bg, color: S[c.key].text }}>
                {subset.length} inv
              </span>
              <span>{
                c.key === 'eligible' ? 'Matched & claimable' :
                c.key === 'pending'  ? 'Follow-up required' :
                c.key === 'blocked'  ? 'Sec 17(5) — non-claimable' :
                'In 2B, not in PR'
              }</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Copy to GSTR-3B banner ───────────────────────────────────────────────────

function CopyBanner({ eligible, onCopy, pushed }: {
  eligible: ITCRow[]
  onCopy: (args: { igst: number; cgst: number; sgst: number; total: number }) => void
  pushed: boolean
}) {
  const igst  = eligible.reduce((s, r) => s + r.igst, 0)
  const cgst  = eligible.reduce((s, r) => s + r.cgst, 0)
  const sgst  = eligible.reduce((s, r) => s + r.sgst, 0)
  const total = eligible.reduce((s, r) => s + r.totalITC, 0)

  return (
    <div style={{
      background: '#1e2118', border: '0.5px solid rgba(90,122,58,0.3)',
      borderRadius: 10, padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 13, color: 'rgba(232,221,181,0.65)' }}>
          <span style={{ color: '#9cc47a', fontWeight: 600 }}>{eligible.length} eligible invoices</span>
          {' '}ready to push to GSTR-3B Table 4(A).
        </span>
        <div style={{ fontSize: 12, color: 'rgba(232,221,181,0.4)', marginTop: 3 }}>
          IGST {fmt(igst)} · CGST {fmt(cgst)} · SGST {fmt(sgst)}
        </div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#9cc47a', letterSpacing: '-0.5px', flexShrink: 0 }}>
        {fmtShort(total)}
      </div>
      <button
        onClick={() => onCopy({ igst, cgst, sgst, total })}
        disabled={pushed}
        style={{
          background: pushed ? 'rgba(90,122,58,0.3)' : '#9cc47a',
          color: pushed ? '#9cc47a' : '#1e2118',
          border: 'none', fontSize: 12, fontWeight: 600,
          padding: '8px 16px', borderRadius: 7,
          cursor: pushed ? 'default' : 'pointer', flexShrink: 0,
          transition: 'all 0.15s',
        }}
      >
        {pushed ? '✓ Copied' : '↗ Copy to GSTR-3B Table 4'}
      </button>
    </div>
  )
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: ITCStatus }) {
  const m = S[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600,
      background: m.bg, color: m.text, border: `0.5px solid ${m.border}`,
      padding: '2px 9px', borderRadius: 20, whiteSpace: 'nowrap' as const,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, display: 'inline-block', flexShrink: 0 }} />
      {m.label}
    </span>
  )
}

// ─── Diff chip ────────────────────────────────────────────────────────────────

function DiffChip({ value }: { value: number }) {
  if (value === 0) return <span style={{ fontSize: 12, color: '#c8cdb8' }}>—</span>
  const pos = value > 0
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
      background: pos ? 'rgba(46,125,50,0.08)' : 'rgba(192,64,64,0.08)',
      color: pos ? '#2e7d32' : '#c04040',
    }}>
      {pos ? '+' : ''}{fmt(value)}
    </span>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

function ReconcTable({ rows, tab, onExport }: {
  rows: ITCRow[]
  tab: TabKey
  onExport: (rows: ITCRow[]) => void
}) {
  const [query, setQuery]         = useState('')
  const [statusFilter, setStatus] = useState<ITCStatus | 'all'>('all')
  const [sortKey, setSortKey]     = useState<SortKey>('invoiceDate')
  const [sortDir, setSortDir]     = useState<SortDir>('asc')

  const statuses = useMemo(() => [...new Set(rows.map(r => r.status))], [rows])

  const filtered = useMemo(() => {
    let r = rows
    if (statusFilter !== 'all') r = r.filter(x => x.status === statusFilter)
    if (query.trim()) {
      const q = query.toLowerCase()
      r = r.filter(x =>
        x.gstin.toLowerCase().includes(q) ||
        x.supplierName.toLowerCase().includes(q) ||
        x.invoiceNo.toLowerCase().includes(q) ||
        (x.mismatchReason?.toLowerCase().includes(q) ?? false) ||
        (x.blockReason?.toLowerCase().includes(q) ?? false) ||
        (x.deferReason?.toLowerCase().includes(q) ?? false)
      )
    }
    return [...r].sort((a, b) => {
      const av = a[sortKey] as string | number, bv = b[sortKey] as string | number
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, query, statusFilter, sortKey, sortDir])

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const Th = ({ col, children, align = 'left' }: { col: SortKey; children: React.ReactNode; align?: 'left' | 'right' }) => (
    <th
      onClick={() => toggleSort(col)}
      style={{
        fontSize: 11, fontWeight: 500, color: '#9aa090',
        textTransform: 'uppercase' as const, letterSpacing: '0.05em',
        padding: '10px 14px', textAlign: align,
        cursor: 'pointer', userSelect: 'none' as const, whiteSpace: 'nowrap' as const,
        background: '#f7f8f3', borderBottom: '0.5px solid #dde0cc',
      }}
    >
      {children}
      <span style={{ marginLeft: 4, color: sortKey === col ? '#5a7a3a' : '#c8cdb8' }}>
        {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  )

  const totals = {
    taxable: filtered.reduce((s, r) => s + r.taxableValue, 0),
    igst:    filtered.reduce((s, r) => s + r.igst, 0),
    cgst:    filtered.reduce((s, r) => s + r.cgst, 0),
    sgst:    filtered.reduce((s, r) => s + r.sgst, 0),
    itc:     filtered.reduce((s, r) => s + r.totalITC, 0),
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0 10px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="5.5" cy="5.5" r="4" stroke="#9aa090" strokeWidth="1.2"/>
            <path d="M9 9l2.5 2.5" stroke="#9aa090" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search supplier, GSTIN, invoice…"
            style={{
              width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              fontSize: 13, color: '#1e2118', background: '#fff',
              border: '0.5px solid #dde0cc', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const,
            }}
          />
        </div>

        {statuses.length > 1 && (
          <select
            value={statusFilter}
            onChange={e => setStatus(e.target.value as ITCStatus | 'all')}
            style={{
              fontSize: 13, color: '#1e2118', background: '#fff',
              border: '0.5px solid #dde0cc', borderRadius: 8,
              padding: '7px 10px', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="all">All statuses</option>
            {statuses.map(s => <option key={s} value={s}>{S[s].label}</option>)}
          </select>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#9aa090', fontVariantNumeric: 'tabular-nums' }}>
            {filtered.length} of {rows.length}
          </span>
          <button
            onClick={() => onExport(filtered)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 12, fontWeight: 500,
              background: 'rgba(90,122,58,0.07)', color: '#5a7a3a',
              border: '0.5px solid rgba(90,122,58,0.25)', borderRadius: 8,
              cursor: 'pointer', whiteSpace: 'nowrap' as const,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v7M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1 9.5v.5a1 1 0 001 1h8a1 1 0 001-1V9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid #dde0cc', borderRadius: 10, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1e2118', marginBottom: 4 }}>No results</div>
            <div style={{ fontSize: 12, color: '#9aa090' }}>Try clearing the search or status filter</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th col="gstin">GSTIN</Th>
                <Th col="supplierName">Supplier</Th>
                <Th col="invoiceNo">Invoice</Th>
                <Th col="invoiceDate">Date</Th>
                <Th col="taxableValue" align="right">Taxable</Th>
                <Th col="igst" align="right">IGST</Th>
                <Th col="cgst" align="right">CGST/SGST</Th>
                <Th col="totalITC" align="right">Total ITC</Th>
                {tab === 'matched'   && <th style={{ fontSize: 11, fontWeight: 500, color: '#9aa090', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 14px', textAlign: 'center', background: '#f7f8f3', borderBottom: '0.5px solid #dde0cc', whiteSpace: 'nowrap' }}>Variance</th>}
                {tab === 'unmatched' && <th style={{ fontSize: 11, fontWeight: 500, color: '#9aa090', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 14px', textAlign: 'left',   background: '#f7f8f3', borderBottom: '0.5px solid #dde0cc', whiteSpace: 'nowrap', minWidth: 180 }}>Reason</th>}
                {tab === '2b_only'   && <th style={{ fontSize: 11, fontWeight: 500, color: '#9aa090', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 14px', textAlign: 'left',   background: '#f7f8f3', borderBottom: '0.5px solid #dde0cc', whiteSpace: 'nowrap', minWidth: 220 }}>Deferral Reason</th>}
                <th style={{ fontSize: 11, fontWeight: 500, color: '#9aa090', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 14px', background: '#f7f8f3', borderBottom: '0.5px solid #dde0cc' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const sm = S[row.status]
                return (
                  <tr
                    key={row.id}
                    style={{ background: i % 2 === 0 ? '#fff' : sm.row, borderBottom: '0.5px solid #f0f1e8', transition: 'background 0.1s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(90,122,58,0.04)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? '#fff' : sm.row }}
                  >
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 12, color: '#1e2118', fontFamily: 'var(--font-geist-mono, monospace)', letterSpacing: '0.02em' }}>{row.gstin}</span>
                    </td>
                    <td style={{ padding: '11px 14px', maxWidth: 180 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1e2118', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.supplierName}</div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 12, color: '#4a6630', fontWeight: 500, fontFamily: 'var(--font-geist-mono, monospace)' }}>{row.invoiceNo}</span>
                    </td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 12, color: '#6b7061' }}>{row.invoiceDate}</span>
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ fontSize: 13, color: '#1e2118' }}>{fmt(row.taxableValue)}</span>
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ fontSize: 13, color: row.igst > 0 ? '#1e2118' : '#c8cdb8' }}>{row.igst > 0 ? fmt(row.igst) : '—'}</span>
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {row.cgst > 0
                        ? <span style={{ fontSize: 13, color: '#1e2118' }}>{fmt(row.cgst)}+{fmt(row.sgst)}</span>
                        : <span style={{ fontSize: 13, color: '#c8cdb8' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: sm.text }}>{fmt(row.totalITC)}</span>
                    </td>

                    {tab === 'matched' && (
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <DiffChip value={row.variance ?? 0} />
                      </td>
                    )}
                    {tab === 'unmatched' && (
                      <td style={{ padding: '11px 14px', maxWidth: 220 }}>
                        {row.blockReason ? (
                          <span style={{ fontSize: 11, color: '#c04040', background: 'rgba(192,64,64,0.07)', padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 200 }} title={row.blockReason}>
                            {row.blockReason}
                          </span>
                        ) : row.mismatchReason ? (
                          <span style={{ fontSize: 11, color: '#7a5800', background: 'rgba(200,160,50,0.09)', padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 200 }} title={row.mismatchReason}>
                            {row.mismatchReason}
                          </span>
                        ) : <span style={{ color: '#c8cdb8', fontSize: 12 }}>—</span>}
                      </td>
                    )}
                    {tab === '2b_only' && (
                      <td style={{ padding: '11px 14px', maxWidth: 240 }}>
                        <span style={{ fontSize: 11, color: '#0d47a1', background: 'rgba(21,101,192,0.07)', padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 220 }} title={row.deferReason}>
                          {row.deferReason ?? '—'}
                        </span>
                      </td>
                    )}

                    <td style={{ padding: '11px 14px' }}>
                      <StatusPill status={row.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f7f8f3', borderTop: '1.5px solid #dde0cc' }}>
                <td colSpan={4} style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: '#6b7061' }}>
                  {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
                  {(query || statusFilter !== 'all') && <span style={{ fontWeight: 400, color: '#9aa090' }}> (filtered)</span>}
                </td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#1e2118', fontVariantNumeric: 'tabular-nums' }}>{fmt(totals.taxable)}</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#1e2118', fontVariantNumeric: 'tabular-nums' }}>{fmt(totals.igst)}</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#1e2118', fontVariantNumeric: 'tabular-nums' }}>{fmt(totals.cgst)}+{fmt(totals.sgst)}</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                  color: tab === 'matched' ? '#2e7d32' : tab === 'unmatched' ? '#c04040' : '#1565c0' }}>
                  {fmt(totals.itc)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Toast stack ──────────────────────────────────────────────────────────────

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: '#1e2118', color: '#e8ddb5',
          padding: '11px 16px', borderRadius: 9, fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          animation: 'itc-toast-in 0.25s ease',
        }}>
          <span style={{ color: '#9cc47a' }}>{t.icon}</span>
          <span>{t.msg}</span>
        </div>
      ))}
      <style>{`@keyframes itc-toast-in { from { transform: translateY(16px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
    </div>
  )
}

// ─── Main client component ────────────────────────────────────────────────────

interface Props {
  rows: ITCRow[]
  periods: PeriodOption[]
  initialPeriod: string    // "2026-03"
  periodLabel: string      // "Mar 2026"
  companyId: string
  gstinId: string
  hasGstr2b: boolean
}

export function ItcClient({ rows, periods, initialPeriod, periodLabel, companyId, gstinId, hasGstr2b }: Props) {
  const router  = useRouter()
  const [tab, setTab]       = useState<TabKey>('matched')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [pushed, setPushed] = useState(false)

  const counts = {
    matched:   tabRows('matched',   rows).length,
    unmatched: tabRows('unmatched', rows).length,
    '2b_only': tabRows('2b_only',   rows).length,
  }

  const eligible = useMemo(() => rows.filter(r => r.status === 'eligible'), [rows])

  function toast(msg: string, icon = '✓') {
    const id = Date.now()
    setToasts(ts => [...ts, { id, msg, icon }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3200)
  }

  function handleCopy({ igst, cgst, sgst, total }: { igst: number; cgst: number; sgst: number; total: number }) {
    try {
      localStorage.setItem('itc_push_latest', JSON.stringify({ igst, cgst, sgst, total, period: periodLabel, pushedAt: new Date().toISOString() }))
    } catch { /* ignore */ }
    setPushed(true)
    toast(`ITC ${fmtShort(total)} pushed to GSTR-3B Table 4(A)`, '↗')
  }

  function handleExport(exportRows: ITCRow[]) {
    exportCSV(exportRows, TC[tab].label, periodLabel)
    toast(`${TC[tab].label} exported — ${exportRows.length} rows`, '↓')
  }

  function handlePeriodChange(value: string) {
    setPushed(false)
    router.push(`/dashboard/itc?period=${value}`)
  }

  const importHref = `/dashboard/itc/import?companyId=${encodeURIComponent(companyId)}&gstinId=${encodeURIComponent(gstinId)}&period=${encodeURIComponent(initialPeriod)}`

  return (
    <div style={{ padding: '32px 32px', maxWidth: 1300, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(90,122,58,0.08)', border: '0.5px solid rgba(90,122,58,0.2)', borderRadius: 20, padding: '3px 12px', marginBottom: 10 }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1 5.5h9M5.5 2l3.5 3.5L5.5 9" stroke="#5a7a3a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 11, color: '#5a7a3a', fontWeight: 500, letterSpacing: '0.05em' }}>ITC Reconciliation</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e2118', letterSpacing: '-0.4px', marginBottom: 4 }}>
            Input Tax Credit
          </h1>
          <p style={{ fontSize: 13, color: '#6b7061' }}>Match GSTR-2B against your purchase register and claim eligible ITC.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/dashboard/returns" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 500, color: '#6b7061', background: '#fff', border: '0.5px solid #dde0cc', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            ← GSTR-3B Draft
          </Link>
          <a href={importHref} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 500, color: '#5a7a3a', background: 'rgba(90,122,58,0.07)', border: '0.5px solid rgba(90,122,58,0.25)', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            ↑ Import GSTR-2B
          </a>
          {periods.length > 0 && (
            <>
              <label style={{ fontSize: 12, color: '#6b7061', fontWeight: 500 }}>Period</label>
              <select
                value={initialPeriod}
                onChange={e => handlePeriodChange(e.target.value)}
                style={{
                  fontSize: 13, color: '#1e2118', background: '#fff',
                  border: '0.5px solid #dde0cc', borderRadius: 8,
                  padding: '7px 28px 7px 12px', cursor: 'pointer', outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239aa090' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                }}
              >
                {periods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Empty state — no GSTR-2B for this period */}
      {!hasGstr2b && (
        <div style={{
          background: '#fff', border: '0.5px solid #dde0cc', borderRadius: 12,
          padding: '48px 32px', textAlign: 'center', marginBottom: 24,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>↑</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#1e2118', marginBottom: 6 }}>
            No GSTR-2B data for {periodLabel}
          </div>
          <div style={{ fontSize: 13, color: '#6b7061', marginBottom: 20 }}>
            Import your GSTR-2B from the GST portal to enable ITC reconciliation.
          </div>
          <a
            href={importHref}
            style={{
              display: 'inline-block', background: '#1e2118', color: '#9cc47a',
              border: 'none', fontSize: 13, fontWeight: 600,
              padding: '10px 20px', borderRadius: 7, textDecoration: 'none',
            }}
          >
            Import GSTR-2B →
          </a>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ marginBottom: 20 }}>
        <SummaryCards rows={rows} />
      </div>

      {/* Copy banner (matched tab only, only when there are eligible rows) */}
      {tab === 'matched' && eligible.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <CopyBanner eligible={eligible} onCopy={handleCopy} pushed={pushed} />
        </div>
      )}

      {/* Tab card */}
      {rows.length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #dde0cc', borderRadius: 12, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid #dde0cc', background: '#fafbf7' }}>
            {(['matched', 'unmatched', '2b_only'] as TabKey[]).map(t => {
              const cfg  = TC[t]
              const isAc = tab === t
              const cnt  = counts[t]
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '13px 22px', fontSize: 13,
                    fontWeight: isAc ? 600 : 400,
                    color: isAc ? cfg.activeColor : '#6b7061',
                    background: isAc ? '#fff' : 'transparent',
                    border: 'none',
                    borderBottom: isAc ? `2px solid ${cfg.activeBorder}` : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.15s', marginBottom: -1,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.activeBorder, flexShrink: 0, opacity: isAc ? 1 : 0.4 }} />
                  {cfg.label}
                  <span style={{ fontSize: 11, fontWeight: 600, background: isAc ? cfg.badgeBg : 'rgba(0,0,0,0.05)', color: isAc ? cfg.badgeText : '#9aa090', padding: '1px 7px', borderRadius: 10 }}>
                    {cnt}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Table content */}
          <div style={{ padding: '0 16px 16px' }}>
            <ReconcTable
              key={tab}
              rows={tabRows(tab, rows)}
              tab={tab}
              onExport={handleExport}
            />
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 20, fontSize: 11, color: '#9aa090' }}>
        {[
          { dot: '#2e7d32', text: 'Eligible — matched & claimable' },
          { dot: '#c8a032', text: 'Pending — follow-up with supplier' },
          { dot: '#c04040', text: 'Blocked — Sec 17(5) restricted' },
          { dot: '#1565c0', text: 'Deferred — in GSTR-2B, not in PR' },
        ].map(l => (
          <div key={l.text} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.dot, display: 'inline-block', flexShrink: 0 }} />
            {l.text}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span>Source: GSTR-2B + Purchase Register · {periodLabel}</span>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  )
}
