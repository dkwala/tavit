'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type LoginState = { error?: string; email?: string } | undefined

export async function sendOtp(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address', email }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })

  if (error) {
    return { error: error.message, email }
  }

  redirect(`/auth/verify?email=${encodeURIComponent(email)}`)
}
