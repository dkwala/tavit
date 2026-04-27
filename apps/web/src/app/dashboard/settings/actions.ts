'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const USERNAME_RE = /^[a-z0-9_]+$/

// ── Profile ───────────────────────────────────────────────────────────────────

export type ProfileState =
  | { errors?: { fullName?: string; username?: string }; message?: string; success?: boolean }
  | undefined

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const fullName = (formData.get('fullName') as string)?.trim()
  const username = (formData.get('username') as string)?.trim().toLowerCase()
  const errors: NonNullable<ProfileState>['errors'] = {}

  if (!fullName || fullName.length < 2) {
    errors.fullName = 'Full name must be at least 2 characters'
  }
  if (!username || username.length < 3) {
    errors.username = 'Username must be at least 3 characters'
  } else if (username.length > 20) {
    errors.username = 'Username must be 20 characters or fewer'
  } else if (!USERNAME_RE.test(username)) {
    errors.username = 'Only lowercase letters, numbers and underscores'
  }

  if (Object.keys(errors).length > 0) return { errors }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, username })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') {
      return { errors: { username: 'Username already taken — choose another' } }
    }
    return { message: `Could not save: ${error.message}` }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

// ── Password ──────────────────────────────────────────────────────────────────

export type PasswordState =
  | {
      errors?: { currentPassword?: string; newPassword?: string; confirmPassword?: string }
      message?: string
      success?: boolean
    }
  | undefined

export async function updatePassword(
  _prevState: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const currentPassword  = (formData.get('currentPassword')  as string) ?? ''
  const newPassword      = (formData.get('newPassword')       as string) ?? ''
  const confirmPassword  = (formData.get('confirmPassword')   as string) ?? ''
  const errors: NonNullable<PasswordState>['errors'] = {}

  if (!currentPassword)               errors.currentPassword = 'Enter your current password'
  if (newPassword.length < 8)         errors.newPassword     = 'New password must be at least 8 characters'
  if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match'

  if (Object.keys(errors).length > 0) return { errors }

  // Verify current password before allowing change
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })
  if (signInError) {
    return { errors: { currentPassword: 'Current password is incorrect' } }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { message: `Could not update password: ${error.message}` }

  return { success: true }
}

// ── Company ───────────────────────────────────────────────────────────────────

export type CompanyState =
  | { errors?: { name?: string }; message?: string; success?: boolean }
  | undefined

export async function updateCompany(
  _prevState: CompanyState,
  formData: FormData,
): Promise<CompanyState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const companyId         = formData.get('companyId') as string
  const name              = (formData.get('name') as string)?.trim()
  const fyStart           = parseInt(formData.get('financialYearStart') as string, 10)

  if (!name || name.length < 2) return { errors: { name: 'Name must be at least 2 characters' } }
  if (isNaN(fyStart) || fyStart < 1 || fyStart > 12) return { message: 'Invalid financial year month' }

  // Confirm the caller is an owner
  const { data: membership } = await supabase
    .from('company_members')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    return { message: 'Only company owners can update company details' }
  }

  const { error } = await supabase
    .from('companies')
    .update({ name, financial_year_start: fyStart })
    .eq('id', companyId)

  if (error) return { message: `Could not save: ${error.message}` }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

// ── Account deletion ──────────────────────────────────────────────────────────

export type DeleteAccountState =
  | { errors?: { confirmation?: string }; message?: string }
  | undefined

export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const confirmation = (formData.get('confirmation') as string)?.trim()
  if (confirmation !== 'DELETE') {
    return { errors: { confirmation: 'Type DELETE exactly (case-sensitive) to confirm' } }
  }

  const companyId = formData.get('companyId') as string

  // Soft-delete the company (cascades to related data via FK)
  if (companyId) {
    await supabase
      .from('companies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', companyId)
  }

  // Remove the profile row
  await supabase.from('profiles').delete().eq('id', user.id)

  // Permanently delete the auth user — Supabase cascades the rest
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return { message: `Deletion failed: ${error.message}` }

  redirect('/auth/login')
}
