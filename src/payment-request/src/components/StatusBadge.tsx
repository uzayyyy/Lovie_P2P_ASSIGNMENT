import { Chip } from '@mui/material'
import { useRecordContext } from 'react-admin'
import type { PaymentRequest, PaymentRequestStatus } from 'src/types'

const statusColorMap: Record<
  PaymentRequestStatus,
  'default' | 'error' | 'success' | 'warning'
> = {
  pending: 'warning',
  paid: 'success',
  declined: 'error',
  cancelled: 'default',
  expired: 'default',
}

export const StatusBadge = ({ status }: { status: PaymentRequestStatus }) => (
  <Chip color={statusColorMap[status]} label={status} size="small" />
)

export const StatusField = () => {
  const record = useRecordContext<PaymentRequest>()

  if (!record) {
    return null
  }

  return <StatusBadge status={record.status} />
}
