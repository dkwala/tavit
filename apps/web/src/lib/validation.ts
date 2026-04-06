export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

export function validateGstin(value: string): string | null {
  const trimmed = value.trim().toUpperCase()
  if (!trimmed) return 'GSTIN is required'
  if (trimmed.length !== 15) return 'GSTIN must be exactly 15 characters'
  if (!GSTIN_REGEX.test(trimmed)) return 'Invalid GSTIN format (e.g. 27AABCP1234C1ZV)'
  return null
}

export function validatePan(value: string): string | null {
  const trimmed = value.trim().toUpperCase()
  if (!trimmed) return 'PAN is required'
  if (trimmed.length !== 10) return 'PAN must be exactly 10 characters'
  if (!PAN_REGEX.test(trimmed)) return 'Invalid PAN format (e.g. AABCP1234C)'
  return null
}
