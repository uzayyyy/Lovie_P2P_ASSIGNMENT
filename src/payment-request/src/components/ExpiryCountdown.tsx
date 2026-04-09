import { Chip } from '@mui/material'
import { useRecordContext } from 'react-admin'
import type { PaymentRequest } from 'src/types'

const DAY_IN_MS = 86_400_000

export const ExpiryCountdown = ({ expiresAt }: { expiresAt: string }) => {
  const diffMs = new Date(expiresAt).getTime() - Date.now()

  if (diffMs <= 0) {
    return <Chip color="default" label="Expired" size="small" />
  }

  if (diffMs < DAY_IN_MS) {
    return <Chip color="error" label="< 1 day remaining" size="small" />
  }

  const daysRemaining = Math.ceil(diffMs / DAY_IN_MS)

  if (diffMs < 3 * DAY_IN_MS) {
    return <Chip color="warning" label={`${daysRemaining} days remaining`} size="small" />
  }

  return <Chip color="success" label={`${daysRemaining} days remaining`} size="small" />
}

export const ExpiryCountdownField = () => {
  const record = useRecordContext<PaymentRequest>()

  if (!record?.expires_at) {
    return null
  }

  return <ExpiryCountdown expiresAt={record.expires_at} />
}
