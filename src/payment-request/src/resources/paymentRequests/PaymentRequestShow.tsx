import { Box, Button, Stack } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  DateField,
  FunctionField,
  NumberField,
  Show,
  SimpleShowLayout,
  TextField,
  useGetIdentity,
  useRecordContext,
} from 'react-admin'
import { useNavigate } from 'react-router-dom'
import { CancelButton } from 'src/components/CancelButton'
import { DeclineButton } from 'src/components/DeclineButton'
import { ExpiryCountdownField } from 'src/components/ExpiryCountdown'
import { PayButton } from 'src/components/PayButton'
import { ShareableLinkField } from 'src/components/ShareableLinkField'
import { StatusField } from 'src/components/StatusBadge'
import { formatRequestContact } from 'src/services/paymentRequestHelpers'
import type { PaymentRequest } from 'src/types'

type Identity = {
  id: string
}

const PaymentRequestShowContent = () => {
  const record = useRecordContext<PaymentRequest>()
  const { data } = useGetIdentity()
  const identity = data as Identity | undefined
  const navigate = useNavigate()

  if (!record) {
    return null
  }

  const isIncoming = identity?.id !== undefined && record.recipient_id === identity.id
  const isOutgoing = identity?.id !== undefined && record.sender_id === identity.id
  const isPending = record.status === 'pending'

  return (
    <SimpleShowLayout>
      <Box sx={{ mb: 1 }}>
        <Button
          onClick={() => navigate('/payment_requests')}
          size="small"
          startIcon={<ArrowBackIcon />}
          variant="text"
        >
          Back to dashboard
        </Button>
      </Box>
      <NumberField options={{ currency: 'TRY', style: 'currency' }} source="amount" />
      <TextField label="Sender" source="sender_email" />
      <FunctionField
        label="Recipient"
        render={(request: PaymentRequest) =>
          formatRequestContact(
            request.recipient_email,
            request.recipient_phone,
            'Unknown recipient',
          )
        }
      />
      <TextField source="note" />
      <StatusField />
      <DateField showTime source="created_at" />
      <ExpiryCountdownField />
      <ShareableLinkField />

      <Box sx={{ pt: 1 }}>
        <Stack direction={{ sm: 'row', xs: 'column' }} spacing={2}>
          {isIncoming && isPending ? (
            <>
              <PayButton />
              <DeclineButton />
            </>
          ) : null}
          {isOutgoing && isPending ? <CancelButton /> : null}
        </Stack>
      </Box>
    </SimpleShowLayout>
  )
}

const PaymentRequestShow = () => (
  <Show>
    <PaymentRequestShowContent />
  </Show>
)

export default PaymentRequestShow
