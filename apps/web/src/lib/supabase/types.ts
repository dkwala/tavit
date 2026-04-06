// Hand-written until `supabase gen types typescript` is wired into CI.
// Run: npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts

export type UserRole = 'owner' | 'accountant' | 'ca' | 'viewer'
export type CompanyTier = 'starter' | 'growth' | 'pro'
export type GstinStatus = 'active' | 'cancelled' | 'suspended'
export type RegistrationType = 'regular' | 'composition' | 'sez' | 'unregistered'

export interface Profile {
  id: string
  full_name: string | null
  onboarded: boolean
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  pan: string           // char(10) — AABCP1234C
  state_code: string    // char(2)  — '27'
  financial_year_start: number   // 4 = April
  tier: CompanyTier
  created_at: string
  deleted_at: string | null
}

export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: UserRole
  created_at: string
}

export interface Gstin {
  id: string
  company_id: string
  gstin: string         // char(15) — 27AABCP1234C1ZV
  trade_name: string | null
  state_code: string    // char(2)
  registration_type: RegistrationType
  status: GstinStatus
  created_at: string
}

// ── Monetary precision note ───────────────────────────────────────────────────
// All amounts are stored as INTEGER (paise). Never use float for money.
// ₹1,000 is stored as 100000 (paise).
// Display helper:
export function paiseToCurrency(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  })
}
