'use client'

import { useActionState, useState } from 'react'
import { saveAlertPreferences, type AlertPrefState } from '@/app/dashboard/compliance/actions'

type Props = {
  companyId: string
  prefs: {
    alertDays: number[]
    emailEnabled: boolean
    whatsappEnabled: boolean
    whatsappNumber: string | null
  } | null
}

const ALL_DAYS = [7, 3, 1]

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: on ? '#7ea860' : '#dde0cc',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: on ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  )
}

export default function NotificationsSection({ companyId, prefs }: Props) {
  const [expanded, setExpanded]     = useState(false)
  const [emailOn, setEmailOn]       = useState(prefs?.emailEnabled ?? true)
  const [waOn, setWaOn]             = useState(prefs?.whatsappEnabled ?? false)
  const [waNumber, setWaNumber]     = useState(prefs?.whatsappNumber ?? '')
  const [alertDays, setAlertDays]   = useState<number[]>(prefs?.alertDays ?? [7, 3, 1])

  const [state, formAction, isPending] = useActionState<AlertPrefState, FormData>(
    saveAlertPreferences, undefined,
  )

  function toggleDay(day: number) {
    setAlertDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    )
  }

  const saved = state !== undefined && !state?.errors && !state?.message

  const summary = !expanded
    ? [emailOn && 'Email', waOn && 'WhatsApp'].filter(Boolean).join(' · ') || 'Alerts off'
    : ''

  return (
    <div style={{ background: '#fff', border: '0.5px solid #dde0cc', borderRadius: 12 }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1e2118' }}>Notifications</span>
          {summary && (
            <span style={{ fontSize: 11, color: '#9aa090', marginLeft: 8 }}>{summary}</span>
          )}
        </div>
        <span style={{
          fontSize: 16, color: '#9aa090',
          transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
        }}>›</span>
      </button>

      {expanded && (
        <div style={{ borderTop: '0.5px solid #eaecda' }}>
          <form action={formAction}>
            <input type="hidden" name="companyId" value={companyId} />
            <input type="hidden" name="emailEnabled" value={String(emailOn)} />
            <input type="hidden" name="whatsappEnabled" value={String(waOn)} />
            {alertDays.map(d => (
              <input key={d} type="hidden" name="alertDays" value={String(d)} />
            ))}

            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa090', letterSpacing: '0.08em', marginBottom: 10 }}>
                SEND ALERTS
              </div>
              <p style={{ fontSize: 12, color: '#9aa090', marginBottom: 12, lineHeight: 1.5 }}>
                Receive reminders before GST return due dates.
              </p>

              {/* Alert day toggles */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {ALL_DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    style={{
                      fontSize: 12, fontWeight: 500,
                      padding: '5px 14px', borderRadius: 6, border: 'none',
                      cursor: 'pointer', transition: 'all 0.12s',
                      background: alertDays.includes(day) ? '#1e2118' : '#f0f3ea',
                      color: alertDays.includes(day) ? '#e8ddb5' : '#6b7061',
                    }}
                  >
                    {day}d before
                  </button>
                ))}
              </div>

              {/* Email toggle */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '0.5px solid #eaecda',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1e2118' }}>Email</div>
                  <div style={{ fontSize: 11, color: '#9aa090' }}>Via registered email address</div>
                </div>
                <Toggle on={emailOn} onToggle={() => setEmailOn(v => !v)} />
              </div>

              {/* WhatsApp toggle */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: waOn ? '0.5px solid #eaecda' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1e2118' }}>WhatsApp</div>
                  <div style={{ fontSize: 11, color: '#9aa090' }}>Instant reminders via WhatsApp</div>
                </div>
                <Toggle on={waOn} onToggle={() => setWaOn(v => !v)} />
              </div>

              {waOn && (
                <div style={{ paddingTop: 12 }}>
                  <label style={{
                    display: 'block', fontSize: 11, fontWeight: 500,
                    color: '#6b7061', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}>
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    name="whatsappNumber"
                    value={waNumber}
                    onChange={e => setWaNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%', background: '#f8f9f4',
                      border: `0.5px solid ${state?.errors?.whatsappNumber ? 'rgba(192,57,43,0.5)' : '#dde0cc'}`,
                      borderRadius: 6, color: '#1e2118',
                      padding: '8px 10px', fontSize: 13, outline: 'none',
                      fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />
                  {state?.errors?.whatsappNumber && (
                    <p style={{ fontSize: 11, color: '#c0392b', marginTop: 4 }}>
                      {state.errors.whatsappNumber}
                    </p>
                  )}
                </div>
              )}

              {state?.message && (
                <p style={{ fontSize: 12, color: '#c0392b', marginTop: 10 }}>{state.message}</p>
              )}
              {saved && (
                <p style={{ fontSize: 12, color: '#7ea860', marginTop: 10 }}>Preferences saved.</p>
              )}

              <button
                type="submit"
                disabled={isPending}
                style={{
                  marginTop: 14, width: '100%',
                  background: isPending ? 'rgba(126,168,96,0.5)' : '#7ea860',
                  color: '#1e2118', border: 'none', borderRadius: 6,
                  padding: '8px', fontSize: 13, fontWeight: 500,
                  cursor: isPending ? 'not-allowed' : 'pointer', transition: 'background 0.12s',
                }}
              >
                {isPending ? 'Saving…' : 'Save preferences'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
