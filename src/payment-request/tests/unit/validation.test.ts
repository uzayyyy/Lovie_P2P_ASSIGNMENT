import { describe, expect, it } from 'vitest'
import {
  amountValidators,
  noteValidators,
  validatePhone,
  validateRecipientEmail,
} from 'src/resources/paymentRequests/PaymentRequestCreate'

const normalizeValidationResult = (
  result: string | { message?: string } | undefined,
) => {
  if (typeof result === 'string' || result === undefined) {
    return result
  }

  return result.message
}

const runValidators = (
  validators: Array<(value: unknown, values?: unknown) => string | { message?: string } | undefined>,
  value: unknown,
) =>
  validators.reduce<string | undefined>(
    (error, validator) => error ?? normalizeValidationResult(validator(value)),
    undefined,
  )

describe('payment request validation', () => {
  it('validates recipient email addresses', () => {
    expect(validateRecipientEmail('')).toEqual(expect.any(String))
    expect(validateRecipientEmail('invalid')).toBe('Enter a valid email address')
    expect(validateRecipientEmail('a@b.com')).toBeUndefined()
  })

  it('validates phone numbers', () => {
    expect(validatePhone('+905550000000')).toBeUndefined()
    expect(validatePhone('05550000000')).toBe(
      'Enter a valid phone number (e.g. +90 555 000 0000)',
    )
  })

  it('validates amount boundaries', () => {
    expect(runValidators(amountValidators, 0)).toBe('Amount must be greater than 0')
    expect(runValidators(amountValidators, 999999.99)).toBeUndefined()
    expect(runValidators(amountValidators, 1000000)).toBe('Maximum amount is 999,999.99')
  })

  it('validates note length', () => {
    expect(runValidators(noteValidators, 'a'.repeat(280))).toBeUndefined()
    expect(runValidators(noteValidators, 'a'.repeat(281))).toBe(
      'Note must be 280 characters or less',
    )
  })
})
