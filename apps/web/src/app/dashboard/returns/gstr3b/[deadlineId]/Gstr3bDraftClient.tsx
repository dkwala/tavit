'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markFiled } from '@/app/dashboard/compliance/actions'

type TaxComp = { igst: string; cgst: string; sgst: string; cess: string }
type PayRow = { tax_payable: string; tax_paid_through_itc: string; tax_paid_in_cash: string; late_fee: string }
type T31Row = { description: string; taxable_value: string; tax: TaxComp }

export type Gstr3bDraft = {
  gstin: string
  return_period: string
  'table_3.1': {
    '3.1(a)': T31Row; '3.1(b)': T31Row; '3.1(c)': T31Row; '3.1(d)': T31Row; '3.1(e)': T31Row
    total_liability: TaxComp
  }
  'table_4': { '4A_itc_available': TaxComp; '4D(1)_ineligible': TaxComp; net_itc: TaxComp }
  'table_5.1': { inter_state: string; intra_state: string }
  'table_6.1': { igst: PayRow; cgst: PayRow; sgst: PayRow; cess: PayRow }
  excess_itc_carried_forward: TaxComp
}

type Props = {
  draft: Gstr3bDraft
  deadlineId: string
  gstinLabel: string
  periodLabel: string
  companyName: string
}

type Toast = { id: number; msg: string; icon: string }
type Section = 'info' | 'summary' | 't31' | 't4' | 't51' | 't61'

const fmt = (v: string | number) => {
  const n = parseFloat(String(v).replace(/,/g, ''))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const parse = (v: string | number) => parseFloat(String(v).replace(/,/g, '')) || 0

function FieldCell({
  engineValue, overrides, fieldKey, onOverride, readOnly = false,
}: {
  engineValue: string
  overrides: Record<string, string>
  fieldKey: string
  onOverride: (key: string, val: string) => void
  readOnly?: boolean
}) {
  const current = overrides[fieldKey] ?? engineValue
  const modified = !readOnly && Math.abs(parse(current) - parse(engineValue)) > 0.001
  const delta = parse(current) - parse(engineValue)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
      <input
        value={current}
        readOnly={readOnly}
        onChange={e => !readOnly && onOverride(fieldKey, e.target.value)}
        onBlur={e => {
          if (!readOnly) {
            const n = parseFloat(e.target.value)
            if (!isNaN(n)) onOverride(fieldKey, n.toFixed(2))
          }
        }}
        style={{
          width: 120, textAlign: 'right',
          fontFamily: 'monospace', fontSize: 12,
          padding: '4px 8px', borderRadius: 5,
          border: `1px solid ${modified ? '#c8a032' : '#dde0cc'}`,
          background: readOnly ? '#f2f3eb' : modified ? 'rgba(200,160,50,0.08)' : 'transparent',
          color: readOnly ? '#9aa090' : modified ? '#6a4800' : '#1e2118',
          outline: 'none',
          cursor: readOnly ? 'default' : 'text',
        }}
      />
      {modified && (
        <div style={{ fontSize: 10, color: '#9aa090', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>Eng: {fmt(engineValue)}</span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 4px', borderRadius: 3,
            background: delta > 0 ? 'rgba(90,122,58,0.1)' : 'rgba(192,64,64,0.1)',
            color: delta > 0 ? '#5a7a3a' : '#c04040',
          }}>
            {delta > 0 ? '+' : ''}{fmt(delta)}
          </span>
        </div>
      )}
    </div>
  )
}

const TABLE_STYLE: React.CSSProperties = {
  background: '#fff',
  border: '0.5px solid #dde0cc',
  borderRadius: 10,
  overflow: 'hidden',
  marginBottom: 24,
}

const TH_STYLE: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: '#9aa090',
  padding: '9px 14px', background: '#f9faf5',
  borderBottom: '0.5px solid #dde0cc', textAlign: 'right',
}

const TD_STYLE: React.CSSProperties = {
  padding: '10px 14px', fontSize: 12, borderBottom: '0.5px solid #dde0cc',
}

function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr>
        <th style={{ ...TH_STYLE, textAlign: 'left', width: '36%' }}>Description</th>
        {cols.map(c => <th key={c} style={TH_STYLE}>{c}</th>)}
      </tr>
    </thead>
  )
}

function Section31({
  draft, overrides, onOverride,
}: { draft: Gstr3bDraft; overrides: Record<string, string>; onOverride: (k: string, v: string) => void }) {
  const t31 = draft['table_3.1']
  const ROWS: Array<{ key: keyof typeof t31; label: string; id: string; noTax?: boolean }> = [
    { key: '3.1(a)', id: 'a', label: '(a) Outward taxable supplies (other than zero rated, nil & exempted)' },
    { key: '3.1(b)', id: 'b', label: '(b) Outward taxable supplies — Zero Rated' },
    { key: '3.1(c)', id: 'c', label: '(c) Other outward supplies (Nil rated, Exempted)' },
    { key: '3.1(d)', id: 'd', label: '(d) Inward supplies liable to reverse charge' },
    { key: '3.1(e)', id: 'e', label: '(e) Non-GST outward supplies', noTax: true },
  ]
  const taxCols = ['igst', 'cgst', 'sgst', 'cess'] as const

  return (
    <div style={TABLE_STYLE}>
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #dde0cc', background: '#f9faf5' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e2118' }}>Table 3.1 — Outward and Inward Supplies</div>
        <div style={{ fontSize: 11, color: '#9aa090', marginTop: 2 }}>Nature of supplies and applicable taxes</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <THead cols={['Taxable Value (₹)', 'IGST (₹)', 'CGST (₹)', 'SGST (₹)', 'Cess (₹)']} />
        <tbody>
          {ROWS.map(row => {
            const eng = t31[row.key] as T31Row
            return (
              <tr key={row.id}>
                <td style={{ ...TD_STYLE, color: '#6b7061', fontSize: 11 }}>{row.label}</td>
                <td style={{ ...TD_STYLE, textAlign: 'right' }}>
                  <FieldCell engineValue={eng.taxable_value} overrides={overrides} fieldKey={`3.1.${row.id}.taxable`} onOverride={onOverride} />
                </td>
                {taxCols.map(tc => (
                  <td key={tc} style={{ ...TD_STYLE, textAlign: 'right' }}>
                    {row.noTax
                      ? <span style={{ fontSize: 12, color: '#9aa090', fontFamily: 'monospace' }}>—</span>
                      : <FieldCell engineValue={eng.tax[tc]} overrides={overrides} fieldKey={`3.1.${row.id}.${tc}`} onOverride={onOverride} />
                    }
                  </td>
                ))}
              </tr>
            )
          })}
          <tr style={{ background: 'rgba(30,33,24,0.04)' }}>
            <td style={{ ...TD_STYLE, fontWeight: 600, color: '#1e2118', fontSize: 12 }}>Total Liability</td>
            <td style={{ ...TD_STYLE, textAlign: 'right' }} />
            {taxCols.map(tc => {
              const total = ROWS.filter(r => !r.noTax).reduce((s, r) => {
                const eng = t31[r.key] as T31Row
                return s + parse(overrides[`3.1.${r.id}.${tc}`] ?? eng.tax[tc])
              }, 0)
              return (
                <td key={tc} style={{ ...TD_STYLE, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#1e2118' }}>
                  {fmt(total)}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Section4({
  draft, overrides, onOverride,
}: { draft: Gstr3bDraft; overrides: Record<string, string>; onOverride: (k: string, v: string) => void }) {
  const t4 = draft['table_4']
  const taxCols = ['igst', 'cgst', 'sgst', 'cess'] as const

  const netItc = (tc: typeof taxCols[number]) => {
    const avail = parse(overrides[`4.avail.${tc}`] ?? t4['4A_itc_available'][tc])
    const inelig = parse(overrides[`4.inelig.${tc}`] ?? t4['4D(1)_ineligible'][tc])
    return Math.max(0, avail - inelig)
  }

  return (
    <div style={TABLE_STYLE}>
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #dde0cc', background: '#f9faf5' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e2118' }}>Table 4 — Input Tax Credit</div>
        <div style={{ fontSize: 11, color: '#9aa090', marginTop: 2 }}>ITC available, ineligible, and net eligible</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <THead cols={['IGST (₹)', 'CGST (₹)', 'SGST (₹)', 'Cess (₹)']} />
        <tbody>
          <tr>
            <td style={{ ...TD_STYLE, color: '#6b7061', fontSize: 11 }}>4(A) ITC Available — All other ITC</td>
            {taxCols.map(tc => (
              <td key={tc} style={{ ...TD_STYLE, textAlign: 'right' }}>
                <FieldCell engineValue={t4['4A_itc_available'][tc]} overrides={overrides} fieldKey={`4.avail.${tc}`} onOverride={onOverride} />
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ ...TD_STYLE, color: '#6b7061', fontSize: 11 }}>4(D)(1) Ineligible ITC — Rules 42 &amp; 43</td>
            {taxCols.map(tc => (
              <td key={tc} style={{ ...TD_STYLE, textAlign: 'right' }}>
                <FieldCell engineValue={t4['4D(1)_ineligible'][tc]} overrides={overrides} fieldKey={`4.inelig.${tc}`} onOverride={onOverride} />
              </td>
            ))}
          </tr>
          <tr style={{ background: 'rgba(90,122,58,0.06)' }}>
            <td style={{ ...TD_STYLE, fontWeight: 600, color: '#5a7a3a', fontSize: 12 }}>4(C) Net ITC [A − D]</td>
            {taxCols.map(tc => (
              <td key={tc} style={{ ...TD_STYLE, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#5a7a3a' }}>
                {fmt(netItc(tc))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Section51({
  draft, overrides, onOverride,
}: { draft: Gstr3bDraft; overrides: Record<string, string>; onOverride: (k: string, v: string) => void }) {
  const t51 = draft['table_5.1']
  return (
    <div style={TABLE_STYLE}>
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #dde0cc', background: '#f9faf5' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e2118' }}>Table 5.1 — Exempt, Nil-Rated &amp; Non-GST Inward Supplies</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '50%' }}>Nature</th>
            <th style={TH_STYLE}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...TD_STYLE, color: '#6b7061', fontSize: 11 }}>Inter-State supplies (exempt / nil / non-GST)</td>
            <td style={{ ...TD_STYLE, textAlign: 'right' }}>
              <FieldCell engineValue={t51.inter_state} overrides={overrides} fieldKey="5.1.inter" onOverride={onOverride} />
            </td>
          </tr>
          <tr style={{ borderBottom: 'none' }}>
            <td style={{ ...TD_STYLE, color: '#6b7061', fontSize: 11, borderBottom: 'none' }}>Intra-State supplies (exempt / nil / non-GST)</td>
            <td style={{ ...TD_STYLE, textAlign: 'right', borderBottom: 'none' }}>
              <FieldCell engineValue={t51.intra_state} overrides={overrides} fieldKey="5.1.intra" onOverride={onOverride} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Section61({ draft }: { draft: Gstr3bDraft }) {
  const t61 = draft['table_6.1']
  const heads = ['igst', 'cgst', 'sgst', 'cess'] as const
  const COLS: Array<{ key: keyof PayRow; label: string }> = [
    { key: 'tax_payable', label: 'Tax Payable (Gross)' },
    { key: 'tax_paid_through_itc', label: 'Paid via ITC' },
    { key: 'tax_paid_in_cash', label: 'Paid in Cash' },
    { key: 'late_fee', label: 'Late Fee' },
  ]
  const totalCash = heads.reduce((s, h) => s + parse(t61[h].tax_paid_in_cash), 0)

  return (
    <div style={TABLE_STYLE}>
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #dde0cc', background: '#f9faf5' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e2118' }}>Table 6.1 — Payment of Tax</div>
        <div style={{ fontSize: 11, color: '#9aa090', marginTop: 2 }}>Section 49(5) ITC utilisation sequence applied</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '12%' }}>Head</th>
            {COLS.map(c => <th key={c.key} style={TH_STYLE}>{c.label} (₹)</th>)}
          </tr>
        </thead>
        <tbody>
          {heads.map(h => (
            <tr key={h}>
              <td style={{ ...TD_STYLE, fontWeight: 600, color: '#1e2118', textTransform: 'uppercase', fontSize: 12 }}>{h}</td>
              {COLS.map(c => (
                <td key={c.key} style={{ ...TD_STYLE, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#1e2118' }}>
                  {fmt(t61[h][c.key])}
                </td>
              ))}
            </tr>
          ))}
          <tr style={{ background: 'rgba(30,33,24,0.04)' }}>
            <td style={{ ...TD_STYLE, fontWeight: 600, color: '#1e2118', fontSize: 12 }}>Total</td>
            {COLS.map(c => {
              const total = heads.reduce((s, h) => s + parse(t61[h][c.key]), 0)
              return (
                <td key={c.key} style={{ ...TD_STYLE, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: c.key === 'tax_paid_in_cash' ? '#c04040' : '#1e2118' }}>
                  {fmt(total)}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
      <div style={{ padding: '12px 16px', borderTop: '0.5px solid #dde0cc', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#6b7061' }}>Total cash payable:</span>
        <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'monospace', color: '#c04040', letterSpacing: '-0.03em' }}>
          ₹{fmt(totalCash)}
        </span>
      </div>
    </div>
  )
}

function TaxSummary({ draft, overrides }: { draft: Gstr3bDraft; overrides: Record<string, string> }) {
  const t31 = draft['table_3.1']
  const t4 = draft['table_4']
  const t61 = draft['table_6.1']

  const ROWS31 = ['a', 'b', 'c', 'd'] as const
  const taxCols = ['igst', 'cgst', 'sgst'] as const

  const grossLiab = taxCols.reduce((acc, tc) => {
    const key = tc as 'igst' | 'cgst' | 'sgst'
    acc[key] = ROWS31.reduce((s, r) => {
      const eng = t31[`3.1(${r})` as keyof typeof t31] as T31Row
      return s + parse(overrides[`3.1.${r}.${tc}`] ?? eng.tax[tc])
    }, 0)
    return acc
  }, {} as Record<string, number>)

  const netItc = taxCols.reduce((acc, tc) => {
    const avail = parse(overrides[`4.avail.${tc}`] ?? t4['4A_itc_available'][tc])
    const inelig = parse(overrides[`4.inelig.${tc}`] ?? t4['4D(1)_ineligible'][tc])
    acc[tc] = Math.max(0, avail - inelig)
    return acc
  }, {} as Record<string, number>)

  const totalCash = (['igst', 'cgst', 'sgst', 'cess'] as const).reduce((s, h) => s + parse(t61[h].tax_paid_in_cash), 0)

  const items = [
    { label: 'IGST Liability', value: grossLiab['igst'] ?? 0 },
    { label: 'CGST Liability', value: grossLiab['cgst'] ?? 0 },
    { label: 'SGST Liability', value: grossLiab['sgst'] ?? 0 },
    { label: 'Net ITC (IGST)', value: netItc['igst'] ?? 0, credit: true },
    { label: 'Net ITC (CGST)', value: netItc['cgst'] ?? 0, credit: true },
    { label: 'Net ITC (SGST)', value: netItc['sgst'] ?? 0, credit: true },
    { label: 'Cash Payable', value: totalCash, highlight: true },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
      {items.map(item => (
        <div key={item.label} style={{
          background: '#fff', border: '0.5px solid #dde0cc',
          borderRadius: 10, padding: '16px 18px',
        }}>
          <div style={{ fontSize: 10, color: '#9aa090', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            {item.label}
          </div>
          <div style={{
            fontSize: item.highlight ? 22 : 18,
            fontWeight: 600, fontFamily: 'monospace',
            color: item.highlight ? '#c04040' : item.credit ? '#5a7a3a' : '#1e2118',
            letterSpacing: '-0.03em',
          }}>
            ₹{fmt(item.value)}
          </div>
          <div style={{ fontSize: 10, color: '#9aa090', marginTop: 4 }}>
            {item.credit ? 'ITC credit' : item.highlight ? 'Amount due' : 'Gross liability'}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Gstr3bDraftClient({ draft, deadlineId, gstinLabel, periodLabel, companyName }: Props) {
  const router = useRouter()
  const storageKey = `gstr3b_overrides_${deadlineId}`

  const [section, setSection] = useState<Section>('info')
  const [overrides, setOverrides] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}') } catch { return {} }
  })
  const [toasts, setToasts] = useState<Toast[]>([])
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [filing, startFilingTransition] = useTransition()

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(overrides)) } catch {}
  }, [overrides, storageKey])

  function onOverride(key: string, val: string) {
    setOverrides(prev => ({ ...prev, [key]: val }))
  }

  function addToast(msg: string, icon = '✓') {
    const id = Date.now()
    setToasts(ts => [...ts, { id, msg, icon }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3000)
  }

  function handleSave() {
    setLastSaved(new Date().toLocaleTimeString('en-IN'))
    addToast('Draft saved')
  }

  function handlePdf() {
    addToast('Opening print dialog…', '↓')
    setTimeout(() => window.print(), 400)
  }

  const modCount = (prefix: string) => Object.keys(overrides).filter(k => k.startsWith(prefix)).length
  const totalMods = Object.keys(overrides).length

  const NAV: Array<{ id: Section; label: string; sub: string; modPrefix?: string }> = [
    { id: 'info',    label: 'Filing Info',       sub: 'GSTIN & period' },
    { id: 'summary', label: 'Tax Summary',        sub: 'Net liability' },
    { id: 't31',     label: '3.1  Outward',       sub: 'Taxable / exempt',   modPrefix: '3.1.' },
    { id: 't4',      label: '4.   ITC',           sub: 'Available / reversed', modPrefix: '4.' },
    { id: 't51',     label: '5.1  Exempt',        sub: 'Nil / non-GST',      modPrefix: '5.1.' },
    { id: 't61',     label: '6.1  Payment',       sub: 'Cash / ITC / late fee' },
  ]

  const TITLES: Record<Section, [string, string]> = {
    info:    ['Filing Info', 'Taxpayer details and return period'],
    summary: ['Tax Summary', 'Computed net tax liability'],
    t31:     ['3.1  Outward Supplies', 'Details of all outward and inward supplies'],
    t4:      ['4.   Input Tax Credit', 'ITC available, reversed, and net eligible ITC'],
    t51:     ['5.1  Exempt & Nil', 'Aggregate value of exempt, nil-rated, and non-GST supplies'],
    t61:     ['6.1  Payment of Tax', 'Section 49(5) ITC utilisation and cash payment'],
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f2f3eb' }}>
      {/* Disclaimer */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#1e2118', color: '#9cc47a',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 24px', fontSize: 12, fontWeight: 500,
      }}>
        <span>⚠</span>
        <strong style={{ color: '#b8d89a' }}>Disclaimer:</strong>
        <span style={{ color: '#b8d89a' }}>&nbsp;Verify all values with your CA before filing on&nbsp;</span>
        <span style={{ color: '#9cc47a', textDecoration: 'underline' }}>gst.gov.in</span>
        <span style={{ color: '#b8d89a' }}>. This draft does not constitute a filed return.</span>
        {lastSaved && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#7ea860' }}>
            Last saved {lastSaved}
          </span>
        )}
      </div>

      {/* Sub-header */}
      <div style={{
        background: '#fff', borderBottom: '0.5px solid #dde0cc',
        display: 'flex', alignItems: 'center', padding: '0 24px', height: 52,
        position: 'sticky', top: 38, zIndex: 19,
      }}>
        <button
          onClick={() => router.push('/dashboard/returns')}
          style={{ background: 'none', border: 'none', color: '#9aa090', cursor: 'pointer', fontSize: 12, marginRight: 16, padding: 0 }}
        >
          ← Returns
        </button>
        <div style={{ display: 'flex', gap: 0, flex: 1 }}>
          {[['GSTIN', gstinLabel], ['Period', periodLabel], ['Entity', companyName], ['Overrides', totalMods > 0 ? `${totalMods} field${totalMods > 1 ? 's' : ''}` : 'None']].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', padding: '0 16px', borderRight: '0.5px solid #dde0cc' }}>
              <span style={{ fontSize: 9, color: '#9aa090', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: l === 'Overrides' && totalMods > 0 ? '#c8a032' : '#1e2118', fontFamily: 'monospace' }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button onClick={handlePdf} style={BTN_GHOST}>↓ Export PDF</button>
          <button onClick={handleSave} style={BTN_GHOST}>Save Draft</button>
          <button
            disabled={filing}
            onClick={() => startFilingTransition(async () => {
              await markFiled(deadlineId)
              addToast('Return marked as filed')
              router.push('/dashboard/returns')
            })}
            style={BTN_PRIMARY}
          >
            {filing ? 'Filing…' : 'Mark as Filed'}
          </button>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div style={{ display: 'flex' }}>
        {/* Section nav */}
        <nav style={{
          width: 192, flexShrink: 0,
          background: '#fff', borderRight: '0.5px solid #dde0cc',
          padding: '12px 0',
          position: 'sticky', top: 90, alignSelf: 'flex-start',
          height: 'calc(100vh - 90px)', overflowY: 'auto',
        }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#9aa090', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 16px 6px' }}>
            Sections
          </div>
          {NAV.map(item => {
            const mods = item.modPrefix ? modCount(item.modPrefix) : 0
            const active = section === item.id
            return (
              <div
                key={item.id}
                onClick={() => setSection(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 16px', cursor: 'pointer', fontSize: 12,
                  background: active ? 'rgba(156,196,122,0.1)' : 'transparent',
                  color: active ? '#5a7a3a' : '#6b7061',
                  fontWeight: active ? 600 : 400,
                  position: 'relative',
                  borderLeft: active ? '3px solid #9cc47a' : '3px solid transparent',
                  transition: 'all 0.1s',
                }}
              >
                <div>
                  <div>{item.label}</div>
                  <div style={{ fontSize: 10, color: '#9aa090', marginTop: 1 }}>{item.sub}</div>
                </div>
                {mods > 0 && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                    padding: '2px 5px', borderRadius: 8,
                    background: 'rgba(200,160,50,0.1)', color: '#c8a032',
                    border: '0.5px solid rgba(200,160,50,0.3)',
                    fontFamily: 'monospace',
                  }}>
                    {mods}
                  </span>
                )}
              </div>
            )
          })}
          <div style={{ height: 1, background: '#dde0cc', margin: '8px 0' }} />
          <div style={{ padding: '6px 16px 0', fontSize: 10, color: '#9aa090', lineHeight: 1.6 }}>
            Amounts in ₹. Pre-filled by engine. Highlighted fields have manual overrides.
          </div>
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, padding: '28px 36px', maxWidth: 900 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#1e2118', letterSpacing: '-0.02em' }}>
                {TITLES[section][0]}
              </div>
              <div style={{ fontSize: 12, color: '#9aa090', marginTop: 3 }}>
                {TITLES[section][1]}
              </div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, fontFamily: 'monospace',
              padding: '4px 10px', borderRadius: 6,
              background: 'rgba(30,33,24,0.06)', color: '#6b7061',
              border: '0.5px solid #dde0cc',
            }}>
              {section.toUpperCase()}
            </span>
          </div>

          {section === 'info' && (
            <>
              <div style={{
                background: 'rgba(156,196,122,0.06)', border: '0.5px solid rgba(156,196,122,0.3)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 20,
                fontSize: 12, color: '#6b7061', display: 'flex', gap: 8,
              }}>
                <span>ℹ</span>
                <span>Fields are pre-filled from your computation engine. Edit any value to override — the original and variance appear below the field.</span>
              </div>
              <div style={{
                background: '#fff', border: '0.5px solid #dde0cc',
                borderRadius: 10, padding: '20px 24px',
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
                  {[
                    ['GSTIN', gstinLabel],
                    ['Return Period', periodLabel],
                    ['Entity', companyName],
                    ['Return Type', 'GSTR-3B (Monthly)'],
                    ['Status', 'Draft — Not Filed'],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9aa090' }}>{l}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace', color: l === 'Status' ? '#c8a032' : '#1e2118' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {section === 'summary' && <TaxSummary draft={draft} overrides={overrides} />}
          {section === 't31' && <Section31 draft={draft} overrides={overrides} onOverride={onOverride} />}
          {section === 't4'  && <Section4  draft={draft} overrides={overrides} onOverride={onOverride} />}
          {section === 't51' && <Section51 draft={draft} overrides={overrides} onOverride={onOverride} />}
          {section === 't61' && <Section61 draft={draft} />}

          {!['info', 'summary'].includes(section) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button onClick={handlePdf} style={BTN_GHOST}>↓ Export PDF</button>
              <button onClick={handleSave} style={BTN_PRIMARY}>Save Draft</button>
            </div>
          )}
        </main>
      </div>

      {/* Toasts */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: '#1e2118', color: '#9cc47a',
            padding: '10px 16px', borderRadius: 8, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.25s ease',
          }}>
            <span>{t.icon}</span><span>{t.msg}</span>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; }
        }
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: none; opacity: 1; }
        }
      `}</style>
    </div>
  )
}

const BTN_GHOST: React.CSSProperties = {
  background: 'transparent', border: '0.5px solid #b0b8a0',
  color: '#6b7061', fontSize: 12, fontWeight: 500,
  padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
}

const BTN_PRIMARY: React.CSSProperties = {
  background: '#1e2118', color: '#9cc47a',
  border: 'none', fontSize: 12, fontWeight: 600,
  padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
}
