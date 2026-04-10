'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { validateGstin, validatePan } from '@/lib/validation'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

function toErrorString(error: unknown): string {
  if (!error) return 'Unknown error'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message || error.toString()
  try {
    const s = JSON.stringify(error)
    if (s === '{}' || s === 'null')
      return 'Database error — check that PAN is exactly 10 chars, GSTIN is 15 chars.'
    return s
  } catch {
    return String(error)
  }
}

export type CompanyState =
  | {
      errors?: {
        companyName?: string
        gstin?: string
        pan?: string
        addressLine1?: string
        city?: string
        pincode?: string
      }
      message?: string
      values?: {
        companyName?: string
        gstin?: string
        pan?: string
        addressLine1?: string
        city?: string
        pincode?: string
      }
    }
  | undefined

export async function saveCompanyProfile(
  _prevState: CompanyState,
  formData: FormData,
): Promise<CompanyState> {
  const authClient  = await createClient()
  const adminClient = createAdminClient()

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) redirect('/auth/login')

  const companyName = (formData.get('companyName') as string)?.trim()
  const gstin       = (formData.get('gstin')       as string)?.trim().toUpperCase()
  const pan         = (formData.get('pan')         as string)?.trim().toUpperCase()
  const addressLine1 = (formData.get('addressLine1') as string)?.trim()
  const city        = (formData.get('city')        as string)?.trim()
  const pincode     = (formData.get('pincode')     as string)?.trim()

  const values = { companyName, gstin, pan, addressLine1, city, pincode }
  const errors: NonNullable<CompanyState>['errors'] = {}

  if (!companyName || companyName.length < 2)
    errors.companyName = 'Company name must be at least 2 characters'

  const gstinError = validateGstin(gstin)
  if (gstinError) errors.gstin = gstinError

  const panError = validatePan(pan)
  if (panError) errors.pan = panError

  if (!addressLine1 || addressLine1.length < 5)
    errors.addressLine1 = 'Please enter a valid street address (min. 5 characters)'

  if (!city || city.length < 2)
    errors.city = 'City is required'

  if (!pincode || !/^\d{6}$/.test(pincode))
    errors.pincode = 'Pincode must be exactly 6 digits'

  if (Object.keys(errors).length > 0) return { errors, values }

  const stateCode = gstin.slice(0, 2)
  const companyId = crypto.randomUUID()

  // ── 1. Create company (with address) ──────────────────────────────────────
  const { error: companyError } = await adminClient
    .from('companies')
    .insert({
      id: companyId,
      name: companyName,
      pan,
      state_code: stateCode,
      address_line1: addressLine1,
      city,
      pincode,
    })

  if (companyError) {
    console.error('company insert error', companyError)
    return { message: `Could not create company: ${toErrorString(companyError)}`, values }
  }

  // ── 2. Add user as owner ──────────────────────────────────────────────────
  const { error: memberError } = await adminClient
    .from('company_members')
    .insert({ company_id: companyId, user_id: user.id, role: 'owner' })

  if (memberError) {
    console.error('member insert error', memberError)
    return { message: `Could not link account: ${toErrorString(memberError)}`, values }
  }

  // ── 3. Create primary GSTIN ───────────────────────────────────────────────
  const { error: gstinInsertError } = await adminClient
    .from('gstins')
    .insert({ company_id: companyId, gstin, state_code: stateCode })

  if (gstinInsertError) {
    console.error('gstin insert error', gstinInsertError)
    return { message: `Could not save GSTIN: ${toErrorString(gstinInsertError)}`, values }
  }

  // ── 4. Mark profile as onboarded ─────────────────────────────────────────
  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({ id: user.id, onboarded: true, updated_at: new Date().toISOString() })

  if (profileError) {
    console.error('profile update error', profileError)
    return { message: `Could not update profile: ${toErrorString(profileError)}`, values }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
