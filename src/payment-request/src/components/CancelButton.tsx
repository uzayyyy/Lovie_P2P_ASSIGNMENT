import { useState } from 'react'
import { Button as MuiButton, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { useGetIdentity, useNotify, useRecordContext, useRefresh, useUpdate } from 'react-admin'
import { RESOURCE_PAYMENT_REQUESTS, type PaymentRequest } from 'src/types'

type Identity = {
  id: string
}

export const CancelButton = () => {
  const record = useRecordContext<PaymentRequest>()
  const { data } = useGetIdentity()
  const identity = data as Identity | undefined
  const notify = useNotify()
  const refresh = useRefresh()
  const [update] = useUpdate<PaymentRequest>()
  const [open, setOpen] = useState(false)

  if (!record || record.status !== 'pending' || identity?.id !== record.sender_id) {
    return null
  }

  const handleConfirm = () => {
    update(
      RESOURCE_PAYMENT_REQUESTS,
      {
        id: record.id,
        data: {
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        },
        previousData: record,
      },
      {
        onSuccess: () => {
          setOpen(false)
          notify('Request cancelled', { type: 'info' })
          refresh()
        },
      },
    )
  }

  return (
    <>
      <MuiButton onClick={() => setOpen(true)} variant="outlined">
        Cancel
      </MuiButton>
      <Dialog onClose={() => setOpen(false)} open={open}>
        <DialogTitle>Cancel this request?</DialogTitle>
        <DialogContent>This action cannot be undone.</DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>Back</MuiButton>
          <MuiButton color="warning" onClick={handleConfirm} variant="contained">
            Confirm
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  )
}
