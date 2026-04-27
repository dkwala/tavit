'use client'

import { useActionState, useState } from 'react'
import { updateProfile, updatePassword, type ProfileState, type PasswordState } from './actions'

type Props = {
  fullName: string
  username: string
  email: string
}

function Field({
  label, name, type = 'text', defaultValue = '', error, autoComplete, hint,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string
  error?: string
  autoComplete?: string
  hint?: string
}) {
  const [focused, setFocused] = useState(false)
  const [value, setValue] = useState(defaultValue)

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 500,
        color: '#6b7061', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={e => setValue(e.target.value)}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', background: '#f8f9f4',
          border: `0.5px solid ${error ? 'rgba(192,57,43,0.5)' : focused ? 'rgba(90,122,58,0.5)' : '#dde0cc'}`,
          borderRadius: 6, color: '#1e2118',
          padding: '8px 10px', fontSize: 13, outline: 'none',
          fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s',
        }}
      />
      {error && <p style={{ fontSize: 11, color: '#c0392b', marginTop: 4 }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 11, color: '#9aa090', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

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
        borderRadius: 6, userSelect: 'all',
      }}>
        {value}
      </div>
    </div>
  )
}

function SubmitBtn({ isPending, label }: { isPending: boolean; label: string }) {
  return (
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
      {isPending ? 'Saving…' : label}
    </button>
  )
}

export default function ProfileSection({ fullName, username, email }: Props) {
  const [expanded, setExpanded] = useState(false)

  const [profileState, profileAction, profilePending] = useActionState<ProfileState, FormData>(
    updateProfile, undefined,
  )
  const [passwordState, passwordAction, passwordPending] = useActionState<PasswordState, FormData>(
    updatePassword, undefined,
  )

  const profileSaved  = profileState !== undefined && !profileState?.errors && !profileState?.message
  const passwordSaved = passwordState !== undefined && !passwordState?.errors && !passwordState?.message

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
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1e2118' }}>Profile</span>
          {!expanded && (
            <span style={{ fontSize: 11, color: '#9aa090', marginLeft: 8 }}>{fullName}</span>
          )}
        </div>
        <span style={{
          fontSize: 16, color: '#9aa090',
          transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
        }}>›</span>
      </button>

      {expanded && (
        <div style={{ borderTop: '0.5px solid #eaecda', padding: '20px' }}>

          {/* Name & username form */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa090', letterSpacing: '0.08em', marginBottom: 14 }}>
              ACCOUNT DETAILS
            </div>
            <form action={profileAction}>
              <ReadOnlyField label="Email" value={email} />
              <Field
                label="Full Name"
                name="fullName"
                defaultValue={fullName}
                error={profileState?.errors?.fullName}
                autoComplete="name"
              />
              <Field
                label="Username"
                name="username"
                defaultValue={username}
                error={profileState?.errors?.username}
                autoComplete="username"
                hint="Lowercase letters, numbers and underscores only"
              />
              {profileState?.message && (
                <div style={{
                  background: 'rgba(192,57,43,0.06)', border: '0.5px solid rgba(192,57,43,0.3)',
                  borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#c0392b', marginBottom: 12,
                }}>
                  {profileState.message}
                </div>
              )}
              {profileSaved && (
                <p style={{ fontSize: 12, color: '#7ea860', marginBottom: 10 }}>Profile updated.</p>
              )}
              <SubmitBtn isPending={profilePending} label="Save profile" />
            </form>
          </div>

          <div style={{ borderTop: '0.5px solid #eaecda', paddingTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa090', letterSpacing: '0.08em', marginBottom: 14 }}>
              CHANGE PASSWORD
            </div>
            <form action={passwordAction}>
              <Field
                label="Current Password"
                name="currentPassword"
                type="password"
                error={passwordState?.errors?.currentPassword}
                autoComplete="current-password"
              />
              <Field
                label="New Password"
                name="newPassword"
                type="password"
                error={passwordState?.errors?.newPassword}
                autoComplete="new-password"
                hint="At least 8 characters"
              />
              <Field
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                error={passwordState?.errors?.confirmPassword}
                autoComplete="new-password"
              />
              {passwordState?.message && (
                <div style={{
                  background: 'rgba(192,57,43,0.06)', border: '0.5px solid rgba(192,57,43,0.3)',
                  borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#c0392b', marginBottom: 12,
                }}>
                  {passwordState.message}
                </div>
              )}
              {passwordSaved && (
                <p style={{ fontSize: 12, color: '#7ea860', marginBottom: 10 }}>Password updated.</p>
              )}
              <SubmitBtn isPending={passwordPending} label="Update password" />
            </form>
          </div>

        </div>
      )}
    </div>
  )
}
