'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type LoginState = { error?: string; email?: string } | undefined

function toErrorString(error: unknown): string {
  if (!error) return 'Unknown error'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message || error.toString()
  try {
    const s = JSON.stringify(error)
    if (s === '{}' || s === 'null') return 'Supabase could not send the email — check Auth → Providers → Email in your Supabase dashboard.'
    return s
  } catch {
    return String(error)
  }
}

export async function sendOtp(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address', email }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: 'NEXT_PUBLIC_SUPABASE_URL / ANON_KEY not set — add them in Vercel environment variables.', email }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })

  if (error) {
    return { error: toErrorString(error), email }
  }

  redirect(`/auth/verify?email=${encodeURIComponent(email)}`)
}
