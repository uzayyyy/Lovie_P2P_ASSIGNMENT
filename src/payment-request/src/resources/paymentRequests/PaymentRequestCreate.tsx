import {
  Create,
  NumberInput,
  SimpleForm,
  TextInput,
  maxLength,
  maxValue,
  minValue,
  required,
  useGetIdentity,
} from 'react-admin'
import type { PaymentRequestCreateInput } from 'src/types'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneRegex = /^\+\d{7,15}$/

type Identity = {
  email?: string
  id: string
}

export const validateRecipientEmail = (value?: string) => {
  if (!value) {
    return 'Recipient email is required'
  }

  return emailRegex.test(value) ? undefined : 'Enter a valid email address'
}

export const validatePhone = (value?: string) => {
  if (!value) {
    return undefined
  }

  return phoneRegex.test(value)
    ? undefined
    : 'Enter a valid phone number (e.g. +90 555 000 0000)'
}

export const amountValidators = [
  required('Amount is required'),
  minValue(0.01, 'Amount must be greater than 0'),
  maxValue(999999.99, 'Maximum amount is 999,999.99'),
]

export const noteValidators = [
  maxLength(280, 'Note must be 280 characters or less'),
]

export const validateSelfRequest = (
  value?: string,
  currentUserEmail?: string,
) => {
  if (!value || !currentUserEmail) {
    return undefined
  }

  return value.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()
    ? 'You cannot request money from yourself'
    : undefined
}

const PaymentRequestCreate = () => {
  const { data } = useGetIdentity()
  const identity = data as Identity | undefined

  return (
    <Create
      redirect="show"
      transform={(data: PaymentRequestCreateInput) => ({
        ...data,
        currency: 'TRY',
        note: data.note?.trim() || null,
        recipient_phone: data.recipient_phone?.trim() || null,
        sender_id: identity?.id ?? '',
      })}
    >
      <SimpleForm>
        <TextInput
          fullWidth
          label="Recipient Email"
          source="recipient_email"
          validate={[
            validateRecipientEmail,
            (value) => validateSelfRequest(value, identity?.email),
          ]}
        />
        <TextInput
          fullWidth
          label="Recipient Phone (optional)"
          source="recipient_phone"
          validate={[validatePhone]}
        />
        <NumberInput
          fullWidth
          label="Amount (TRY)"
          source="amount"
          validate={amountValidators}
        />
        <TextInput
          fullWidth
          label="Note (optional)"
          multiline
          rows={3}
          source="note"
          validate={noteValidators}
        />
      </SimpleForm>
    </Create>
  )
}

export default PaymentRequestCreate
