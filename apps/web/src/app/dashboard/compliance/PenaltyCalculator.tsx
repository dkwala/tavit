'use client'

import { useState } from 'react'
import { calcPenalty, fmtINR } from './penalty'

const RETURN_TYPES = ['GSTR-1', 'GSTR-3B', 'GSTR-9', 'GSTR-9C', 'GSTR-4', 'CMP-08']

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function InputRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#6b7061', marginBottom: 5, letterSpacing: '0.03em' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#f8f9f4',
  border: '0.5px solid #dde0cc', borderRadius: 6,
  color: '#1e2118', padding: '7px 10px', fontSize: 13,
  outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none' as const,
}

export default function PenaltyCalculator() {
  const today = new Date()
  const [expanded, setExpanded] = useState(false)
  const [returnType, setReturnType] = useState('GSTR-3B')
  const [isNil, setIsNil]           = useState(false)
  const [periodMonth, setPeriodMonth] = useState(today.getMonth() + 1)  // 1-12
  const [periodYear, setPeriodYear]   = useState(today.getFullYear())
  const [filingDate, setFilingDate]   = useState(today.toISOString().slice(0, 10))
  const [taxPayable, setTaxPayable]   = useState('')

  // Compute due date from period
  let dueDate: string
  if (returnType === 'GSTR-1') {
    // 11th of following month
    const d = new Date(periodYear, periodMonth, 11) // month is already 0-indexed next
    dueDate = d.toISOString().slice(0, 10)
  } else if (returnType === 'GSTR-3B') {
    const d = new Date(periodYear, periodMonth, 20)
    dueDate = d.toISOString().slice(0, 10)
  } else if (returnType === 'GSTR-9' || returnType === 'GSTR-9C') {
    // 31 Dec of year after FY start
    dueDate = `${periodYear + 1}-12-31`
  } else if (returnType === 'CMP-08') {
    // 18th of month after quarter end
    const quarterEnd = Math.floor((periodMonth - 1) / 3) * 3 + 3
    const d = new Date(periodYear, quarterEnd, 18)
    dueDate = d.toISOString().slice(0, 10)
  } else {
    const d = new Date(periodYear, periodMonth, 20)
    dueDate = d.toISOString().slice(0, 10)
  }

  const taxRupees = parseFloat(taxPayable.replace(/,/g, '')) || 0
  const result = calcPenalty(returnType, isNil, dueDate, filingDate, taxRupees)
  const showResult = filingDate > dueDate

  const dueDateLbl = new Date(dueDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div style={{ background: '#fff', border: '0.5px solid #dde0cc', borderRadius: 12 }}>
      {/* Header toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 16px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: '#1e2118' }}>Penalty Calculator</span>
        <span style={{ fontSize: 16, color: '#9aa090', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ›
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '0.5px solid #eaecda' }}>
          <div style={{ paddingTop: 14 }}>
            <InputRow label="RETURN TYPE">
              <select value={returnType} onChange={e => setReturnType(e.target.value)} style={selectStyle}>
                {RETURN_TYPES.map(r => <option key={r}>{r}</option>)}
              </select>
            </InputRow>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <InputRow label="PERIOD MONTH">
                <select value={periodMonth} onChange={e => setPeriodMonth(Number(e.target.value))} style={selectStyle}>
                  {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </InputRow>
              <InputRow label="PERIOD YEAR">
                <input
                  type="number"
                  value={periodYear}
                  onChange={e => setPeriodYear(Number(e.target.value))}
                  min={2017}
                  max={today.getFullYear() + 1}
                  style={inputStyle}
                />
              </InputRow>
            </div>

            <InputRow label="ACTUAL / EXPECTED FILING DATE">
              <input
                type="date"
                value={filingDate}
                onChange={e => setFilingDate(e.target.value)}
                style={inputStyle}
              />
            </InputRow>

            {returnType === 'GSTR-3B' && (
              <InputRow label="TAX PAYABLE (₹)">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 50000"
                  value={taxPayable}
                  onChange={e => setTaxPayable(e.target.value)}
                  style={inputStyle}
                />
              </InputRow>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <input
                type="checkbox"
                id="nil-return"
                checked={isNil}
                onChange={e => setIsNil(e.target.checked)}
                style={{ accentColor: '#7ea860', cursor: 'pointer' }}
              />
              <label htmlFor="nil-return" style={{ fontSize: 12, color: '#6b7061', cursor: 'pointer' }}>
                Nil return
              </label>
            </div>

            {/* Due date display */}
            <div style={{
              fontSize: 11, color: '#9aa090', marginBottom: 14,
              padding: '8px 10px', background: '#f8f9f4', borderRadius: 6,
            }}>
              Due date for {returnType}: <strong style={{ color: '#1e2118' }}>{dueDateLbl}</strong>
            </div>

            {/* Result */}
            {!showResult && (
              <div style={{ fontSize: 12, color: '#9aa090', textAlign: 'center', padding: '8px 0' }}>
                No penalty — filing date is on or before due date.
              </div>
            )}

            {showResult && (
              <div style={{
                background: result.total > 0 ? '#fdf0ed' : '#f0f3ea',
                border: `0.5px solid ${result.total > 0 ? 'rgba(192,57,43,0.2)' : 'rgba(90,122,58,0.2)'}`,
                borderRadius: 8, padding: '14px',
              }}>
                <div style={{ fontSize: 11, color: '#6b7061', marginBottom: 10, fontWeight: 500 }}>
                  {result.daysLate} day{result.daysLate !== 1 ? 's' : ''} late
                </div>

                {[
                  { label: 'Late fee (CGST)', value: fmtINR(result.cgst) },
                  { label: 'Late fee (SGST)', value: fmtINR(result.sgst) },
                  ...(result.interest > 0 ? [{ label: 'Interest @ 18% p.a.', value: fmtINR(result.interest) }] : []),
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 12, color: '#1e2118', marginBottom: 6,
                  }}>
                    <span style={{ color: '#6b7061' }}>{row.label}</span>
                    <span style={{ fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}

                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 14, fontWeight: 600, color: result.total > 0 ? '#c0392b' : '#3a6020',
                  borderTop: '0.5px solid rgba(0,0,0,0.08)',
                  paddingTop: 8, marginTop: 4,
                }}>
                  <span>Total</span>
                  <span>{fmtINR(result.total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
