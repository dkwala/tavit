'use client'

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
        <span style={{ fontSize: 11, color: '#9aa090' }}>Tax Deducted at Source · Running on localhost:5000</span>
      </div>
      <iframe
        src="http://localhost:5000"
        style={{ flex: 1, border: 'none', width: '100%' }}
        title="TDS Engine"
      />
    </div>
  )
}
