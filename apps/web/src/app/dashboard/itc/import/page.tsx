'use client'

import { useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { importGstr2b, type Gstr2bRow } from '../actions'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type ParsedResult = {
  rows: Gstr2bRow[]
  periodMonth: number
  periodYear: number
  supplierCount: number
}

type Stage = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error'

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseGstDate(s: string): string {
  // GST portal format: "05-03-2026" → "2026-03-05"
  const [d, m, y] = s.split('-')
  return `${y}-${m}-${d}`
}

function parseGstJson(text: string): ParsedResult {
  const json = JSON.parse(text)
  const fp: string = json?.data?.fp ?? ''          // "032026"
  const periodMonth = parseInt(fp.slice(0, 2), 10) || 1
  const periodYear  = parseInt(fp.slice(2), 10)    || new Date().getFullYear()

  const b2b: unknown[] = json?.data?.docdata?.b2b ?? json?.data?.docdata?.b2ba ?? []
  const suppliers = new Set<string>()
  const rows: Gstr2bRow[] = []

  for (const entry of b2b as Array<{ ctin: string; inv: Array<{ inum: string; idt: string; itcavl?: string; itms: Array<{ itm_det: { txval?: string; iamt?: string; camt?: string; samt?: string; csamt?: string } }> }> }>) {
    suppliers.add(entry.ctin)
    for (const inv of entry.inv ?? []) {
      const det = inv.itms?.[0]?.itm_det ?? {}
      rows.push({
        supplier_gstin:  entry.ctin,
        invoice_no:      inv.inum,
        invoice_date:    parseGstDate(inv.idt),
        taxable_value:   Math.round(parseFloat(det.txval  ?? '0') * 100),
        igst:            Math.round(parseFloat(det.iamt   ?? '0') * 100),
        cgst:            Math.round(parseFloat(det.camt   ?? '0') * 100),
        sgst:            Math.round(parseFloat(det.samt   ?? '0') * 100),
        cess:            Math.round(parseFloat(det.csamt  ?? '0') * 100),
        itc_availability: (inv.itcavl ?? 'Y').toUpperCase(),
      })
    }
  }

  return { rows, periodMonth, periodYear, supplierCount: suppliers.size }
}

function parseCsv(text: string, periodMonth: number, periodYear: number): ParsedResult {
  const lines = text.trim().split('\n').filter(Boolean)
  const suppliers = new Set<string>()
  const rows: Gstr2bRow[] = []

  for (const line of lines.slice(1)) {
    const cols = line.split(',').map(c => c.trim())
    if (cols.length < 8) continue
    const gstin = cols[0].toUpperCase()
    suppliers.add(gstin)
    rows.push({
      supplier_gstin:  gstin,
      invoice_no:      cols[1],
      invoice_date:    cols[2],   // expect ISO 'YYYY-MM-DD'
      taxable_value:   Math.round(parseFloat(cols[3] ?? '0') * 100),
      igst:            Math.round(parseFloat(cols[4] ?? '0') * 100),
      cgst:            Math.round(parseFloat(cols[5] ?? '0') * 100),
      sgst:            Math.round(parseFloat(cols[6] ?? '0') * 100),
      cess:            Math.round(parseFloat(cols[7] ?? '0') * 100),
      itc_availability: (cols[8]?.toUpperCase() || 'Y'),
    })
  }

  return { rows, periodMonth, periodYear, supplierCount: suppliers.size }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Gstr2bImportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = searchParams.get('companyId') ?? ''
  const gstinId   = searchParams.get('gstinId')   ?? ''
  const periodParam = searchParams.get('period')  ?? ''

  // period param: "2026-03"
  const [paramMonth, paramYear] = periodParam.split('-').map(Number)

  const fileRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const [errMsg, setErrMsg] = useState('')
  const [inserted, setInserted] = useState(0)

  // For CSV, let user pick the period if not in URL
  const [csvMonth, setCsvMonth] = useState(paramMonth || new Date().getMonth() + 1)
  const [csvYear,  setCsvYear]  = useState(paramYear  || new Date().getFullYear())

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStage('parsing')
    setErrMsg('')

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        let result: ParsedResult

        if (file.name.endsWith('.json')) {
          result = parseGstJson(text)
        } else {
          result = parseCsv(text, csvMonth, csvYear)
        }

        if (result.rows.length === 0) {
          setErrMsg('No invoice rows found in the file. Check the format and try again.')
          setStage('error')
          return
        }

        setParsed(result)
        setStage('preview')
      } catch (err) {
        setErrMsg(err instanceof Error ? err.message : 'Failed to parse file')
        setStage('error')
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!parsed) return
    setStage('importing')

    const res = await importGstr2b(
      parsed.rows,
      companyId,
      gstinId,
      parsed.periodMonth,
      parsed.periodYear,
    )

    if (res.error) {
      setErrMsg(res.error)
      setStage('error')
    } else {
      setInserted(res.inserted)
      setStage('done')
    }
  }

  const BOX: React.CSSProperties = {
    background: '#fff', border: '0.5px solid #dde0cc',
    borderRadius: 12, padding: '32px', maxWidth: 560, margin: '0 auto',
  }

  const BTN_PRIMARY: React.CSSProperties = {
    background: '#1e2118', color: '#9cc47a', border: 'none',
    fontSize: 13, fontWeight: 600, padding: '9px 20px', borderRadius: 7,
    cursor: 'pointer',
  }

  const BTN_GHOST: React.CSSProperties = {
    background: 'transparent', border: '0.5px solid #b0b8a0',
    color: '#6b7061', fontSize: 13, fontWeight: 500,
    padding: '9px 20px', borderRadius: 7, cursor: 'pointer',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f2f3eb', padding: '40px 24px' }}>
      {/* Back nav */}
      <button
        onClick={() => router.push('/dashboard/itc')}
        style={{ background: 'none', border: 'none', color: '#9aa090', cursor: 'pointer', fontSize: 12, marginBottom: 24, padding: 0 }}
      >
        ← ITC Reconciliation
      </button>

      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#1e2118', marginBottom: 6 }}>Import GSTR-2B</h1>
        <p style={{ fontSize: 13, color: '#6b7061', marginBottom: 32 }}>
          Upload your GSTR-2B file downloaded from the GST portal. Supports JSON (portal export) and CSV.
        </p>

        {/* ── Idle / file select ── */}
        {(stage === 'idle' || stage === 'parsing') && (
          <div style={BOX}>
            {/* CSV period selector (only relevant for CSV uploads) */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7061', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Period (for CSV uploads; auto-detected from JSON)
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={csvMonth}
                  onChange={e => setCsvMonth(Number(e.target.value))}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '0.5px solid #b0b8a0', fontSize: 12, background: '#fff' }}
                >
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input
                  type="number"
                  value={csvYear}
                  onChange={e => setCsvYear(Number(e.target.value))}
                  style={{ width: 80, padding: '6px 10px', borderRadius: 6, border: '0.5px solid #b0b8a0', fontSize: 12 }}
                />
              </div>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '1.5px dashed #b0b8a0', borderRadius: 10,
                padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                background: '#f8f9f2',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>↑</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1e2118', marginBottom: 4 }}>
                {stage === 'parsing' ? 'Parsing…' : 'Click to select file'}
              </div>
              <div style={{ fontSize: 12, color: '#9aa090' }}>
                GST portal JSON or CSV (max 50 MB)
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.csv"
                style={{ display: 'none' }}
                onChange={handleFile}
              />
            </div>

            {/* CSV format hint */}
            <details style={{ marginTop: 20 }}>
              <summary style={{ fontSize: 11, color: '#9aa090', cursor: 'pointer' }}>CSV column format</summary>
              <pre style={{ fontSize: 10, color: '#6b7061', marginTop: 8, background: '#f2f3eb', padding: 10, borderRadius: 6, overflowX: 'auto' }}>
{`supplier_gstin,invoice_no,invoice_date,taxable_value,igst,cgst,sgst,cess,itc_availability
29AABCC1234D1Z5,INV-001,2026-03-15,10000,1800,0,0,0,Y`}
              </pre>
              <p style={{ fontSize: 11, color: '#9aa090', marginTop: 4 }}>Amounts in rupees · itc_availability: Y / N / T</p>
            </details>
          </div>
        )}

        {/* ── Preview ── */}
        {stage === 'preview' && parsed && (
          <div style={BOX}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e2118', marginBottom: 20 }}>
              Ready to import
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'Invoices', value: parsed.rows.length },
                { label: 'Suppliers', value: parsed.supplierCount },
                { label: 'Period', value: `${MONTHS[parsed.periodMonth - 1]} ${parsed.periodYear}` },
              ].map(s => (
                <div key={s.label} style={{ background: '#f2f3eb', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: '#9aa090', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#1e2118', fontFamily: 'monospace' }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setStage('idle'); setParsed(null); if (fileRef.current) fileRef.current.value = '' }} style={BTN_GHOST}>
                Cancel
              </button>
              <button onClick={handleImport} style={BTN_PRIMARY}>
                Import {parsed.rows.length} rows →
              </button>
            </div>
          </div>
        )}

        {/* ── Importing ── */}
        {stage === 'importing' && (
          <div style={{ ...BOX, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#6b7061' }}>Importing rows into database…</div>
          </div>
        )}

        {/* ── Done ── */}
        {stage === 'done' && (
          <div style={BOX}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1e2118', marginBottom: 6 }}>
              Import complete
            </div>
            <div style={{ fontSize: 13, color: '#6b7061', marginBottom: 24 }}>
              {inserted} invoice{inserted !== 1 ? 's' : ''} imported successfully.
            </div>
            <a href="/dashboard/itc" style={{ ...BTN_PRIMARY, display: 'inline-block', textDecoration: 'none' }}>
              View ITC Reconciliation →
            </a>
          </div>
        )}

        {/* ── Error ── */}
        {stage === 'error' && (
          <div style={BOX}>
            <div style={{ fontSize: 13, color: '#c04040', marginBottom: 20 }}>{errMsg}</div>
            <button onClick={() => { setStage('idle'); setErrMsg(''); if (fileRef.current) fileRef.current.value = '' }} style={BTN_GHOST}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
