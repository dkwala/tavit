'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markFiled } from '@/app/dashboard/compliance/actions'

type ItemDetail = { txval: string; rt: string; iamt: string; camt?: string; samt?: string; csamt: string }
type Invoice = { inum: string; idt: string; val: string; pos?: string; rchrg?: string; itms: Array<{ num: number; itm_det: ItemDetail }> }
type B2bEntry = { ctin: string; inv: Invoice[] }
type B2clEntry = { pos: string; inv: Invoice[] }
type B2csRow = { pos: string; rt: string; txval: string; iamt: string; camt: string; samt: string; csamt: string }
type ExpEntry = { exp_tp: string; inum: string; idt: string; val: string; sbnum: string; itms: Array<{ txval: string; rt: string; iamt: string; csamt: string }> }
type HsnRow = { hsn_sc: string; desc: string; uqc: string; qty: string; txval: string; iamt: string; camt: string; samt: string; csamt: string }

export type Gstr1Draft = {
  gstin: string
  ret_period: string
  b2b: { regular: B2bEntry[]; rcm: B2bEntry[] }
  b2cl: B2clEntry[]
  b2cs: B2csRow[]
  exp: ExpEntry[]
  hsn: { details: HsnRow[] }
  totals: {
    total_taxable: string
    total_igst: string
    total_cgst: string
    total_sgst: string
    total_cess: string
    total_tax: string
  }
  warnings: { missing_hsn_invoices: string[] }
}

type Props = {
  draft: Gstr1Draft
  deadlineId: string
  gstinLabel: string
  periodLabel: string
  companyName: string
}

type Section = 'info' | 'summary' | 'b2b' | 'b2cs' | 'b2cl' | 'exp' | 'hsn'

const fmt = (v: string | number) => {
  const n = parseFloat(String(v).replace(/,/g, ''))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

const MONO: React.CSSProperties = { fontFamily: 'monospace', color: '#1e2118' }

function TableHeader({ title, sub, count }: { title: string; sub: string; count?: number }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #dde0cc', background: '#f9faf5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e2118' }}>{title}</div>
        <div style={{ fontSize: 11, color: '#9aa090', marginTop: 2 }}>{sub}</div>
      </div>
      {count !== undefined && (
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#6b7061', background: 'rgba(30,33,24,0.06)', padding: '3px 8px', borderRadius: 5 }}>
          {count} {count === 1 ? 'entry' : 'entries'}
        </span>
      )}
    </div>
  )
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} style={{ ...TD_STYLE, textAlign: 'center', color: '#9aa090', borderBottom: 'none' }}>
        No entries for this period
      </td>
    </tr>
  )
}

function SectionB2B({ b2b }: { b2b: Gstr1Draft['b2b'] }) {
  const all = [...b2b.regular, ...b2b.rcm]
  const totalInvoices = all.reduce((s, e) => s + e.inv.length, 0)

  return (
    <div style={TABLE_STYLE}>
      <TableHeader title="Table 4A/4B — B2B Supplies" sub="Supplies to registered persons (incl. reverse charge)" count={totalInvoices} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '20%' }}>Buyer GSTIN</th>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '16%' }}>Invoice No.</th>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '10%' }}>Date</th>
            <th style={TH_STYLE}>Value (₹)</th>
            <th style={TH_STYLE}>Taxable (₹)</th>
            <th style={TH_STYLE}>IGST (₹)</th>
            <th style={TH_STYLE}>CGST (₹)</th>
            <th style={TH_STYLE}>SGST (₹)</th>
            <th style={{ ...TH_STYLE, width: '7%' }}>RCM</th>
          </tr>
        </thead>
        <tbody>
          {all.length === 0 && <EmptyRow cols={9} />}
          {all.map((entry, ei) =>
            entry.inv.map((inv, ii) => {
              const det = inv.itms[0]?.itm_det
              return (
                <tr key={`${ei}-${ii}`}>
                  <td style={{ ...TD_STYLE, ...MONO, fontSize: 11, color: '#6b7061' }}>{entry.ctin}</td>
                  <td style={{ ...TD_STYLE, ...MONO, fontSize: 11 }}>{inv.inum}</td>
                  <td style={{ ...TD_STYLE, fontSize: 11, color: '#6b7061' }}>{inv.idt}</td>
                  <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(inv.val)}</td>
                  <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(det?.txval ?? '0')}</td>
                  <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(det?.iamt ?? '0')}</td>
                  <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(det?.camt ?? '0')}</td>
                  <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(det?.samt ?? '0')}</td>
                  <td style={{ ...TD_STYLE, textAlign: 'center', fontSize: 11, color: inv.rchrg === 'Y' ? '#c04040' : '#9aa090' }}>
                    {inv.rchrg === 'Y' ? 'Yes' : 'No'}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

function SectionB2CS({ b2cs }: { b2cs: B2csRow[] }) {
  return (
    <div style={TABLE_STYLE}>
      <TableHeader title="Table 7 — B2CS Supplies" sub="Supplies to unregistered persons — aggregated by state and rate" count={b2cs.length} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '12%' }}>State (POS)</th>
            <th style={{ ...TH_STYLE, width: '10%' }}>Rate (%)</th>
            <th style={TH_STYLE}>Taxable (₹)</th>
            <th style={TH_STYLE}>IGST (₹)</th>
            <th style={TH_STYLE}>CGST (₹)</th>
            <th style={TH_STYLE}>SGST (₹)</th>
            <th style={TH_STYLE}>Cess (₹)</th>
          </tr>
        </thead>
        <tbody>
          {b2cs.length === 0 && <EmptyRow cols={7} />}
          {b2cs.map((row, i) => (
            <tr key={i}>
              <td style={{ ...TD_STYLE, ...MONO, fontSize: 11, color: '#6b7061' }}>{row.pos}</td>
              <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{row.rt}</td>
              <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(row.txval)}</td>
              <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(row.iamt)}</td>
              <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(row.camt)}</td>
              <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(row.samt)}</td>
              <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(row.csamt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionB2CL({ b2cl }: { b2cl: B2clEntry[] }) {
  const totalInvoices = b2cl.reduce((s, e) => s + e.inv.length, 0)

  return (
    <div style={TABLE_STYLE}>
      <TableHeader title="Table 5A — B2CL Supplies" sub="Large interstate supplies to unregistered persons (invoice value > ₹2.5L)" count={totalInvoices} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '12%' }}>POS</th>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '20%' }}>Invoice No.</th>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '12%' }}>Date</th>
            <th style={TH_STYLE}>Value (₹)</th>
            <th style={TH_STYLE}>Taxable (₹)</th>
            <th style={TH_STYLE}>IGST (₹)</th>
            <th style={TH_STYLE}>Cess (₹)</th>
          </tr>
        </thead>
        <tbody>
          {b2cl.length === 0 && <EmptyRow cols={7} />}
          {b2cl.map((entry, ei) =>
            entry.inv.map((inv, ii) => {
              const det = inv.itms[0]?.itm_det
              return (
                <tr key={`${ei}-${ii}`}>
                  <td style={{ ...TD_STYLE, ...MONO, fontSize: 11, color: '#6b7061' }}>{entry.pos}</td>
                  <td style={{ ...TD_STYLE, ...MONO, fontSize: 11 }}>{inv.inum}</td>
                  <td style={{ ...TD_STYLE, fontSize: 11, color: '#6b7061' }}>{inv.idt}</td>
                  <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(inv.val)}</td>
                  <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(det?.txval ?? '0')}</td>
                  <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(det?.iamt ?? '0')}</td>
                  <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(det?.csamt ?? '0')}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

function SectionExp({ exp }: { exp: ExpEntry[] }) {
  return (
    <div style={TABLE_STYLE}>
      <TableHeader title="Table 6A — Exports" sub="Zero-rated exports with and without payment of tax" count={exp.length} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '12%' }}>Type</th>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '20%' }}>Invoice No.</th>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '12%' }}>Date</th>
            <th style={TH_STYLE}>Value (₹)</th>
            <th style={TH_STYLE}>Taxable (₹)</th>
            <th style={TH_STYLE}>IGST (₹)</th>
            <th style={TH_STYLE}>Cess (₹)</th>
          </tr>
        </thead>
        <tbody>
          {exp.length === 0 && <EmptyRow cols={7} />}
          {exp.map((e, i) => {
            const det = e.itms[0]
            return (
              <tr key={i}>
                <td style={{ ...TD_STYLE, fontSize: 11 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                    background: e.exp_tp === 'WPAY' ? 'rgba(90,122,58,0.1)' : 'rgba(200,160,50,0.1)',
                    color: e.exp_tp === 'WPAY' ? '#5a7a3a' : '#8a6a10',
                  }}>{e.exp_tp}</span>
                </td>
                <td style={{ ...TD_STYLE, ...MONO, fontSize: 11 }}>{e.inum}</td>
                <td style={{ ...TD_STYLE, fontSize: 11, color: '#6b7061' }}>{e.idt}</td>
                <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(e.val)}</td>
                <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(det?.txval ?? '0')}</td>
                <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(det?.iamt ?? '0')}</td>
                <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(det?.csamt ?? '0')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SectionHSN({ hsn }: { hsn: Gstr1Draft['hsn'] }) {
  return (
    <div style={TABLE_STYLE}>
      <TableHeader title="HSN Summary" sub="Harmonised System of Nomenclature — supply-wise aggregation" count={hsn.details.length} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '12%' }}>HSN/SAC</th>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: '22%' }}>Description</th>
            <th style={{ ...TH_STYLE, width: '8%' }}>UOM</th>
            <th style={TH_STYLE}>Qty</th>
            <th style={TH_STYLE}>Taxable (₹)</th>
            <th style={TH_STYLE}>IGST (₹)</th>
            <th style={TH_STYLE}>CGST (₹)</th>
            <th style={TH_STYLE}>SGST (₹)</th>
          </tr>
        </thead>
        <tbody>
          {hsn.details.length === 0 && <EmptyRow cols={8} />}
          {hsn.details.map((row, i) => (
            <tr key={i}>
              <td style={{ ...TD_STYLE, ...MONO, fontSize: 11 }}>{row.hsn_sc}</td>
              <td style={{ ...TD_STYLE, fontSize: 11, color: '#6b7061' }}>{row.desc}</td>
              <td style={{ ...TD_STYLE, textAlign: 'center', fontSize: 11, color: '#9aa090' }}>{row.uqc}</td>
              <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(row.qty)}</td>
              <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(row.txval)}</td>
              <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(row.iamt)}</td>
              <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(row.camt)}</td>
              <td style={{ ...TD_STYLE, textAlign: 'right', ...MONO, fontSize: 11 }}>{fmt(row.samt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TaxSummary({ totals }: { totals: Gstr1Draft['totals'] }) {
  const items = [
    { label: 'Total Taxable',  value: totals.total_taxable,  color: '#1e2118' },
    { label: 'IGST',           value: totals.total_igst,     color: '#1e2118' },
    { label: 'CGST',           value: totals.total_cgst,     color: '#1e2118' },
    { label: 'SGST/UTGST',    value: totals.total_sgst,     color: '#1e2118' },
    { label: 'Cess',           value: totals.total_cess,     color: '#6b7061' },
    { label: 'Total Tax',      value: totals.total_tax,      color: '#5a7a3a' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
      {items.map(item => (
        <div key={item.label} style={{
          background: '#fff', border: '0.5px solid #dde0cc',
          borderRadius: 10, padding: '16px 18px',
        }}>
          <div style={{ fontSize: 10, color: '#9aa090', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            {item.label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'monospace', color: item.color, letterSpacing: '-0.03em' }}>
            ₹{fmt(item.value)}
          </div>
        </div>
      ))}
    </div>
  )
}

const NAV: Array<{ id: Section; label: string; sub: string }> = [
  { id: 'info',    label: 'Filing Info',    sub: 'GSTIN & period' },
  { id: 'summary', label: 'Tax Summary',    sub: 'Outward supply totals' },
  { id: 'b2b',     label: '4A/4B  B2B',    sub: 'Registered buyers' },
  { id: 'b2cs',    label: '7   B2CS',      sub: 'Small unregistered' },
  { id: 'b2cl',    label: '5A  B2CL',      sub: 'Large unregistered' },
  { id: 'exp',     label: '6A  Exports',   sub: 'Zero-rated exports' },
  { id: 'hsn',     label: 'HSN Summary',   sub: 'Commodity-wise' },
]

const TITLES: Record<Section, [string, string]> = {
  info:    ['Filing Info',                    'Taxpayer details and return period'],
  summary: ['Tax Summary',                    'Total outward supplies and tax for the period'],
  b2b:     ['Table 4A/4B — B2B',             'Supplies to registered taxpayers'],
  b2cs:    ['Table 7 — B2CS',                'Supplies to unregistered persons (state & rate aggregated)'],
  b2cl:    ['Table 5A — B2CL',               'Large interstate supplies to unregistered persons'],
  exp:     ['Table 6A — Exports',             'Zero-rated exports with and without payment of tax'],
  hsn:     ['HSN Summary',                    'Commodity-wise supply summary'],
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

export function Gstr1DraftClient({ draft, deadlineId, gstinLabel, periodLabel, companyName }: Props) {
  const router = useRouter()
  const [section, setSection] = useState<Section>('info')
  const [filing, startFilingTransition] = useTransition()

  const warnings = draft.warnings?.missing_hsn_invoices ?? []

  function handlePdf() {
    setTimeout(() => window.print(), 400)
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
          {[['GSTIN', gstinLabel], ['Period', periodLabel], ['Entity', companyName], ['Form', 'GSTR-1']].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', padding: '0 16px', borderRight: '0.5px solid #dde0cc' }}>
              <span style={{ fontSize: 9, color: '#9aa090', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#1e2118', fontFamily: 'monospace' }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button onClick={handlePdf} style={BTN_GHOST}>↓ Export PDF</button>
          <button
            disabled={filing}
            onClick={() => startFilingTransition(async () => {
              await markFiled(deadlineId)
              router.push('/dashboard/returns')
            })}
            style={BTN_PRIMARY}
          >
            {filing ? 'Filing…' : 'Mark as Filed'}
          </button>
          <a href="https://gst.gov.in" target="_blank" rel="noreferrer">
            <button style={BTN_GHOST}>File on gst.gov.in →</button>
          </a>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Sidebar */}
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
                  borderLeft: active ? '3px solid #9cc47a' : '3px solid transparent',
                  transition: 'all 0.1s',
                }}
              >
                <div>
                  <div>{item.label}</div>
                  <div style={{ fontSize: 10, color: '#9aa090', marginTop: 1 }}>{item.sub}</div>
                </div>
              </div>
            )
          })}
          {warnings.length > 0 && (
            <>
              <div style={{ height: 1, background: '#dde0cc', margin: '8px 0' }} />
              <div style={{ padding: '6px 16px', fontSize: 10, color: '#c8a032', lineHeight: 1.6 }}>
                ⚠ {warnings.length} invoice{warnings.length > 1 ? 's' : ''} missing HSN
              </div>
            </>
          )}
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, padding: '28px 36px', maxWidth: 960 }}>
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

          {/* Warnings */}
          {warnings.length > 0 && (
            <div style={{
              background: 'rgba(200,160,50,0.08)', border: '0.5px solid rgba(200,160,50,0.4)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 20,
              fontSize: 12, color: '#6a4800',
            }}>
              <strong>⚠ Missing HSN on {warnings.length} invoice{warnings.length > 1 ? 's' : ''}:</strong>{' '}
              {warnings.slice(0, 8).join(', ')}{warnings.length > 8 ? ` +${warnings.length - 8} more` : ''}
              <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#8a6a10' }}>
                HSN/SAC is mandatory for GSTR-1. Update these invoices before filing.
              </span>
            </div>
          )}

          {section === 'info' && (
            <div style={{
              background: '#fff', border: '0.5px solid #dde0cc',
              borderRadius: 10, padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
                {[
                  ['GSTIN',       gstinLabel],
                  ['Return Period', periodLabel],
                  ['Entity',       companyName],
                  ['Return Type',  'GSTR-1 (Monthly outward supplies)'],
                  ['Status',       'Draft — Not Filed'],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9aa090' }}>{l}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace', color: l === 'Status' ? '#c8a032' : '#1e2118' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'summary' && <TaxSummary totals={draft.totals} />}
          {section === 'b2b'     && <SectionB2B b2b={draft.b2b} />}
          {section === 'b2cs'    && <SectionB2CS b2cs={draft.b2cs} />}
          {section === 'b2cl'    && <SectionB2CL b2cl={draft.b2cl} />}
          {section === 'exp'     && <SectionExp exp={draft.exp} />}
          {section === 'hsn'     && <SectionHSN hsn={draft.hsn} />}

          {!['info', 'summary'].includes(section) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={handlePdf} style={BTN_GHOST}>↓ Export PDF</button>
            </div>
          )}
        </main>
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
