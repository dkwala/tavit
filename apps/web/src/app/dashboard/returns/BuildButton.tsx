'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { buildGstr1Action, buildGstr3bAction } from './actions'

type Props = {
  deadlineId: string
  gstinId: string
  periodMonth: number
  periodYear: number
  isReview: boolean
  returnType: string
}

type Gstr1Result = { kind: 'gstr1'; totals: Record<string, string> }
type Gstr3bResult = { kind: 'gstr3b'; totalCash: string }
type BuildResult = Gstr1Result | Gstr3bResult

export function BuildButton({ deadlineId, gstinId, periodMonth, periodYear, isReview, returnType }: Props) {
  const router = useRouter()
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<BuildResult | null>(null)
  const [error, setError]       = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)

    if (returnType === 'GSTR-1') {
      const res = await buildGstr1Action(gstinId, deadlineId, periodMonth, periodYear)
      setLoading(false)
      if (res.error) setError(res.error)
      else if (res.totals) setResult({ kind: 'gstr1', totals: res.totals })
    } else {
      const res = await buildGstr3bAction(gstinId, deadlineId, periodMonth, periodYear)
      setLoading(false)
      if (res.error) setError(res.error)
      else if (res.summary) setResult({ kind: 'gstr3b', totalCash: res.summary.total_cash })
    }
  }

  if (result) {
    const label = result.kind === 'gstr1'
      ? `Taxable ₹${parseFloat(result.totals['total_taxable'] ?? '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })} · Tax ₹${parseFloat(result.totals['total_tax'] ?? '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
      : `Cash payable ₹${parseFloat(result.totalCash).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: '#5a7a3a' }}>{label}</span>
        <button
          onClick={() => router.push(`/dashboard/returns/gstr3b/${deadlineId}`)}
          style={{
            background: '#1e2118', color: '#9cc47a',
            border: 'none', fontSize: 11, fontWeight: 500,
            padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
          }}>
          Review & File →
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {error && <span style={{ fontSize: 10, color: '#c04040', maxWidth: 140 }}>{error}</span>}
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          background: '#1e2118', color: '#9cc47a',
          border: 'none', fontSize: 11, fontWeight: 500,
          padding: '5px 12px', borderRadius: 6, cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading
          ? 'Building…'
          : isReview
            ? (returnType === 'GSTR-1' ? 'View GSTR-1 →' : 'Review & File →')
            : 'Build →'}
      </button>
    </div>
  )
}
