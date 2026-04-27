'use client'

import { useActionState, useState } from 'react'
import { deleteAccount, type DeleteAccountState } from './actions'

type Props = {
  companyId: string
}

export default function PrivacySection({ companyId }: Props) {
  const [expanded, setExpanded]             = useState(false)
  const [deleteExpanded, setDeleteExpanded] = useState(false)
  const [confirmation, setConfirmation]     = useState('')

  const [state, formAction, isPending] = useActionState<DeleteAccountState, FormData>(
    deleteAccount, undefined,
  )

  return (
    <div style={{ background: '#fff', border: '0.5px solid #dde0cc', borderRadius: 12 }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: '#1e2118' }}>Privacy &amp; Data</span>
        <span style={{
          fontSize: 16, color: '#9aa090',
          transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
        }}>›</span>
      </button>

      {expanded && (
        <div style={{ borderTop: '0.5px solid #eaecda', padding: '20px' }}>

          {/* Data export */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa090', letterSpacing: '0.08em', marginBottom: 10 }}>
              YOUR DATA
            </div>
            <p style={{ fontSize: 12, color: '#6b7061', lineHeight: 1.6, marginBottom: 14 }}>
              Download a copy of your personal data stored in Tavit, including your profile, company membership, and notification preferences. This is provided in compliance with data protection regulations.
            </p>
            <a
              href="/api/settings/export"
              download="tavit-data-export.json"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#f0f3ea', border: '0.5px solid #dde0cc',
                color: '#1e2118', borderRadius: 6, padding: '8px 16px',
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
                transition: 'background 0.12s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1v7M4 6l2.5 2.5L9 6M1.5 10v1.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Download my data
            </a>
          </div>

          {/* Account deletion */}
          <div style={{ borderTop: '0.5px solid #eaecda', paddingTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa090', letterSpacing: '0.08em', marginBottom: 10 }}>
              DELETE ACCOUNT
            </div>
            <p style={{ fontSize: 12, color: '#6b7061', lineHeight: 1.6, marginBottom: 14 }}>
              Permanently delete your account and all associated data. This action cannot be undone and your GST records will be permanently removed.
            </p>

            {!deleteExpanded ? (
              <button
                type="button"
                onClick={() => setDeleteExpanded(true)}
                style={{
                  background: 'rgba(192,57,43,0.06)', border: '0.5px solid rgba(192,57,43,0.3)',
                  color: '#c0392b', borderRadius: 6, padding: '8px 16px',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Delete my account
              </button>
            ) : (
              <form action={formAction}>
                <input type="hidden" name="companyId" value={companyId} />

                <div style={{
                  background: 'rgba(192,57,43,0.04)', border: '0.5px solid rgba(192,57,43,0.2)',
                  borderRadius: 8, padding: '16px',
                }}>
                  <p style={{ fontSize: 12, color: '#c0392b', marginBottom: 14, lineHeight: 1.6 }}>
                    This will permanently delete your account, company data, all GST returns, invoices, and alert history. <strong>This cannot be undone.</strong>
                  </p>

                  <label style={{
                    display: 'block', fontSize: 11, fontWeight: 500,
                    color: '#6b7061', marginBottom: 6, letterSpacing: '0.04em',
                  }}>
                    Type <strong>DELETE</strong> to confirm
                  </label>
                  <input
                    type="text"
                    name="confirmation"
                    value={confirmation}
                    onChange={e => setConfirmation(e.target.value)}
                    placeholder="DELETE"
                    autoComplete="off"
                    style={{
                      width: '100%', background: '#fff',
                      border: `0.5px solid ${state?.errors?.confirmation ? 'rgba(192,57,43,0.6)' : 'rgba(192,57,43,0.25)'}`,
                      borderRadius: 6, color: '#1e2118',
                      padding: '8px 10px', fontSize: 13, outline: 'none',
                      fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 4,
                    }}
                  />
                  {state?.errors?.confirmation && (
                    <p style={{ fontSize: 11, color: '#c0392b', marginBottom: 10 }}>
                      {state.errors.confirmation}
                    </p>
                  )}
                  {state?.message && (
                    <p style={{ fontSize: 11, color: '#c0392b', marginBottom: 10 }}>
                      {state.message}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button
                      type="submit"
                      disabled={isPending || confirmation !== 'DELETE'}
                      style={{
                        background: confirmation === 'DELETE' && !isPending ? '#c0392b' : 'rgba(192,57,43,0.3)',
                        color: '#fff', border: 'none', borderRadius: 6,
                        padding: '8px 16px', fontSize: 13, fontWeight: 500,
                        cursor: confirmation === 'DELETE' && !isPending ? 'pointer' : 'not-allowed',
                        transition: 'background 0.12s',
                      }}
                    >
                      {isPending ? 'Deleting…' : 'Permanently delete account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDeleteExpanded(false); setConfirmation('') }}
                      style={{
                        background: 'transparent', border: '0.5px solid #dde0cc',
                        color: '#6b7061', borderRadius: 6,
                        padding: '8px 16px', fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
