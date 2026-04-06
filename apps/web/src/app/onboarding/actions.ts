'use server'

import { createClient } from '@/lib/supabase/server'
import { validateGstin, validatePan } from '@/lib/validation'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type OnboardingState = {
  errors?: {
    companyName?: string
    gstin?: string
    pan?: string
  }
  message?: string
  values?: {
    companyName?: string
    gstin?: string
    pan?: string
  }
} | undefined

export async function saveCompanyProfile(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const companyName = (formData.get('companyName') as string)?.trim()
  const gstin       = (formData.get('gstin') as string)?.trim().toUpperCase()
  const pan         = (formData.get('pan')  as string)?.trim().toUpperCase()

  const values = { companyName, gstin, pan }
  const errors: NonNullable<OnboardingState>['errors'] = {}

  if (!companyName || companyName.length < 2) {
    errors.companyName = 'Company name must be at least 2 characters'
  }
  const gstinError = validateGstin(gstin)
  if (gstinError) errors.gstin = gstinError

  const panError = validatePan(pan)
  if (panError) errors.pan = panError

  if (Object.keys(errors).length > 0) return { errors, values }

  // Derive state code from the first 2 characters of GSTIN (e.g. '27' = Maharashtra)
  const stateCode = gstin.slice(0, 2)

  // ── 1. Create company ───────────────────────────────────────────────────────
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: companyName, pan, state_code: stateCode })
    .select('id')
    .single()

  if (companyError || !company) {
    console.error('company insert error', companyError)
    return { message: 'Could not create company. Please try again.', values }
  }

  // ── 2. Create primary GSTIN ─────────────────────────────────────────────────
  const { error: gstinInsertError } = await supabase
    .from('gstins')
    .insert({
      company_id: company.id,
      gstin,
      state_code: stateCode,
    })

  if (gstinInsertError) {
    console.error('gstin insert error', gstinInsertError)
    return { message: 'Could not save GSTIN. Please try again.', values }
  }

  // ── 3. Add user as owner ────────────────────────────────────────────────────
  const { error: memberError } = await supabase
    .from('company_members')
    .insert({ company_id: company.id, user_id: user.id, role: 'owner' })

  if (memberError) {
    console.error('member insert error', memberError)
    return { message: 'Could not link account. Please try again.', values }
  }

  // ── 4. Mark profile as onboarded ────────────────────────────────────────────
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ onboarded: true, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (profileError) {
    console.error('profile update error', profileError)
    return { message: 'Could not update profile. Please try again.', values }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
