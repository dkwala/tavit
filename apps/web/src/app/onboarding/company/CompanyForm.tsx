'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { saveCompanyProfile, type CompanyState } from './actions'

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

type FieldProps = {
  label: string
  name: string
  placeholder: string
  hint: string
  error?: string
  defaultValue?: string
  maxLength?: number
  transform?: (v: string) => string
  autoComplete?: string
}

function FormField({
  label, name, placeholder, hint, error, defaultValue,
  maxLength, transform, autoComplete,
}: FieldProps) {
  const [focused, setFocused] = useState(false)
  const [value, setValue] = useState(defaultValue ?? '')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = transform ? transform(e.target.value) : e.target.value
    setValue(v)
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 11, fontWeight: 500,
        color: 'rgba(232,221,181,0.55)', marginBottom: 7, letterSpacing: '0.04em',
      }}>
        <span>{label} <span style={{ color: 'rgba(220,100,80,0.7)' }}>*</span></span>
        {maxLength && (
          <span style={{ color: value.length === maxLength ? 'rgba(126,168,96,0.7)' : 'rgba(232,221,181,0.25)', fontWeight: 400, letterSpacing: 0 }}>
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
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', background: '#111510',
          border: `0.5px solid ${error ? 'rgba(220,100,80,0.5)' : focused ? 'rgba(126,168,96,0.6)' : 'rgba(90,122,58,0.25)'}`,
          borderRadius: 8, color: '#e8ddb5',
          padding: '11px 14px', fontSize: 14, outline: 'none',
          transition: 'border-color 0.15s', fontFamily: 'inherit',
          letterSpacing: name === 'gstin' || name === 'pan' ? '0.08em' : undefined,
          boxSizing: 'border-box',
        }}
      />
      {error ? (
        <p style={{ fontSize: 11, color: 'rgba(220,100,80,0.8)', marginTop: 5 }}>{error}</p>
      ) : (
        <p style={{ fontSize: 11, color: 'rgba(232,221,181,0.22)', marginTop: 5, lineHeight: 1.5 }}>{hint}</p>
      )}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: 'rgba(126,168,96,0.7)',
      letterSpacing: '0.1em', textTransform: 'uppercase',
      marginBottom: 14, marginTop: 8,
      paddingBottom: 8, borderBottom: '0.5px solid rgba(90,122,58,0.15)',
    }}>
      {children}
    </div>
  )
}

export default function CompanyForm() {
  const [state, action, isPending] = useActionState<CompanyState, FormData>(saveCompanyProfile, undefined)

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
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 0', borderBottom: '0.5px solid rgba(90,122,58,0.1)',
        }}>
          <TavitLogo />
          <StepIndicator step={3} />
        </div>

        {/* Two-column layout */}
        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 48, alignItems: 'start',
          padding: '48px 0',
        }}>
          {/* Left — copy */}
          <div style={{ paddingTop: 8 }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(90,122,58,0.15)',
                border: '0.5px solid rgba(90,122,58,0.3)',
                color: '#9cc47a', fontSize: 11, fontWeight: 500,
                padding: '3px 10px', borderRadius: 20,
                letterSpacing: '0.07em', textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                Step 2 of 2 · Last step
              </div>
              <h1 style={{
                fontSize: 28, fontWeight: 500, color: '#e8ddb5',
                letterSpacing: '-0.5px', lineHeight: 1.25, marginBottom: 12,
              }}>
                Set up your<br />
                <span style={{ color: '#7ea860' }}>workspace</span>
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(232,221,181,0.45)', lineHeight: 1.7, maxWidth: 320 }}>
                We need your company&apos;s tax and address details to pre-fill your GST returns and generate compliant invoices.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: '📋', text: 'GSTIN auto-validates format and state code' },
                { icon: '🏢', text: 'Address pre-fills your tax invoices' },
                { icon: '📊', text: 'GSTR-1 and GSTR-3B auto-computed from day one' },
              ].map(item => (
                <div key={item.icon} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 15, marginTop: 1 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: 'rgba(232,221,181,0.4)', lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 32 }}>
              <Link
                href="/onboarding"
                style={{ fontSize: 12, color: 'rgba(126,168,96,0.5)', textDecoration: 'none' }}
              >
                ← Back to account details
              </Link>
            </div>
          </div>

          {/* Right — form card */}
          <div style={{
            background: '#1a1f14',
            border: '0.5px solid rgba(90,122,58,0.2)',
            borderRadius: 16,
            padding: '36px 32px',
          }}>
            <h2 style={{
              fontSize: 16, fontWeight: 500, color: '#e8ddb5',
              letterSpacing: '-0.3px', marginBottom: 6,
            }}>
              Company details
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(232,221,181,0.3)', marginBottom: 24, lineHeight: 1.5 }}>
              All fields are required and will appear on your tax invoices.
            </p>

            <form action={action}>

              <SectionHeading>Registration</SectionHeading>

              <FormField
                label="COMPANY NAME"
                name="companyName"
                placeholder="Acme Exports Pvt Ltd"
                hint="Legal name as registered with MCA / ROC"
                error={state?.errors?.companyName}
                defaultValue={state?.values?.companyName}
                autoComplete="organization"
              />
              <FormField
                label="GSTIN"
                name="gstin"
                placeholder="27AABCP1234C1ZV"
                hint="15-character GST Identification Number — state code is auto-detected from first 2 digits"
                error={state?.errors?.gstin}
                defaultValue={state?.values?.gstin}
                maxLength={15}
                transform={v => v.toUpperCase()}
              />
              <FormField
                label="PAN"
                name="pan"
                placeholder="AABCP1234C"
                hint="10-character Permanent Account Number — must match the PAN embedded in your GSTIN"
                error={state?.errors?.pan}
                defaultValue={state?.values?.pan}
                maxLength={10}
                transform={v => v.toUpperCase()}
              />

              <SectionHeading>Registered Address</SectionHeading>

              <FormField
                label="STREET / ADDRESS LINE"
                name="addressLine1"
                placeholder="Plot 12, MIDC Industrial Area"
                hint="Door number, building name, street or locality"
                error={state?.errors?.addressLine1}
                defaultValue={state?.values?.addressLine1}
                autoComplete="street-address"
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField
                  label="CITY"
                  name="city"
                  placeholder="Mumbai"
                  hint="City / district"
                  error={state?.errors?.city}
                  defaultValue={state?.values?.city}
                  autoComplete="address-level2"
                />
                <FormField
                  label="PINCODE"
                  name="pincode"
                  placeholder="400093"
                  hint="6-digit postal code"
                  error={state?.errors?.pincode}
                  defaultValue={state?.values?.pincode}
                  maxLength={6}
                  transform={v => v.replace(/\D/g, '')}
                  autoComplete="postal-code"
                />
              </div>

              {state?.message && (
                <div style={{
                  background: 'rgba(220,100,80,0.08)',
                  border: '0.5px solid rgba(220,100,80,0.3)',
                  borderRadius: 8, padding: '10px 14px',
                  fontSize: 12, color: 'rgba(220,100,80,0.85)', marginBottom: 16,
                }}>
                  {state.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                style={{
                  width: '100%',
                  background: isPending ? 'rgba(126,168,96,0.5)' : '#7ea860',
                  color: '#1e2118', fontSize: 14, fontWeight: 600,
                  padding: '13px', borderRadius: 8, border: 'none',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s', marginTop: 4,
                  letterSpacing: '-0.1px',
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
