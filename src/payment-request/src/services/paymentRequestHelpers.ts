import type { PaymentRequestCreateInput } from 'src/types'

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const phoneRegex = /^\+[1-9]\d{6,14}$/

type RecipientValues = Partial<
  Pick<PaymentRequestCreateInput, 'recipient_email' | 'recipient_phone'>
>

export const normalizeOptionalString = (value?: string | null) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export const formatRequestContact = (
  email?: string | null,
  phone?: string | null,
  fallback = 'Unknown contact',
) => normalizeOptionalString(email) ?? normalizeOptionalString(phone) ?? fallback

export const validateRecipientEmail = (
  value?: string,
  values?: RecipientValues,
) => {
  const email = normalizeOptionalString(value)
  const phone = normalizeOptionalString(values?.recipient_phone)

  if (!email && !phone) {
    return 'Provide a recipient email or phone number'
  }

  if (!email) {
    return undefined
  }

  return emailRegex.test(email) ? undefined : 'Enter a valid email address'
}

export const validatePhone = (value?: string, values?: RecipientValues) => {
  const phone = normalizeOptionalString(value)
  const email = normalizeOptionalString(values?.recipient_email)

  if (!phone && !email) {
    return 'Provide a recipient email or phone number'
  }

  if (!phone) {
    return undefined
  }

  return phoneRegex.test(phone)
    ? undefined
    : 'Enter a valid phone number (e.g. +905550000000)'
}

export const validateSelfRequestByEmail = (
  value?: string,
  currentUserEmail?: string | null,
) => {
  const email = normalizeOptionalString(value)
  const currentEmail = normalizeOptionalString(currentUserEmail)

  if (!email || !currentEmail) {
    return undefined
  }

  return email.toLowerCase() === currentEmail.toLowerCase()
    ? 'You cannot request money from yourself'
    : undefined
}

export const validateSelfRequestByPhone = (
  value?: string,
  currentUserPhone?: string | null,
) => {
  const phone = normalizeOptionalString(value)
  const currentPhone = normalizeOptionalString(currentUserPhone)

  if (!phone || !currentPhone) {
    return undefined
  }

  return phone === currentPhone ? 'You cannot request money from yourself' : undefined
}

export const validateAmountValue = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Amount is required'
  }

  if (value <= 0) {
    return 'Amount must be greater than 0'
  }

  if (value > 999999.99) {
    return 'Maximum amount is 999,999.99'
  }

  return undefined
}

export const validateNoteValue = (value?: string | null) => {
  const note = value ?? ''
  return note.length <= 280 ? undefined : 'Note must be 280 characters or less'
}
