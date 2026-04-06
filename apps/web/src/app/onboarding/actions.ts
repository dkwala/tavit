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
  const gstin = (formData.get('gstin') as string)?.trim().toUpperCase()
  const pan = (formData.get('pan') as string)?.trim().toUpperCase()

  const values = { companyName, gstin, pan }
  const errors: NonNullable<OnboardingState>['errors'] = {}

  if (!companyName || companyName.length < 2) {
    errors.companyName = 'Company name must be at least 2 characters'
  }
  const gstinError = validateGstin(gstin)
  if (gstinError) errors.gstin = gstinError

  const panError = validatePan(pan)
  if (panError) errors.pan = panError

  if (Object.keys(errors).length > 0) {
    return { errors, values }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      company_name: companyName,
      gstin,
      pan,
      onboarded: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return { message: 'Something went wrong. Please try again.', values }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
