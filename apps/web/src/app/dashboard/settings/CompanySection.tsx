'use client'

import { useActionState, useState } from 'react'
import { updateCompany, type CompanyState } from './actions'

type Gstin = { gstin: string; trade_name: string | null; status: string }

type Props = {
  companyId: string
  name: string
  pan: string
  stateCode: string
  financialYearStart: number
  tier: string
  gstins: Gstin[]
  isOwner: boolean
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 500,
        color: '#6b7061', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>
        {label}
      </label>
      <div style={{
        padding: '8px 10px', fontSize: 13, color: '#9aa090',
        background: '#f2f3eb', border: '0.5px solid #e8e9df',
        borderRadius: 6, letterSpacing: label === 'PAN' ? '0.06em' : undefined,
      }}>
        {value}
      </div>
    </div>
  )
}

export default function CompanySection({
  companyId, name, pan, stateCode, financialYearStart, tier, gstins, isOwner,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [companyName, setCompanyName] = useState(name)
  const [fyStart, setFyStart] = useState(financialYearStart)
  const [focused, setFocused] = useState(false)

  const [state, formAction, isPending] = useActionState<CompanyState, FormData>(updateCompany, undefined)

  const saved = state !== undefined && !state?.errors && !state?.message

  const tierLabels: Record<string, string> = {
    starter: 'Starter',
    growth: 'Growth',
    pro: 'Pro',
  }

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
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1e2118' }}>Company</span>
          {!expanded && (
            <span style={{ fontSize: 11, color: '#9aa090', marginLeft: 8 }}>{name}</span>
          )}
        </div>
        <span style={{
          fontSize: 16, color: '#9aa090',
          transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
        }}>›</span>
      </button>

      {expanded && (
        <div style={{ borderTop: '0.5px solid #eaecda', padding: '20px' }}>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa090', letterSpacing: '0.08em', marginBottom: 14 }}>
              REGISTRATION
            </div>
            <ReadOnlyField label="PAN" value={pan} />
            <ReadOnlyField
              label="State"
              value={`State Code ${stateCode}`}
            />
            <ReadOnlyField
              label="Plan"
              value={tierLabels[tier] ?? tier}
            />
          </div>

          {/* GSTINs */}
          {gstins.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa090', letterSpacing: '0.08em', marginBottom: 10 }}>
                REGISTERED GSTINs
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {gstins.map(g => (
                  <div
                    key={g.gstin}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', background: '#f8f9f4',
                      border: '0.5px solid #e8e9df', borderRadius: 6,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-geist-mono, monospace)', color: '#1e2118', letterSpacing: '0.06em' }}>
                        {g.gstin}
                      </span>
                      {g.trade_name && (
                        <span style={{ fontSize: 11, color: '#9aa090', marginLeft: 8 }}>{g.trade_name}</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 10,
                      background: g.status === 'active' ? 'rgba(90,122,58,0.1)' : 'rgba(192,57,43,0.08)',
                      color: g.status === 'active' ? '#5a7a3a' : '#c0392b',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {g.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editable fields — owner only */}
          {isOwner ? (
            <form action={formAction}>
              <input type="hidden" name="companyId" value={companyId} />

              <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa090', letterSpacing: '0.08em', marginBottom: 14 }}>
                EDIT DETAILS
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 500,
                  color: '#6b7061', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  Company Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={{
                    width: '100%', background: '#f8f9f4',
                    border: `0.5px solid ${state?.errors?.name ? 'rgba(192,57,43,0.5)' : focused ? 'rgba(90,122,58,0.5)' : '#dde0cc'}`,
                    borderRadius: 6, color: '#1e2118',
                    padding: '8px 10px', fontSize: 13, outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
                {state?.errors?.name && (
                  <p style={{ fontSize: 11, color: '#c0392b', marginTop: 4 }}>{state.errors.name}</p>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 500,
                  color: '#6b7061', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  Financial Year Start
                </label>
                <select
                  name="financialYearStart"
                  value={fyStart}
                  onChange={e => setFyStart(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%', background: '#f8f9f4',
                    border: '0.5px solid #dde0cc', borderRadius: 6, color: '#1e2118',
                    padding: '8px 10px', fontSize: 13, outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer',
                  }}
                >
                  {MONTHS.map((month, i) => (
                    <option key={i + 1} value={i + 1}>{month}</option>
                  ))}
                </select>
                <p style={{ fontSize: 11, color: '#9aa090', marginTop: 4 }}>
                  April is standard for Indian businesses (April–March FY)
                </p>
              </div>

              {state?.message && (
                <div style={{
                  background: 'rgba(192,57,43,0.06)', border: '0.5px solid rgba(192,57,43,0.3)',
                  borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#c0392b', marginBottom: 12,
                }}>
                  {state.message}
                </div>
              )}
              {saved && (
                <p style={{ fontSize: 12, color: '#7ea860', marginBottom: 10 }}>Company details updated.</p>
              )}

              <button
                type="submit"
                disabled={isPending}
                style={{
                  background: isPending ? 'rgba(126,168,96,0.5)' : '#7ea860',
                  color: '#1e2118', border: 'none', borderRadius: 6,
                  padding: '8px 20px', fontSize: 13, fontWeight: 500,
                  cursor: isPending ? 'not-allowed' : 'pointer', transition: 'background 0.12s',
                }}
              >
                {isPending ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          ) : (
            <p style={{ fontSize: 12, color: '#9aa090' }}>
              Only company owners can edit company details.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
