import { useState } from 'react'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { IconButton, InputAdornment, TextField as MuiTextField, Tooltip } from '@mui/material'
import { useRecordContext } from 'react-admin'
import type { PaymentRequest } from 'src/types'

export const ShareableLinkField = () => {
  const record = useRecordContext<PaymentRequest>()
  const [copied, setCopied] = useState(false)

  if (!record) {
    return null
  }

  const url = `${window.location.origin}/request/${record.id}`

  const handleCopy = async () => {
    if (!navigator.clipboard) {
      return
    }

    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <MuiTextField
      fullWidth
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
              <IconButton edge="end" onClick={handleCopy}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </InputAdornment>
        ),
        readOnly: true,
      }}
      label="Shareable link"
      value={url}
    />
  )
}
