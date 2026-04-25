'use client'

import { useState, useRef, useCallback } from 'react'
import { parseTallyXml, type TallyParseResult } from '@/lib/tally/parser'

type ParsedSummary = TallyParseResult & {
  warnings?: Array<{ code?: string }>
}

type UploadState = 'idle' | 'dragging' | 'parsing' | 'preview' | 'importing' | 'done' | 'error'

type Tab = 'summary' | 'ledgers' | 'entries'

const ENTRY_BADGE: Record<string, { bg: string; color: string }> = {
  'Sales':          { bg: 'rgba(90,122,58,0.1)',   color: '#5a7a3a' },
  'Purchase':       { bg: 'rgba(200,160,50,0.1)',  color: '#8a6a10' },
  'Credit Note':    { bg: 'rgba(90,122,58,0.08)',  color: '#5a7a3a' },
  'Debit Note':     { bg: 'rgba(200,160,50,0.08)', color: '#8a6a10' },
  'Sales Order':    { bg: 'rgba(90,122,58,0.08)',  color: '#5a7a3a' },
  'Purchase Order': { bg: 'rgba(200,160,50,0.08)', color: '#8a6a10' },
}
const DEFAULT_BADGE = { bg: 'rgba(90,90,90,0.08)', color: '#6b7061' }

export default function TallyImportPage() {
  const [state, setState]       = useState<UploadState>('idle')
  const [summary, setSummary]   = useState<ParsedSummary | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>('summary')
  const [rawFile, setRawFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{
    inserted: number
    skipped_duplicates: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warnings: any[]
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const activeGstinId =
    (globalThis as { activeGstinId?: string }).activeGstinId ?? ''
  const activeCompanyId =
    (globalThis as { activeCompanyId?: string }).activeCompanyId ?? ''

  const processFile = useCallback((file: File) => {
    setRawFile(file)
    if (!file.name.toLowerCase().endsWith('.xml')) {
      setErrorMsg('Please upload a TallyPrime XML export file (.xml)')
      setState('error')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('File too large. Maximum size is 50 MB.')
      setState('error')
      return
    }

    setState('parsing')
    const reader = new FileReader()
    reader.onload = (e) => {
      const xml = e.target?.result as string
      if (!xml.includes('TALLYMESSAGE') && !xml.includes('ENVELOPE')) {
        setErrorMsg('This doesn\'t look like a TallyPrime export. Make sure you export via Gateway of Tally → Data → Export.')
        setState('error')
        return
      }
      try {
        const parsed = parseTallyXml(xml, file.name, file.size)
        if (parsed.vouchers === 0 && parsed.ledgers === 0) {
          setErrorMsg('No vouchers or ledgers found. Try exporting with "All Masters" and "All Vouchers" selected.')
          setState('error')
          return
        }
        setSummary(parsed)
        setState('preview')
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Could not parse the XML file.')
        setState('error')
      }
    }
    reader.onerror = () => {
      setErrorMsg('Could not read the file. Please try again.')
      setState('error')
    }
    reader.readAsText(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState('idle')
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleConfirm = async () => {
    if (!rawFile) return
    setState('importing')
    setProgress(10)
    try {
      const form = new FormData()
      form.append('file', rawFile)
      form.append('gstinId', activeGstinId)
      const uploadRes = await fetch('/api/tally/upload', {
        method: 'POST', body: form
      })
      if (!uploadRes.ok) throw new Error(await uploadRes.text())
      const preview = await uploadRes.json()
      setProgress(50)
      const confirmRes = await fetch('/api/tally/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: preview.items,
          gstinId: activeGstinId,
          companyId: activeCompanyId,
        }),
      })
      if (!confirmRes.ok) throw new Error(await confirmRes.text())
      const result = await confirmRes.json()
      setProgress(100)
      setImportResult(result)
      setState('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Import failed')
      setState('error')
    }
  }

  const reset = () => {
    setState('idle')
    setSummary(null)
    setRawFile(null)
    setImportResult(null)
    setErrorMsg('')
    setProgress(0)
    setActiveTab('summary')
    if (fileRef.current) fileRef.current.value = ''
  }

  const taxWarningCount =
    summary?.warnings?.filter(
      warning =>
        warning?.code === 'TAX_MISMATCH' ||
        warning?.code === 'GSTIN_INVALID',
    ).length ?? 0

  return (
    <div style={{ padding: '40px', maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#1e2118', letterSpacing: '-0.4px', marginBottom: 6 }}>
          Tally Import
        </h1>
        <p style={{ fontSize: 13, color: '#6b7061' }}>
          Export your data from TallyPrime, then upload the XML file here.
        </p>
      </div>

      {/* How to export hint */}
      {(state === 'idle' || state === 'dragging' || state === 'error') && (
        <div style={{
          background: '#fff', border: '0.5px solid #dde0cc',
          borderRadius: 10, padding: '14px 18px',
          marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'rgba(90,122,58,0.1)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#5a7a3a" strokeWidth="1.2"/>
              <path d="M7 6v4M7 4.5v.5" stroke="#5a7a3a" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#1e2118', marginBottom: 3 }}>
              How to export from TallyPrime
            </div>
            <div style={{ fontSize: 12, color: '#6b7061', lineHeight: 1.6 }}>
              Gateway of Tally → <strong>E: Export</strong> → Master &amp; Transactions → Format: <strong>XML</strong> → Export
            </div>
          </div>
        </div>
      )}

      {/* Drop zone */}
      {(state === 'idle' || state === 'dragging' || state === 'error') && (
        <div
          onDragOver={e => { e.preventDefault(); setState('dragging') }}
          onDragLeave={() => setState(state === 'error' ? 'error' : 'idle')}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `1.5px dashed ${state === 'dragging' ? '#7ea860' : state === 'error' ? 'rgba(200,80,60,0.4)' : '#c8cdb8'}`,
            borderRadius: 12,
            background: state === 'dragging' ? 'rgba(126,168,96,0.05)' : '#fff',
            padding: '56px 40px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
            marginBottom: state === 'error' ? 16 : 0,
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xml"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: state === 'dragging' ? 'rgba(126,168,96,0.15)' : '#f2f3eb',
            margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 14V4M7 8l4-4 4 4" stroke={state === 'dragging' ? '#5a7a3a' : '#9aa090'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 16v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke={state === 'dragging' ? '#5a7a3a' : '#9aa090'} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: state === 'dragging' ? '#3a6020' : '#1e2118', marginBottom: 6 }}>
            {state === 'dragging' ? 'Drop it here' : 'Drop your Tally XML file here'}
          </div>
          <div style={{ fontSize: 12, color: '#9aa090' }}>
            or <span style={{ color: '#5a7a3a', textDecoration: 'underline' }}>browse files</span> · Max 50 MB
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div style={{
          background: 'rgba(200,80,60,0.06)', border: '0.5px solid rgba(200,80,60,0.25)',
          borderRadius: 8, padding: '12px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="7" cy="7" r="6" stroke="#c85040" strokeWidth="1.2"/>
            <path d="M7 4v4M7 9.5v.5" stroke="#c85040" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <div>
            <div style={{ fontSize: 12, color: '#902020' }}>{errorMsg}</div>
            <button onClick={reset} style={{ marginTop: 6, fontSize: 12, color: '#5a7a3a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Try again →
            </button>
          </div>
        </div>
      )}

      {/* Parsing spinner */}
      {state === 'parsing' && (
        <div style={{
          background: '#fff', border: '0.5px solid #dde0cc',
          borderRadius: 12, padding: '48px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '2px solid #e8ead0', borderTopColor: '#7ea860',
            margin: '0 auto 16px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <div style={{ fontSize: 14, color: '#1e2118', fontWeight: 500 }}>Reading your Tally file…</div>
          <div style={{ fontSize: 12, color: '#9aa090', marginTop: 4 }}>Parsing vouchers and ledgers</div>
        </div>
      )}

      {/* Preview */}
      {state === 'preview' && summary && (
        <div>
          {/* File info bar */}
          <div style={{
            background: '#fff', border: '0.5px solid #dde0cc',
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: 'rgba(90,122,58,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="#5a7a3a" strokeWidth="1.2"/>
                  <path d="M4 5h6M4 7.5h6M4 10h4" stroke="#5a7a3a" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1e2118' }}>{summary.fileName}</div>
                <div style={{ fontSize: 11, color: '#9aa090' }}>{summary.fileSizeKb} KB · XML</div>
              </div>
            </div>
            <button
              onClick={reset}
              style={{ fontSize: 12, color: '#9aa090', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Change file
            </button>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Vouchers found', value: summary.vouchers.toLocaleString('en-IN'),   accent: true  },
              { label: 'Ledgers found',  value: summary.ledgers.toLocaleString('en-IN'),    accent: false },
              { label: 'Stock items',    value: summary.stockItems.toLocaleString('en-IN'), accent: false },
            ].map(card => (
              <div key={card.label} style={{
                background: '#fff', border: '0.5px solid #dde0cc',
                borderTop: card.accent ? '2px solid #7ea860' : undefined,
                borderRadius: 10, padding: '16px 18px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#9aa090', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 500, color: '#1e2118', letterSpacing: '-0.5px' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          {/* Voucher type chips */}
          {summary.voucherTypes.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {summary.voucherTypes.map(vt => (
                <span key={vt.type} style={{
                  background: '#f2f3eb', border: '0.5px solid #dde0cc',
                  borderRadius: 6, fontSize: 11, padding: '4px 10px',
                  color: '#1e2118', fontWeight: 500,
                }}>
                  {vt.type}{' '}
                  <span style={{ color: '#7ea860' }}>{vt.count.toLocaleString('en-IN')}</span>
                </span>
              ))}
            </div>
          )}

          {/* Tab bar */}
          <div style={{
            display: 'flex', borderBottom: '0.5px solid #dde0cc', marginBottom: 16,
          }}>
            {(['summary', 'ledgers', 'entries'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 16px', fontSize: 13, background: 'none', border: 'none',
                  cursor: 'pointer', textTransform: 'capitalize',
                  color: activeTab === tab ? '#1e2118' : '#9aa090',
                  fontWeight: activeTab === tab ? 500 : 400,
                  borderBottom: activeTab === tab ? '1.5px solid #7ea860' : '1.5px solid transparent',
                  marginBottom: -1,
                }}
              >
                {tab === 'ledgers'
                  ? `Ledgers${summary.ledgerTotal > 0 ? ` (${summary.ledgerTotal.toLocaleString('en-IN')})` : ''}`
                  : tab === 'entries'
                  ? `Entries${summary.entryTotal > 0 ? ` (${summary.entryTotal.toLocaleString('en-IN')})` : ''}`
                  : 'Summary'}
              </button>
            ))}
          </div>

          {/* Summary tab */}
          {activeTab === 'summary' && (
            <div style={{
              background: '#fff', border: '0.5px solid #dde0cc',
              borderRadius: 10, padding: '20px',
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7061', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                Import details
              </div>
              {[
                { label: 'Company',     value: summary.companies.join(', ') },
                { label: 'Period from', value: summary.periodFrom ?? 'Not detected' },
                { label: 'Period to',   value: summary.periodTo   ?? 'Not detected' },
                { label: 'File',        value: `${summary.fileName} (${summary.fileSizeKb} KB)` },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '10px 0', borderBottom: '0.5px solid #f0f1e8',
                }}>
                  <span style={{ fontSize: 13, color: '#6b7061' }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: '#1e2118', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Ledgers tab */}
          {activeTab === 'ledgers' && (
            <div style={{
              background: '#fff', border: '0.5px solid #dde0cc',
              borderRadius: 10, overflow: 'hidden', marginBottom: 24,
            }}>
              {summary.ledgerTotal > 200 && (
                <div style={{
                  fontSize: 11, color: '#9aa090', padding: '8px 16px',
                  borderBottom: '0.5px solid #f0f1e8', background: '#fafbf7',
                }}>
                  Showing 200 of {summary.ledgerTotal.toLocaleString('en-IN')} ledgers
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f7f8f3', borderBottom: '0.5px solid #dde0cc' }}>
                    {['Name', 'Parent Group', 'Opening Balance'].map((h, i) => (
                      <th key={h} style={{
                        fontSize: 11, fontWeight: 500, color: '#9aa090',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        padding: '10px 16px', textAlign: i === 2 ? 'right' : 'left',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.ledgerList.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ fontSize: 13, color: '#9aa090', textAlign: 'center', padding: '32px' }}>
                        No ledger masters found in this export.
                      </td>
                    </tr>
                  ) : summary.ledgerList.map((l, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafbf7', borderBottom: '0.5px solid #f0f1e8' }}>
                      <td style={{ fontSize: 13, color: '#1e2118', padding: '10px 16px' }}>{l.name}</td>
                      <td style={{ fontSize: 13, color: '#6b7061', padding: '10px 16px' }}>{l.parent || <span style={{ color: '#c8cdb8' }}>—</span>}</td>
                      <td style={{ fontSize: 13, color: '#1e2118', padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {l.openingBalance || <span style={{ color: '#c8cdb8' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Entries tab */}
          {activeTab === 'entries' && (
            <div style={{
              background: '#fff', border: '0.5px solid #dde0cc',
              borderRadius: 10, overflow: 'hidden', marginBottom: 24,
            }}>
              {summary.entryTotal > 500 && (
                <div style={{
                  fontSize: 11, color: '#9aa090', padding: '8px 16px',
                  borderBottom: '0.5px solid #f0f1e8', background: '#fafbf7',
                }}>
                  Showing 500 of {summary.entryTotal.toLocaleString('en-IN')} entries
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f7f8f3', borderBottom: '0.5px solid #dde0cc' }}>
                    {['Date', 'Type', 'Voucher #', 'Party', 'Amount'].map((h, i) => (
                      <th key={h} style={{
                        fontSize: 11, fontWeight: 500, color: '#9aa090',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        padding: '10px 16px', textAlign: i === 4 ? 'right' : 'left',
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ fontSize: 13, color: '#9aa090', textAlign: 'center', padding: '32px' }}>
                        No sales or purchase entries found in this export.
                      </td>
                    </tr>
                  ) : summary.entries.map((entry, i) => {
                    const badge = ENTRY_BADGE[entry.voucherType] ?? DEFAULT_BADGE
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafbf7', borderBottom: '0.5px solid #f0f1e8' }}>
                        <td style={{ fontSize: 12, color: '#6b7061', padding: '10px 16px', whiteSpace: 'nowrap' }}>{entry.date || '—'}</td>
                        <td style={{ fontSize: 12, padding: '10px 16px' }}>
                          <span style={{
                            background: badge.bg, color: badge.color,
                            fontSize: 11, fontWeight: 500,
                            padding: '2px 8px', borderRadius: 4,
                          }}>
                            {entry.voucherType}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: '#9aa090', padding: '10px 16px', fontVariantNumeric: 'tabular-nums' }}>
                          {entry.voucherNumber || <span style={{ color: '#c8cdb8' }}>—</span>}
                        </td>
                        <td style={{ fontSize: 13, color: '#1e2118', padding: '10px 16px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.party || <span style={{ color: '#9aa090' }}>—</span>}
                        </td>
                        <td style={{ fontSize: 13, color: '#1e2118', padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {entry.amount || <span style={{ color: '#c8cdb8' }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {taxWarningCount > 0 && (
            <div
              style={{
                background: 'rgba(212, 164, 57, 0.14)',
                border: '0.5px solid rgba(212, 164, 57, 0.4)',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 16,
                color: '#6a5413',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {taxWarningCount} invoices have tax discrepancies — flagged for CA review
            </div>
          )}

          {/* Confirm button */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={handleConfirm}
              style={{
                background: '#1e2118', color: '#9cc47a',
                border: 'none', fontSize: 14, fontWeight: 500,
                padding: '12px 28px', borderRadius: 8, cursor: 'pointer',
              }}
            >
              Import {summary.vouchers.toLocaleString('en-IN')} vouchers →
            </button>
            <button
              onClick={reset}
              style={{
                background: 'transparent', color: '#9aa090',
                border: '0.5px solid #dde0cc', fontSize: 13,
                padding: '12px 20px', borderRadius: 8, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Importing progress */}
      {state === 'importing' && summary && (
        <div style={{
          background: '#fff', border: '0.5px solid #dde0cc',
          borderRadius: 12, padding: '40px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1e2118', marginBottom: 24 }}>
            Importing {summary.vouchers.toLocaleString('en-IN')} vouchers…
          </div>
          <div style={{
            height: 4, background: '#f0f1e8',
            borderRadius: 2, overflow: 'hidden', marginBottom: 12, maxWidth: 400, margin: '0 auto 12px',
          }}>
            <div style={{
              height: '100%', background: '#7ea860',
              width: `${Math.min(progress, 100)}%`,
              transition: 'width 0.2s ease',
              borderRadius: 2,
            }} />
          </div>
          <div style={{ fontSize: 12, color: '#9aa090' }}>{Math.min(progress, 100)}%</div>
        </div>
      )}

      {/* Done */}
      {state === 'done' && summary && (
        <div style={{
          background: '#fff', border: '0.5px solid #dde0cc',
          borderRadius: 12, padding: '48px 40px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(126,168,96,0.12)',
            border: '1px solid rgba(126,168,96,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10l5 5 7-8" stroke="#7ea860" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#1e2118', marginBottom: 6 }}>
            Import complete
          </div>
          <div style={{ fontSize: 13, color: '#6b7061', marginBottom: 32 }}>
            Successfully imported {importResult?.inserted ?? 0} vouchers
            {importResult && importResult.skipped_duplicates > 0 && (
              <>
                <br />
                {importResult.skipped_duplicates} duplicate vouchers skipped
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a
              href="/dashboard/returns"
              style={{
                background: '#1e2118', color: '#9cc47a',
                fontSize: 13, fontWeight: 500,
                padding: '10px 22px', borderRadius: 8,
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              View returns →
            </a>
            <button
              onClick={reset}
              style={{
                background: 'transparent', color: '#6b7061',
                border: '0.5px solid #dde0cc', fontSize: 13,
                padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
              }}
            >
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
