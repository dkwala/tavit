'use client'

import { useEffect, useMemo, useState } from 'react'

type Deadline = {
  id: string
  returnType: string
  periodMonth: number
  periodYear: number
  dueDate: string
  status: 'pending' | 'filed' | 'overdue'
  gstin: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function pad(value: number) {
  return String(Math.max(0, value)).padStart(2, '0')
}

function diffParts(target: Date, now: Date) {
  const diff = Math.max(0, target.getTime() - now.getTime())
  const dayMs = 86_400_000
  const hourMs = 3_600_000
  const minuteMs = 60_000

  const days = Math.floor(diff / dayMs)
  const hours = Math.floor((diff % dayMs) / hourMs)
  const minutes = Math.floor((diff % hourMs) / minuteMs)
  const seconds = Math.floor((diff % minuteMs) / 1000)

  return { days, hours, minutes, seconds }
}

function formatDue(date: Date) {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  })
}

export default function DeadlineCountdown({ deadlines }: { deadlines: Deadline[] }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const firstTick = window.setTimeout(() => setNow(new Date()), 0)
    const handle = window.setInterval(() => setNow(new Date()), 1000)
    return () => {
      window.clearTimeout(firstTick)
      window.clearInterval(handle)
    }
  }, [])

  const upcoming = useMemo(() => {
    const base = now ?? new Date()
    return deadlines
      .filter(deadline => deadline.status !== 'filed')
      .map(deadline => ({ deadline, due: new Date(`${deadline.dueDate}T23:59:59`) }))
      .filter(item => item.due > base)
      .sort((a, b) => a.due.getTime() - b.due.getTime())
      .slice(0, 3)
  }, [deadlines, now])

  if (upcoming.length === 0) {
    return (
      <div style={{
        background: '#fff',
        border: '0.5px solid #dde0cc',
        borderRadius: 12,
        padding: 18,
        color: '#9aa090',
        fontSize: 13,
      }}>
        No upcoming deadlines.
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '0.5px solid #dde0cc', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e2118', marginBottom: 14 }}>
        Next 3 Due Dates
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {upcoming.map(({ deadline, due }) => {
          const parts = diffParts(due, now ?? new Date())
          const daysUntil = Math.ceil((due.getTime() - (now ?? new Date()).getTime()) / 86_400_000)
          const soon = daysUntil <= 3

          return (
            <div
              key={deadline.id}
              style={{
                border: `0.5px solid ${soon ? 'rgba(200,160,50,0.35)' : '#dde0cc'}`,
                borderLeft: `3px solid ${soon ? '#c8a032' : '#7ea860'}`,
                borderRadius: 9,
                padding: '12px 12px 11px',
                background: soon ? 'rgba(200,160,50,0.06)' : '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e2118' }}>
                    {deadline.returnType}
                  </div>
                  <div style={{ fontSize: 11, color: '#9aa090', marginTop: 2 }}>
                    {MONTHS[deadline.periodMonth - 1]} {deadline.periodYear} . {formatDue(due)}
                  </div>
                </div>
                {soon && (
                  <span style={{
                    height: 21,
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#8a6a10',
                    background: 'rgba(200,160,50,0.12)',
                    border: '0.5px solid rgba(200,160,50,0.24)',
                    borderRadius: 5,
                    padding: '3px 7px',
                    whiteSpace: 'nowrap',
                  }}>
                    Due soon
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {[
                  ['Days', pad(parts.days)],
                  ['Hrs', pad(parts.hours)],
                  ['Min', pad(parts.minutes)],
                  ['Sec', pad(parts.seconds)],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: '#f8f9f4', borderRadius: 6, padding: '7px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#1e2118', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      {value}
                    </div>
                    <div style={{ fontSize: 9, color: '#9aa090', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
