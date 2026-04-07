'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type VerifyState = { error?: string } | undefined

export async function verifyOtp(
  _prevState: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const email = (formData.get('email') as string)?.trim()
  const token = (formData.get('token') as string)?.trim()

  if (!token || token.length !== 6) {
    return { error: 'Please enter the 6-digit code' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (error) {
    return { error: error.message }
  }

  // Session is now in cookies. proxy.ts will redirect to /onboarding if needed.
  redirect('/dashboard')
}

export async function resendOtp(email: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  if (error) return { error: error.message }
  return {}
}
