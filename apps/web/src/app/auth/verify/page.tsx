'use client'

import { useActionState, useEffect, useRef, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { verifyOtp, resendOtp, type VerifyState } from './actions'

function TavitLogo() {
  return (
    <span style={{ fontSize: 22, fontWeight: 500, color: '#e8ddb5', letterSpacing: '-0.3px' }}>
      tav<span style={{ color: '#7ea860' }}>it</span>
    </span>
  )
}

function StepIndicator({ step }: { step: number }) {
  const steps = ['Email', 'Verify', 'Company']
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

function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  const visible = local.slice(0, 2)
  return `${visible}${'•'.repeat(Math.max(2, local.length - 2))}@${domain}`
}

function VerifyContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [countdown, setCountdown] = useState(30)

  const token = digits.join('')

  const [state, action, isPending] = useActionState<VerifyState, FormData>(verifyOtp, undefined)

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function handleDigitChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = cleaned
    setDigits(next)
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text) {
      const next = [...digits]
      for (let i = 0; i < 6; i++) next[i] = text[i] ?? ''
      setDigits(next)
      inputRefs.current[Math.min(text.length, 5)]?.focus()
      e.preventDefault()
    }
  }

  async function handleResend() {
    setResendState('sending')
    const result = await resendOtp(email)
    if (result.error) {
      setResendState('error')
    } else {
      setResendState('sent')
      setCountdown(30)
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#1e2118',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', fontFamily: 'var(--font-geist-sans, sans-serif)',
    }}>
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(90,122,58,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <TavitLogo />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <StepIndicator step={1} />
        </div>

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
            Check your email
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(232,221,181,0.45)', marginBottom: 32, lineHeight: 1.6 }}>
            We sent a 6-digit code to{' '}
            <span style={{ color: 'rgba(232,221,181,0.7)', fontWeight: 500 }}>
              {email ? maskEmail(email) : 'your email'}
            </span>
          </p>

          <form action={action}>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="token" value={token} />

            {/* OTP boxes */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }} onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  style={{
                    width: 48, height: 56, textAlign: 'center',
                    fontSize: 22, fontWeight: 500,
                    background: '#111510',
                    border: 'none',
                    borderBottom: `2px solid ${d ? '#7ea860' : 'rgba(90,122,58,0.25)'}`,
                    borderRadius: '6px 6px 0 0',
                    color: '#e8ddb5', outline: 'none',
                    transition: 'border-color 0.15s',
                    fontFamily: 'var(--font-geist-mono, monospace)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderBottomColor = '#7ea860' }}
                  onBlur={e => { e.currentTarget.style.borderBottomColor = d ? '#7ea860' : 'rgba(90,122,58,0.25)' }}
                />
              ))}
            </div>

            {state?.error && (
              <p style={{
                fontSize: 12, color: 'rgba(220,100,80,0.85)',
                textAlign: 'center', marginBottom: 16,
              }}>
                {state.error}
              </p>
            )}

            {resendState === 'sent' && (
              <p style={{
                fontSize: 12, color: 'rgba(126,168,96,0.8)',
                textAlign: 'center', marginBottom: 16,
              }}>
                New code sent — check your inbox.
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || token.length < 6}
              style={{
                width: '100%',
                background: token.length < 6 ? 'rgba(126,168,96,0.25)' : isPending ? 'rgba(126,168,96,0.5)' : '#7ea860',
                color: token.length < 6 ? 'rgba(30,33,24,0.5)' : '#1e2118',
                fontSize: 14, fontWeight: 500,
                padding: '12px', borderRadius: 8, border: 'none',
                cursor: token.length < 6 || isPending ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {isPending ? 'Verifying…' : 'Verify code →'}
            </button>
          </form>

          {/* Resend */}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            {countdown > 0 ? (
              <span style={{ fontSize: 12, color: 'rgba(232,221,181,0.25)' }}>
                Resend in {countdown}s
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendState === 'sending'}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 12, color: 'rgba(126,168,96,0.7)',
                  cursor: 'pointer', textDecoration: 'underline',
                  textDecorationColor: 'rgba(126,168,96,0.3)',
                }}
              >
                {resendState === 'sending' ? 'Sending…' : 'Resend code'}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(232,221,181,0.25)' }}>
          <Link href="/auth/login" style={{ color: 'rgba(126,168,96,0.6)', textDecoration: 'none' }}>
            ← Use a different email
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: '#1e2118',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: 'rgba(232,221,181,0.3)', fontSize: 14 }}>Loading…</span>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
