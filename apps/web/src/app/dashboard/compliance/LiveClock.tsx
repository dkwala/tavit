'use client'

import { useEffect, useState } from 'react'

function formatClock(date: Date) {
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const firstTick = window.setTimeout(() => setNow(new Date()), 0)
    const handle = window.setInterval(() => setNow(new Date()), 1000)
    return () => {
      window.clearTimeout(firstTick)
      window.clearInterval(handle)
    }
  }, [])

  return (
    <div style={{
      fontSize: 12,
      color: '#6b7061',
      fontVariantNumeric: 'tabular-nums',
      background: '#fff',
      border: '0.5px solid #dde0cc',
      borderRadius: 8,
      padding: '7px 10px',
      minWidth: 188,
      textAlign: 'center',
    }}>
      {now ? formatClock(now) : 'Syncing clock'}
    </div>
  )
}
