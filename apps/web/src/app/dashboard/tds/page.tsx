'use client'

const TDS_URL = process.env.NEXT_PUBLIC_TDS_URL ?? 'http://localhost:5000'

export default function TdsPage() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '16px 24px',
        borderBottom: '0.5px solid #dde0cc',
        background: '#fff',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: '#1e2118', margin: 0 }}>TDS</h1>
        <span style={{ fontSize: 11, color: '#9aa090' }}>Tax Deducted at Source</span>
        <a
          href={TDS_URL}
          target="_blank"
          rel="noreferrer"
          style={{ marginLeft: 'auto', fontSize: 11, color: '#7ea860', textDecoration: 'none' }}
        >
          Open in new tab ↗
        </a>
      </div>
      <iframe
        src={TDS_URL}
        style={{ flex: 1, border: 'none', width: '100%' }}
        title="TDS Engine"
      />
    </div>
  )
}
