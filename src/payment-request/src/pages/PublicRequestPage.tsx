import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { ExpiryCountdown } from 'src/components/ExpiryCountdown'
import { supabase } from 'src/providers/supabaseClient'
import { DEMO_PUBLIC_PREVIEW_REQUESTS } from 'src/services/demoPaymentRequests'
import { RESOURCE_PUBLIC_VIEW, type PublicPaymentRequest } from 'src/types'

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  currency: 'TRY',
  style: 'currency',
})

const statusColorMap: Record<string, 'default' | 'error' | 'success' | 'warning'> = {
  pending: 'warning',
  paid: 'success',
  declined: 'error',
  cancelled: 'default',
  expired: 'default',
}

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

  return (
    <Box
      sx={{
        background:
          'radial-gradient(circle at top left, rgba(15, 98, 254, 0.10), transparent 40%), linear-gradient(180deg, #f7fbff 0%, #eef3ff 100%)',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <AppBar
        color="transparent"
        elevation={0}
        position="static"
        sx={{
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(18, 50, 95, 0.08)',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <Tooltip title="Back">
            <IconButton
              aria-label="back"
              component={RouterLink}
              size="small"
              to="/login"
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography
            component={RouterLink}
            sx={{
              color: 'text.primary',
              fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
              fontWeight: 700,
              textDecoration: 'none',
            }}
            to="/login"
          >
            Lovie
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button component={RouterLink} size="small" to="/login" variant="outlined">
            Sign in
          </Button>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          px: 2,
          py: { sm: 6, xs: 4 },
        }}
      >
        <Box sx={{ maxWidth: 480, width: '100%' }}>
          {loading ? (
            <Paper elevation={0} sx={{ border: '1px solid rgba(18,50,95,0.08)', borderRadius: 5, p: 4 }}>
              <Stack spacing={2}>
                <Skeleton height={20} width={120} />
                <Skeleton height={56} width={180} />
                <Skeleton height={16} width={80} />
                <Skeleton height={16} />
                <Skeleton height={16} />
              </Stack>
            </Paper>
          ) : error ? (
            <Paper elevation={0} sx={{ border: '1px solid rgba(18,50,95,0.08)', borderRadius: 5, p: 4 }}>
              <Alert severity="error">{error}</Alert>
            </Paper>
          ) : request ? (
            <Stack spacing={2}>
              {isPreview ? (
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                  Demo preview mode: this sample share link is bundled with the app so reviewers
                  can validate the public request experience without signing in first.
                </Alert>
              ) : null}

              <Paper
                elevation={0}
                sx={{
                  border: '1px solid rgba(18, 50, 95, 0.08)',
                  borderRadius: 5,
                  overflow: 'hidden',
                }}
              >
                {/* Amount hero */}
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #0f62fe 0%, #0a7f62 100%)',
                    p: { sm: 4, xs: 3 },
                  }}
                >
                  <Typography sx={{ color: 'rgba(255,255,255,0.75)', mb: 0.5 }} variant="body2">
                    Payment request
                  </Typography>
                  <Typography
                    sx={{
                      color: '#fff',
                      fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                    variant="h3"
                  >
                    {currencyFormatter.format(request.amount)}
                  </Typography>
                </Box>

                <Box sx={{ p: { sm: 3, xs: 2.5 } }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Chip
                        color={statusColorMap[request.status] ?? 'default'}
                        label={request.status}
                        size="small"
                      />
                      <Typography color="text.secondary" variant="caption">
                        {new Date(request.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Typography>
                    </Stack>

                    {request.note ? (
                      <>
                        <Divider />
                        <Box>
                          <Typography color="text.secondary" gutterBottom variant="caption">
                            Note
                          </Typography>
                          <Typography>{request.note}</Typography>
                        </Box>
                      </>
                    ) : null}

                    <Divider />

                    <ExpiryCountdown expiresAt={request.expires_at} />

                    {request.status === 'pending' ? (
                      <Button
                        component={RouterLink}
                        fullWidth
                        size="large"
                        to="/login"
                        variant="contained"
                      >
                        Log in to Pay
                      </Button>
                    ) : (
                      <Alert severity="info">
                        This request is no longer actionable.
                      </Alert>
                    )}
                  </Stack>
                </Box>
              </Paper>
            </Stack>
          ) : null}
        </Box>
      </Box>
    </Box>
  )
}

export default PublicRequestPage
