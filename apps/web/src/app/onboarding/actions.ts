'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type ProfileState =
  | {
      errors?: {
        fullName?: string
        username?: string
        password?: string
        confirmPassword?: string
      }
      message?: string
      values?: {
        fullName?: string
        username?: string
      }
    }
  | undefined

const USERNAME_RE = /^[a-z0-9_]+$/

export async function saveProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const fullName       = (formData.get('fullName')       as string)?.trim()
  const username       = (formData.get('username')       as string)?.trim().toLowerCase()
  const password       = (formData.get('password')       as string) ?? ''
  const confirmPassword = (formData.get('confirmPassword') as string) ?? ''

  const values = { fullName, username }
  const errors: NonNullable<ProfileState>['errors'] = {}

  // ── Validate full name ────────────────────────────────────────────────────
  if (!fullName || fullName.length < 2) {
    errors.fullName = 'Full name must be at least 2 characters'
  }

  // ── Validate username ─────────────────────────────────────────────────────
  if (!username || username.length < 3) {
    errors.username = 'Username must be at least 3 characters'
  } else if (username.length > 20) {
    errors.username = 'Username must be 20 characters or fewer'
  } else if (!USERNAME_RE.test(username)) {
    errors.username = 'Only lowercase letters, numbers and underscores are allowed'
  }

  // ── Validate password ─────────────────────────────────────────────────────
  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }

  if (Object.keys(errors).length > 0) return { errors, values }

  // ── Set password on the Supabase auth user ────────────────────────────────
  const { error: pwError } = await supabase.auth.updateUser({ password })
  if (pwError) {
    return { message: `Could not set password: ${pwError.message}`, values }
  }

  // ── Persist full_name + username to profiles ──────────────────────────────
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fullName, username })
    .eq('id', user.id)

  if (profileError) {
    // Unique-constraint violation on username (code 23505)
    if (profileError.code === '23505') {
      return { errors: { username: 'That username is already taken — please choose another' }, values }
    }
    return { message: `Could not save profile: ${profileError.message}`, values }
  }

  redirect('/onboarding/company')
}
