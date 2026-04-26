'use client'

import { useMemo, useState, useTransition } from 'react'
import { calcPenalty, fmtINR, periodLabel, fyLabel, ANNUAL_RETURNS } from './penalty'
import { markFiled, markPending } from './actions'

type Deadline = {
  id: string
  gstinId: string
  gstin: string
  returnType: string
  periodMonth: number
  periodYear: number
  dueDate: string
  filingDate: string | null
  status: 'pending' | 'filed' | 'overdue'
  isNilReturn: boolean
  taxPayable: number
  notes: string | null
}

type Filter = 'all' | 'overdue' | 'pending' | 'filed'

const STATUS_COLORS = {
  overdue: { bg: '#fdf0ed', text: '#c0392b', border: 'rgba(192,57,43,0.2)' },
  pending: { bg: '#eef5e4', text: '#3a6020', border: 'rgba(90,122,58,0.2)' },
  filed:   { bg: '#f0f3ea', text: '#5a7a3a', border: 'rgba(90,122,58,0.15)' },
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function GstinBadge({ gstin }: { gstin: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
      background: 'rgba(90,122,58,0.08)', color: '#3a6020',
      border: '0.5px solid rgba(90,122,58,0.18)',
      borderRadius: 4, padding: '2px 6px',
      fontFamily: 'var(--font-geist-mono, monospace)',
    }}>
      {gstin}
    </span>
  )
}

function DeadlineRow({ d, onToggle }: { d: Deadline; onToggle: (id: string, filed: boolean) => void }) {
  const [isPending, startTransition] = useTransition()
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [filingDate, setFilingDate] = useState(new Date().toISOString().slice(0, 10))

  const today = new Date().toISOString().slice(0, 10)
  const isAnnual = ANNUAL_RETURNS.has(d.returnType)
  const periodLbl = isAnnual ? fyLabel(d.periodYear) : periodLabel(d.periodMonth, d.periodYear)

  const dueLbl = new Date(d.dueDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  // Days overdue or days remaining
  const todayMs   = new Date(today).getTime()
  const dueMs     = new Date(d.dueDate).getTime()
  const diffDays  = Math.round((dueMs - todayMs) / 86_400_000)

  let timeLabel = ''
  let timeLabelColor = '#9aa090'
  if (d.status === 'filed') {
    const filedLbl = d.filingDate
      ? new Date(d.filingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—'
    timeLabel = `Filed ${filedLbl}`
    timeLabelColor = '#7ea860'
  } else if (d.status === 'overdue') {
    const daysLate = Math.abs(diffDays)
    timeLabel = `${daysLate} day${daysLate !== 1 ? 's' : ''} overdue`
    timeLabelColor = '#c0392b'
  } else {
    if (diffDays === 0) { timeLabel = 'Due today'; timeLabelColor = '#d97706' }
    else if (diffDays === 1) { timeLabel = 'Due tomorrow'; timeLabelColor = '#d97706' }
    else if (diffDays <= 7) { timeLabel = `${diffDays} days left`; timeLabelColor = '#d97706' }
    else { timeLabel = `${diffDays} days left`; timeLabelColor = '#9aa090' }
  }

  // Penalty for overdue rows
  let penaltyLabel = ''
  if (d.status === 'overdue') {
    const p = calcPenalty(d.returnType, d.isNilReturn, d.dueDate, today, d.taxPayable / 100)
    penaltyLabel = `Penalty ${fmtINR(p.lateFee)}${p.interest > 0 ? ` + Int. ${fmtINR(p.interest)}` : ''}`
  }

  const sc = STATUS_COLORS[d.status]

  function handleMarkFiled() {
    startTransition(async () => {
      const result = await markFiled(d.id, filingDate)
      if (!result.error) {
        onToggle(d.id, true)
        setShowDatePicker(false)
      }
    })
  }

  function handleMarkPending() {
    startTransition(async () => {
      const result = await markPending(d.id, d.dueDate)
      if (!result.error) {
        onToggle(d.id, false)
      }
    })
  }

  return (
    <div style={{
      padding: '12px 0',
      borderBottom: '0.5px solid #eaecda',
      opacity: isPending ? 0.55 : 1,
      transition: 'opacity 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Left: return info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e2118' }}>
              {d.returnType}
            </span>
            <span style={{ fontSize: 12, color: '#6b7061' }}>·</span>
            <span style={{ fontSize: 12, color: '#6b7061' }}>{periodLbl}</span>
            <GstinBadge gstin={d.gstin} />
            {d.isNilReturn && (
              <span style={{
                fontSize: 10, background: '#f0f3ea', color: '#5a7a3a',
                border: '0.5px solid rgba(90,122,58,0.2)', borderRadius: 4,
                padding: '2px 6px', fontWeight: 500,
              }}>
                Nil
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#9aa090' }}>Due {dueLbl}</span>
            <span style={{ fontSize: 11, color: timeLabelColor, fontWeight: 500 }}>{timeLabel}</span>
            {penaltyLabel && (
              <span style={{ fontSize: 11, color: '#c0392b', fontWeight: 500 }}>{penaltyLabel}</span>
            )}
          </div>
        </div>

        {/* Right: status + action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
            textTransform: 'uppercase',
            background: sc.bg, color: sc.text,
            border: `0.5px solid ${sc.border}`,
            borderRadius: 4, padding: '3px 8px',
          }}>
            {d.status}
          </span>

          {d.status !== 'filed' && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDatePicker(v => !v)}
                disabled={isPending}
                style={{
                  fontSize: 11, fontWeight: 500,
                  background: '#7ea860', color: '#1e2118',
                  border: 'none', borderRadius: 6,
                  padding: '5px 10px', cursor: 'pointer',
                  transition: 'opacity 0.1s',
                }}
              >
                Mark filed
              </button>
              {showDatePicker && (
                <div style={{
                  position: 'absolute', right: 0, top: '110%', zIndex: 10,
                  background: '#fff', border: '0.5px solid #dde0cc',
                  borderRadius: 8, padding: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  minWidth: 220,
                }}>
                  <div style={{ fontSize: 11, color: '#6b7061', marginBottom: 6 }}>Filing date</div>
                  <input
                    type="date"
                    value={filingDate}
                    max={today}
                    onChange={e => setFilingDate(e.target.value)}
                    style={{
                      width: '100%', padding: '6px 10px',
                      border: '0.5px solid #dde0cc', borderRadius: 6,
                      fontSize: 13, color: '#1e2118', background: '#f8f9f4',
                      outline: 'none', marginBottom: 8,
                    }}
                  />
                  <button
                    onClick={handleMarkFiled}
                    style={{
                      width: '100%', background: '#7ea860', color: '#1e2118',
                      border: 'none', borderRadius: 6, padding: '7px',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                </div>
              )}
            </div>
          )}

          {d.status === 'filed' && (
            <button
              onClick={handleMarkPending}
              disabled={isPending}
              style={{
                fontSize: 11, fontWeight: 500,
                background: 'transparent', color: '#9aa090',
                border: '0.5px solid #dde0cc', borderRadius: 6,
                padding: '5px 10px', cursor: 'pointer',
              }}
            >
              Undo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CalendarView({ deadlines: initial }: { deadlines: Deadline[] }) {
  const [deadlines, setDeadlines] = useState(initial)
  const [filter, setFilter]       = useState<Filter>('all')
  const [gstinFilter, setGstinFilter] = useState<string>('all')

  const uniqueGstins = Array.from(new Set(initial.map(d => d.gstin)))

  const counts = {
    all:     initial.length,
    overdue: initial.filter(d => d.status === 'overdue').length,
    pending: initial.filter(d => d.status === 'pending').length,
    filed:   initial.filter(d => d.status === 'filed').length,
  }

  const filtered = deadlines
    .filter(d => filter === 'all' || d.status === filter)
    .filter(d => gstinFilter === 'all' || d.gstin === gstinFilter)
    .sort((a, b) => {
      // Sort order: overdue first (by due date ASC), then pending (by due date ASC), then filed (by due date DESC)
      const order = { overdue: 0, pending: 1, filed: 2 }
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      if (a.status === 'filed') return b.dueDate.localeCompare(a.dueDate)
      return a.dueDate.localeCompare(b.dueDate)
    })

  const grouped = useMemo(() => {
    const monthMap = new Map<string, { key: string; label: string; date: Date; items: Deadline[] }>()

    for (const deadline of filtered) {
      const due = new Date(deadline.dueDate)
      const key = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}`

      if (!monthMap.has(key)) {
        monthMap.set(key, {
          key,
          label: `${MONTHS[due.getMonth()]} ${due.getFullYear()}`,
          date: new Date(due.getFullYear(), due.getMonth(), 1),
          items: [],
        })
      }

      monthMap.get(key)?.items.push(deadline)
    }

    return Array.from(monthMap.values()).sort((a, b) => {
      const aHasOpen = a.items.some(item => item.status !== 'filed')
      const bHasOpen = b.items.some(item => item.status !== 'filed')
      if (aHasOpen !== bHasOpen) return aHasOpen ? -1 : 1
      return a.date.getTime() - b.date.getTime()
    })
  }, [filtered])

  function handleToggle(id: string, filed: boolean) {
    setDeadlines(prev =>
      prev.map(d => {
        if (d.id !== id) return d
        if (filed) {
          return { ...d, status: 'filed', filingDate: new Date().toISOString().slice(0, 10) }
        }
        const today0 = new Date()
        today0.setHours(0, 0, 0, 0)
        const due = new Date(d.dueDate)
        return { ...d, status: due < today0 ? 'overdue' : 'pending', filingDate: null }
      })
    )
  }

  const TABS: { key: Filter; label: string }[] = [
    { key: 'all',     label: 'All' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'pending', label: 'Pending' },
    { key: 'filed',   label: 'Filed' },
  ]

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap', marginBottom: 16,
      }}>
        {/* Filter tabs */}
        <div style={{
          display: 'flex', gap: 4, background: '#fff',
          border: '0.5px solid #dde0cc', borderRadius: 8, padding: 4,
        }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                fontSize: 12, fontWeight: 500,
                padding: '5px 12px', borderRadius: 6, border: 'none',
                cursor: 'pointer', transition: 'all 0.12s',
                background: filter === tab.key ? '#1e2118' : 'transparent',
                color: filter === tab.key ? '#e8ddb5' : '#6b7061',
              }}
            >
              {tab.label}
              <span style={{
                marginLeft: 5, fontSize: 10,
                color: filter === tab.key ? 'rgba(232,221,181,0.5)' : '#9aa090',
              }}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* GSTIN filter */}
        {uniqueGstins.length > 1 && (
          <select
            value={gstinFilter}
            onChange={e => setGstinFilter(e.target.value)}
            style={{
              fontSize: 12, color: '#1e2118',
              border: '0.5px solid #dde0cc', borderRadius: 6,
              padding: '5px 10px', background: '#f8f9f4',
              outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="all">All GSTINs</option>
            {uniqueGstins.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        )}
      </div>

      {/* Monthly cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 14,
      }}>
        {filtered.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            background: '#fff',
            border: '0.5px solid #dde0cc',
            borderRadius: 12,
            padding: '40px 24px',
            textAlign: 'center',
            color: '#9aa090',
            fontSize: 13,
          }}>
            No {filter === 'all' ? '' : filter} returns found.
          </div>
        ) : (
          grouped.map(month => (
            <div
              key={month.key}
              style={{
                background: '#fff',
                border: '0.5px solid #dde0cc',
                borderRadius: 12,
                padding: '16px 18px 4px',
                boxShadow: '0 1px 2px rgba(30,33,24,0.04)',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                paddingBottom: 10,
                marginBottom: 2,
                borderBottom: '1px solid #eaecda',
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e2118', letterSpacing: '-0.2px' }}>
                  {month.label}
                </div>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#5a7a3a',
                  background: 'rgba(90,122,58,0.09)',
                  border: '0.5px solid rgba(90,122,58,0.18)',
                  borderRadius: 5,
                  padding: '2px 7px',
                }}>
                  {month.items.filter(item => item.status !== 'filed').length} open
                </span>
              </div>
              {month.items.map(d => (
                <DeadlineRow key={d.id} d={d} onToggle={handleToggle} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
