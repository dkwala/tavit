'use client'

import { useState, useRef, useCallback } from 'react'

type ParsedSummary = {
  vouchers: number
  ledgers: number
  stockItems: number
  companies: string[]
  periodFrom: string | null
  periodTo: string | null
  fileName: string
  fileSizeKb: number
}

function parseXmlSummary(xml: string, fileName: string, fileSize: number): ParsedSummary {
  const count = (tag: string) => (xml.match(new RegExp(`<${tag}[\\s>]`, 'gi')) ?? []).length

  // Extract company names
  const companyMatches = [...xml.matchAll(/<COMPANYNAME[^>]*>([^<]+)<\/COMPANYNAME>/gi)]
  const companies = [...new Set(companyMatches.map(m => m[1].trim()))].filter(Boolean)

  // Extract dates from vouchers for period detection
  const dateMatches = [...xml.matchAll(/<DATE>(\d{8})<\/DATE>/g)]
  const dates = dateMatches.map(m => m[1]).sort()
  const toDisplayDate = (d: string) =>
    d.length === 8 ? `${d.slice(6)}/${d.slice(4, 6)}/${d.slice(0, 4)}` : null

  return {
    vouchers:   count('VOUCHER'),
    ledgers:    count('LEDGER'),
    stockItems: count('STOCKITEM'),
    companies:  companies.length > 0 ? companies : ['Unknown company'],
    periodFrom: dates.length > 0 ? toDisplayDate(dates[0]) : null,
    periodTo:   dates.length > 0 ? toDisplayDate(dates[dates.length - 1]) : null,
    fileName,
    fileSizeKb: Math.round(fileSize / 1024),
  }
}

type UploadState = 'idle' | 'dragging' | 'parsing' | 'preview' | 'importing' | 'done' | 'error'

export default function TallyImportPage() {
  const [state, setState]       = useState<UploadState>('idle')
  const [summary, setSummary]   = useState<ParsedSummary | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
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
      const parsed = parseXmlSummary(xml, file.name, file.size)
      if (parsed.vouchers === 0 && parsed.ledgers === 0) {
        setErrorMsg('No vouchers or ledgers found. Try exporting with "All Masters" and "All Vouchers" selected.')
        setState('error')
        return
      }
      setSummary(parsed)
      setState('preview')
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

  const handleConfirm = () => {
    setState('importing')
    setProgress(0)
    // Simulate import progress — real API call goes here
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          setState('done')
          return 100
        }
        return p + Math.floor(Math.random() * 12) + 4
      })
    }, 180)
  }

  const reset = () => {
    setState('idle')
    setSummary(null)
    setErrorMsg('')
    setProgress(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ padding: '40px', maxWidth: 760 }}>
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
      {state === 'idle' || state === 'dragging' || state === 'error' ? (
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
              Gateway of Tally → <strong>E: Export</strong> → Master & Transactions → Format: <strong>XML</strong> → Export
            </div>
          </div>
        </div>
      ) : null}

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
              { label: 'Vouchers found', value: summary.vouchers.toLocaleString('en-IN'), accent: true },
              { label: 'Ledgers found',  value: summary.ledgers.toLocaleString('en-IN'),  accent: false },
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

          {/* Detail panel */}
          <div style={{
            background: '#fff', border: '0.5px solid #dde0cc',
            borderRadius: 10, padding: '20px',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7061', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Import details
            </div>
            {[
              { label: 'Company',    value: summary.companies.join(', ') },
              { label: 'Period from', value: summary.periodFrom ?? 'Not detected' },
              { label: 'Period to',   value: summary.periodTo   ?? 'Not detected' },
              { label: 'File',       value: `${summary.fileName} (${summary.fileSizeKb} KB)` },
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
            {summary.vouchers.toLocaleString('en-IN')} vouchers and {summary.ledgers.toLocaleString('en-IN')} ledgers imported successfully.
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
