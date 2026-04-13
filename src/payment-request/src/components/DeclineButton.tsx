import { useState } from 'react'
import { Button as MuiButton, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { useNotify, useRecordContext, useRefresh, useUpdate } from 'react-admin'
import { RESOURCE_PAYMENT_REQUESTS, type PaymentRequest } from 'src/types'

export const DeclineButton = () => {
  const record = useRecordContext<PaymentRequest>()
  const notify = useNotify()
  const refresh = useRefresh()
  const [update] = useUpdate<PaymentRequest>()
  const [open, setOpen] = useState(false)

  if (!record || record.status !== 'pending') {
    return null
  }

  const handleConfirm = () => {
    update(
      RESOURCE_PAYMENT_REQUESTS,
      {
        id: record.id,
        data: {
          status: 'declined',
          updated_at: new Date().toISOString(),
        },
        previousData: record,
      },
      {
        onSuccess: () => {
          setOpen(false)
          notify('Request declined', { type: 'info' })
          refresh()
        },
      },
    )
  }

  return (
    <>
      <MuiButton color="error" onClick={() => setOpen(true)} variant="outlined">
        Decline
      </MuiButton>
      <Dialog onClose={() => setOpen(false)} open={open}>
        <DialogTitle>Decline this request?</DialogTitle>
        <DialogContent>This action cannot be undone.</DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>Cancel</MuiButton>
          <MuiButton color="error" onClick={handleConfirm} variant="contained">
            Confirm
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  )
}
