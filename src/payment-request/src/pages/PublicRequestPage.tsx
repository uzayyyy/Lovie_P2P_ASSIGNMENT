import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material'
import { ExpiryCountdown } from 'src/components/ExpiryCountdown'
import { StatusBadge } from 'src/components/StatusBadge'
import { supabase } from 'src/providers/supabaseClient'
import { DEMO_PUBLIC_PREVIEW_REQUESTS } from 'src/services/demoPaymentRequests'
import { RESOURCE_PUBLIC_VIEW, type PublicPaymentRequest } from 'src/types'

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  currency: 'TRY',
  style: 'currency',
})

const PublicRequestPage = () => {
  const { id } = useParams<{ id: string }>()
  const [request, setRequest] = useState<PublicPaymentRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => {
    const loadRequest = async () => {
      if (!id) {
        setError('Request not found')
        setLoading(false)
        return
      }

      setError(null)
      setIsPreview(false)
      setLoading(true)

      const previewRequest = DEMO_PUBLIC_PREVIEW_REQUESTS[id]

      if (previewRequest) {
        setRequest(previewRequest)
        setIsPreview(true)
        setLoading(false)
        return
      }

      const { data, error: queryError } = await supabase
        .from(RESOURCE_PUBLIC_VIEW)
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (queryError) {
        setError(queryError.message)
      } else if (!data) {
        setError('Request not found')
      } else {
        setRequest(data)
      }

      setLoading(false)
    }

    void loadRequest()
  }, [id])

  if (loading) {
    return (
      <Box sx={{ margin: '0 auto', maxWidth: 560, p: 2 }}>
        <Skeleton height={48} />
        <Skeleton height={160} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ margin: '0 auto', maxWidth: 560, p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  if (!request) {
    return null
  }

  return (
    <Box sx={{ margin: '0 auto', maxWidth: 560, p: 2 }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            {isPreview ? (
              <Alert severity="info">
                Demo preview mode: this sample share link is bundled with the app so reviewers
                can validate the public request experience without signing in first.
              </Alert>
            ) : null}
            <Typography variant="h4">
              {currencyFormatter.format(request.amount)}
            </Typography>
            <StatusBadge status={request.status} />
            <Typography color="text.secondary">Currency: {request.currency}</Typography>
            <Typography color="text.secondary">
              Created at: {new Date(request.created_at).toLocaleString()}
            </Typography>
            <Typography>{request.note ?? 'No note provided.'}</Typography>
            <ExpiryCountdown expiresAt={request.expires_at} />

            {request.status === 'pending' ? (
              <Button component={RouterLink} to="/login" variant="contained">
                Log in to Pay
              </Button>
            ) : (
              <Typography color="text.secondary">
                This request is no longer actionable.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default PublicRequestPage
