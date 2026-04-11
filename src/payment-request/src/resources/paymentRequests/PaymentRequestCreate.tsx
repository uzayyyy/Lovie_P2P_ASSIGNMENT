import {
  Create,
  NumberInput,
  SimpleForm,
  TextInput,
  useGetIdentity,
} from 'react-admin'
import {
  normalizeOptionalString,
  validateAmountValue,
  validateNoteValue,
  validatePhone,
  validateRecipientEmail,
  validateSelfRequestByEmail,
  validateSelfRequestByPhone,
} from 'src/services/paymentRequestHelpers'
import type { PaymentRequestCreateInput } from 'src/types'

export {
  validatePhone,
  validateRecipientEmail,
} from 'src/services/paymentRequestHelpers'

type Identity = {
  email?: string
  id: string
  phone?: string | null
}

export const amountValidators = [
  (value: unknown) =>
    validateAmountValue(
      value === '' || value === null || value === undefined ? undefined : Number(value),
    ),
]

export const noteValidators = [
  (value: unknown) => validateNoteValue(typeof value === 'string' ? value : undefined),
]

const PaymentRequestCreate = () => {
  const { data } = useGetIdentity()
  const identity = data as Identity | undefined

  return (
    <Create
      redirect="show"
      transform={(data: PaymentRequestCreateInput) => ({
        ...data,
        currency: 'TRY',
        note: normalizeOptionalString(data.note),
        recipient_email: normalizeOptionalString(data.recipient_email),
        recipient_phone: normalizeOptionalString(data.recipient_phone),
        sender_id: identity?.id ?? '',
        sender_email: identity?.email ?? null,
      })}
    >
      <SimpleForm>
        <TextInput
          fullWidth
          label="Recipient Email"
          source="recipient_email"
          validate={[
            validateRecipientEmail,
            (value) => validateSelfRequestByEmail(value, identity?.email),
          ]}
        />
        <TextInput
          fullWidth
          label="Recipient Phone"
          source="recipient_phone"
          validate={[
            validatePhone,
            (value) => validateSelfRequestByPhone(value, identity?.phone),
          ]}
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
