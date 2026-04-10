'use client'

import { useActionState, useState } from 'react'
import { saveCompanyProfile, type OnboardingState } from './actions'

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

function AbstractIllustration() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 300, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '10%', left: '-10%',
        width: 280, height: 280, borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
        background: 'rgba(90,122,58,0.08)',
        border: '0.5px solid rgba(90,122,58,0.15)',
      }} />
      <div style={{
        position: 'absolute', top: '30%', left: '20%',
        width: 200, height: 200, borderRadius: '40% 60% 30% 70% / 60% 40% 60% 40%',
        background: 'rgba(126,168,96,0.06)',
        border: '0.5px solid rgba(126,168,96,0.12)',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', right: '-5%',
        width: 160, height: 240, borderRadius: '70% 30% 50% 50% / 30% 70% 30% 70%',
        background: 'rgba(74,102,48,0.1)',
      }} />

      <div style={{ position: 'absolute', bottom: '20%', left: '10%', right: '10%' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            height: 1,
            background: `rgba(90,122,58,${0.04 + i * 0.04})`,
            marginBottom: 16 + i * 4,
            borderRadius: 1,
          }} />
        ))}
      </div>

      <div style={{
        position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)',
        width: 160, background: '#1a1f14',
        border: '0.5px solid rgba(90,122,58,0.25)',
        borderRadius: 10, padding: '16px 14px',
      }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(126,168,96,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          GSTR-3B
        </div>
        {[
          { label: 'ITC Claimed', value: '₹84,200' },
          { label: 'Tax Payable', value: '₹12,440' },
          { label: 'Filed', value: 'On time' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: 'rgba(232,221,181,0.35)' }}>{row.label}</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: row.label === 'Filed' ? '#7ea860' : 'rgba(232,221,181,0.65)', fontFamily: 'var(--font-geist-mono, monospace)' }}>{row.value}</span>
          </div>
        ))}
        <div style={{ marginTop: 10, height: 1, background: 'rgba(90,122,58,0.15)' }} />
        <div style={{ marginTop: 8, display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7ea860' }} />
          <span style={{ fontSize: 9, color: 'rgba(126,168,96,0.7)' }}>Auto-computed by Tavit</span>
        </div>
      </div>
    </div>
  )
}

type FieldProps = {
  label: string
  name: string
  placeholder: string
  hint: string
  error?: string
  defaultValue?: string
  maxLength?: number
  onChange?: (v: string) => void
  transform?: (v: string) => string
}

function FormField({ label, name, placeholder, hint, error, defaultValue, maxLength, onChange, transform }: FieldProps) {
  const [focused, setFocused] = useState(false)
  const [value, setValue] = useState(defaultValue ?? '')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = transform ? transform(e.target.value) : e.target.value
    setValue(v)
    onChange?.(v)
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, fontWeight: 500,
        color: 'rgba(232,221,181,0.55)', marginBottom: 7, letterSpacing: '0.04em',
      }}>
        <span>{label}</span>
        {maxLength && (
          <span style={{ color: value.length === maxLength ? 'rgba(126,168,96,0.7)' : 'rgba(232,221,181,0.25)' }}>
            {value.length}/{maxLength}
          </span>
        )}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', background: '#111510',
          border: `0.5px solid ${error ? 'rgba(220,100,80,0.5)' : focused ? 'rgba(126,168,96,0.6)' : 'rgba(90,122,58,0.25)'}`,
          borderRadius: 8, color: '#e8ddb5',
          padding: '11px 14px', fontSize: 14, outline: 'none',
          transition: 'border-color 0.15s', fontFamily: 'inherit',
          letterSpacing: name !== 'companyName' ? '0.05em' : undefined,
        }}
      />
      {error ? (
        <p style={{ fontSize: 11, color: 'rgba(220,100,80,0.8)', marginTop: 5 }}>{error}</p>
      ) : (
        <p style={{ fontSize: 11, color: 'rgba(232,221,181,0.25)', marginTop: 5 }}>{hint}</p>
      )}
    </div>
  )
}

export default function OnboardingForm() {
  const [state, action, isPending] = useActionState<OnboardingState, FormData>(saveCompanyProfile, undefined)

  return (
    <div style={{
      minHeight: '100vh', background: '#1e2118',
      fontFamily: 'var(--font-geist-sans, sans-serif)',
    }}>
      <div style={{
        position: 'fixed', top: '30%', right: '20%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(90,122,58,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 960, margin: '0 auto', padding: '0 24px',
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 0', borderBottom: '0.5px solid rgba(90,122,58,0.1)',
        }}>
          <TavitLogo />
          <StepIndicator step={2} />
        </div>

        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 48, alignItems: 'center',
          padding: '48px 0',
        }}>
          <div>
            <div style={{ marginBottom: 32 }}>
              <div style={{
                display: 'inline-block', background: 'rgba(90,122,58,0.15)',
                border: '0.5px solid rgba(90,122,58,0.3)',
                color: '#9cc47a', fontSize: 11, fontWeight: 500,
                padding: '3px 10px', borderRadius: 20,
                letterSpacing: '0.07em', textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                Last step
              </div>
              <h1 style={{
                fontSize: 28, fontWeight: 500, color: '#e8ddb5',
                letterSpacing: '-0.5px', lineHeight: 1.25, marginBottom: 12,
              }}>
                Set up your<br />
                <span style={{ color: '#7ea860' }}>workspace</span>
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(232,221,181,0.45)', lineHeight: 1.7, maxWidth: 320 }}>
                We need a few details to personalise your compliance dashboard and pre-fill your GST returns.
              </p>
            </div>

            <div style={{ height: 280 }}>
              <AbstractIllustration />
            </div>
          </div>

          <div style={{
            background: '#1a1f14',
            border: '0.5px solid rgba(90,122,58,0.2)',
            borderRadius: 16,
            padding: '36px 32px',
          }}>
            <h2 style={{
              fontSize: 16, fontWeight: 500, color: '#e8ddb5',
              letterSpacing: '-0.3px', marginBottom: 28,
            }}>
              Company details
            </h2>

            <form action={action}>
              <FormField
                label="COMPANY NAME"
                name="companyName"
                placeholder="Acme Exports Pvt Ltd"
                hint="Legal name as registered with MCA"
                error={state?.errors?.companyName}
                defaultValue={state?.values?.companyName}
              />
              <FormField
                label="GSTIN"
                name="gstin"
                placeholder="27AABCP1234C1ZV"
                hint="15-character GST identification number"
                error={state?.errors?.gstin}
                defaultValue={state?.values?.gstin}
                maxLength={15}
                transform={v => v.toUpperCase()}
              />
              <FormField
                label="PAN"
                name="pan"
                placeholder="AABCP1234C"
                hint="10-character Permanent Account Number"
                error={state?.errors?.pan}
                defaultValue={state?.values?.pan}
                maxLength={10}
                transform={v => v.toUpperCase()}
              />

              {state?.message && (
                <p style={{ fontSize: 12, color: 'rgba(220,100,80,0.85)', marginBottom: 16 }}>
                  {state.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                style={{
                  width: '100%',
                  background: isPending ? 'rgba(126,168,96,0.5)' : '#7ea860',
                  color: '#1e2118', fontSize: 14, fontWeight: 500,
                  padding: '13px', borderRadius: 8, border: 'none',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s', marginTop: 4,
                }}
              >
                {isPending ? 'Setting up…' : 'Launch my workspace →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(232,221,181,0.2)', marginTop: 20, lineHeight: 1.6 }}>
              Your data is encrypted and never shared with third parties.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
