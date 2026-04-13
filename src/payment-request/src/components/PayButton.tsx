import { useState } from 'react'
import { CircularProgress } from '@mui/material'
import { Button, useNotify, useRecordContext, useRefresh, useUpdate } from 'react-admin'
import { RESOURCE_PAYMENT_REQUESTS, type PaymentRequest } from 'src/types'

export const SIMULATION_DELAY_MS = 2500

export const PayButton = () => {
  const record = useRecordContext<PaymentRequest>()
  const notify = useNotify()
  const refresh = useRefresh()
  const [update] = useUpdate<PaymentRequest>()
  const [loading, setLoading] = useState(false)

  if (!record || record.status !== 'pending') {
    return null
  }

  const handlePay = () => {
    if (loading) {
      return
    }

    setLoading(true)

    window.setTimeout(() => {
      const timestamp = new Date().toISOString()

      update(
        RESOURCE_PAYMENT_REQUESTS,
        {
          id: record.id,
          data: {
            paid_at: timestamp,
            status: 'paid',
            updated_at: timestamp,
          },
          previousData: record,
        },
        {
          onError: (error) => {
            notify(`Payment failed: ${error.message}`, { type: 'error' })
            setLoading(false)
          },
          onSuccess: () => {
            notify('Payment successful', { type: 'success' })
            setLoading(false)
            refresh()
          },
        },
      )
    }, SIMULATION_DELAY_MS)
  }

  return (
    <Button
      disabled={loading}
      label="Pay"
      onClick={handlePay}
      startIcon={loading ? <CircularProgress size={16} /> : undefined}
      variant="contained"
    />
  )
}
