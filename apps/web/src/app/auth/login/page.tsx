'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { sendOtp, type LoginState } from './actions'

function TavitLogo() {
  return (
    <span style={{ fontSize: 22, fontWeight: 500, color: '#e8ddb5', letterSpacing: '-0.3px' }}>
      tav<span style={{ color: '#7ea860' }}>it</span>
    </span>
  )
}

function StepIndicator({ step }: { step: number }) {
  const steps = ['Email', 'Verify', 'Profile', 'Company']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
      {steps.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: i < step ? '#7ea860' : i === step ? 'rgba(126,168,96,0.15)' : 'rgba(232,221,181,0.06)',
              border: i === step ? '1px solid #7ea860' : i < step ? 'none' : '1px solid rgba(232,221,181,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 500,
              color: i < step ? '#1e2118' : i === step ? '#7ea860' : 'rgba(232,221,181,0.3)',
              transition: 'all 0.2s',
            }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{
              fontSize: 12,
              color: i === step ? 'rgba(232,221,181,0.75)' : 'rgba(232,221,181,0.25)',
              fontWeight: i === step ? 500 : 400,
            }}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: 24, height: 1, background: 'rgba(232,221,181,0.1)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function LoginPage() {
  const [state, action, isPending] = useActionState<LoginState, FormData>(sendOtp, undefined)

  return (
    <div style={{
      minHeight: '100vh', background: '#1e2118',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', fontFamily: 'var(--font-geist-sans, sans-serif)',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(90,122,58,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <TavitLogo />
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <StepIndicator step={0} />
        </div>

        {/* Card */}
        <div style={{
          background: '#1a1f14',
          border: '0.5px solid rgba(90,122,58,0.2)',
          borderRadius: 16,
          padding: '36px 32px',
        }}>
          <h1 style={{
            fontSize: 22, fontWeight: 500, color: '#e8ddb5',
            letterSpacing: '-0.4px', marginBottom: 8,
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(232,221,181,0.45)', marginBottom: 24, lineHeight: 1.6 }}>
            Sign in with Google or use your email.
          </p>

          {/* Google OAuth */}
          <a
            href="/auth/google"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '11px 14px', borderRadius: 8,
              background: 'transparent',
              border: '0.5px solid rgba(232,221,181,0.15)',
              color: 'rgba(232,221,181,0.75)', fontSize: 14, fontWeight: 500,
              textDecoration: 'none', transition: 'border-color 0.15s, background 0.15s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(126,168,96,0.4)'
              ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(126,168,96,0.06)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(232,221,181,0.15)'
              ;(e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
            }}
          >
            {/* Google "G" SVG */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(232,221,181,0.1)' }} />
            <span style={{ fontSize: 11, color: 'rgba(232,221,181,0.3)', letterSpacing: '0.05em' }}>OR</span>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(232,221,181,0.1)' }} />
          </div>

          <form action={action}>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 500,
                color: 'rgba(232,221,181,0.55)', marginBottom: 8, letterSpacing: '0.03em',
              }}>
                WORK EMAIL
              </label>
              <input
                type="email"
                name="email"
                defaultValue={state?.email ?? ''}
                placeholder="you@company.com"
                required
                autoFocus
                autoComplete="email"
                style={{
                  width: '100%', background: '#111510',
                  border: `0.5px solid ${state?.error ? 'rgba(220,100,80,0.5)' : 'rgba(90,122,58,0.25)'}`,
                  borderRadius: 8, color: '#e8ddb5',
                  padding: '11px 14px', fontSize: 15, outline: 'none',
                  transition: 'border-color 0.15s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(126,168,96,0.6)' }}
                onBlur={e => { e.currentTarget.style.borderColor = state?.error ? 'rgba(220,100,80,0.5)' : 'rgba(90,122,58,0.25)' }}
              />
              {state?.error && (
                <p style={{ fontSize: 12, color: 'rgba(220,100,80,0.85)', marginTop: 6 }}>
                  {state.error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              style={{
                width: '100%', background: isPending ? 'rgba(126,168,96,0.5)' : '#7ea860',
                color: '#1e2118', fontSize: 14, fontWeight: 500,
                padding: '12px', borderRadius: 8, border: 'none',
                cursor: isPending ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s', letterSpacing: '-0.1px',
              }}
            >
              {isPending ? 'Sending…' : 'Send OTP →'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(232,221,181,0.25)' }}>
          <Link href="/" style={{ color: 'rgba(126,168,96,0.6)', textDecoration: 'none' }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
