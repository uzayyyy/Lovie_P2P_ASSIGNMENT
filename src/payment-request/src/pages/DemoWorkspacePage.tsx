import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { SIMULATION_DELAY_MS } from 'src/components/PayButton'
import { ExpiryCountdown } from 'src/components/ExpiryCountdown'
import { ShareableLinkField } from 'src/components/ShareableLinkField'
import { StatusBadge } from 'src/components/StatusBadge'
import { useDemoRequests } from 'src/hooks/useDemoRequests'
import { DEMO_CURRENT_USER } from 'src/services/demoPaymentRequests'
import {
  formatRequestContact,
  validateAmountValue,
  validateNoteValue,
  validatePhone,
  validateRecipientEmail,
  validateSelfRequestByEmail,
  validateSelfRequestByPhone,
} from 'src/services/paymentRequestHelpers'
import {
  PaymentRequestStatusValues,
  type PaymentRequest,
  type PaymentRequestStatus,
} from 'src/types'

type DemoTab = 'incoming' | 'outgoing'

type FormValues = {
  amount: string
  note: string
  recipient_email: string
  recipient_phone: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  currency: 'TRY',
  style: 'currency',
})

const initialFormValues: FormValues = {
  amount: '',
  note: '',
  recipient_email: '',
  recipient_phone: '',
}

const statusFilterChoices = ['all', ...PaymentRequestStatusValues] as const

const sortRequests = (requests: PaymentRequest[]) =>
  [...requests].sort((left, right) =>
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  )

const isOutgoingRequest = (request: PaymentRequest) =>
  request.sender_id === DEMO_CURRENT_USER.id

const getCounterpartyLabel = (request: PaymentRequest, tab: DemoTab) =>
  tab === 'outgoing'
    ? formatRequestContact(
      request.recipient_email,
      request.recipient_phone,
      'Unknown recipient',
    )
    : formatRequestContact(request.sender_email, undefined, 'Unknown sender')

const DemoWorkspacePage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const { createRequest, requests, resetRequests, updateRequest } = useDemoRequests()
  const [tab, setTab] = useState<DemoTab>('outgoing')
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilterChoices)[number]>('all')
  const [search, setSearch] = useState('')
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      return
    }

    const matchingRequest = requests.find((request) => request.id === id)

    if (!matchingRequest) {
      return
    }

    setTab(isOutgoingRequest(matchingRequest) ? 'outgoing' : 'incoming')
  }, [id, requests])

  const visibleRequests = sortRequests(
    requests.filter((request) => {
      const belongsToActiveTab =
        tab === 'outgoing'
          ? isOutgoingRequest(request)
          : request.recipient_id === DEMO_CURRENT_USER.id

      if (!belongsToActiveTab) {
        return false
      }

      if (statusFilter !== 'all' && request.status !== statusFilter) {
        return false
      }

      if (!search.trim()) {
        return true
      }

      return getCounterpartyLabel(request, tab).toLowerCase().includes(search.trim().toLowerCase())
    }),
  )

  const selectedRequest =
    (id ? requests.find((request) => request.id === id) : undefined)
    ?? visibleRequests[0]
    ?? null

  const setFieldValue = (field: keyof FormValues, value: string) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
  }

  const selectRequest = (requestId: string) => {
    navigate(`/demo/request/${requestId}`)
  }

  const resetForm = () => {
    setFormValues(initialFormValues)
    setFormErrors({})
  }

  const submitCreateRequest = () => {
    const amountValue =
      formValues.amount.trim().length > 0 ? Number(formValues.amount) : undefined

    const nextErrors: FormErrors = {
      amount: validateAmountValue(amountValue),
      note: validateNoteValue(formValues.note),
      recipient_email:
        validateRecipientEmail(formValues.recipient_email, formValues)
        ?? validateSelfRequestByEmail(formValues.recipient_email, DEMO_CURRENT_USER.email),
      recipient_phone:
        validatePhone(formValues.recipient_phone, formValues)
        ?? validateSelfRequestByPhone(formValues.recipient_phone, DEMO_CURRENT_USER.phone),
    }

    setFormErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean) || amountValue === undefined) {
      return
    }

    const request = createRequest({
      amount: amountValue,
      note: formValues.note,
      recipient_email: formValues.recipient_email,
      recipient_phone: formValues.recipient_phone,
    })

    setTab('outgoing')
    setStatusFilter('all')
    setSearch('')
    setSuccessMessage(`Created request ${request.id.slice(0, 8)} with a 7-day expiry.`)
    resetForm()
    navigate(`/demo/request/${request.id}`)
  }

  const updateSelectedRequest = (status: PaymentRequestStatus) => {
    if (!selectedRequest) {
      return
    }

    const timestamp = new Date().toISOString()

    updateRequest(selectedRequest.id, (request) => ({
      ...request,
      paid_at: status === 'paid' ? timestamp : request.paid_at,
      status,
      updated_at: timestamp,
    }))
  }

  const handlePay = () => {
    if (!selectedRequest || paymentRequestId) {
      return
    }

    setPaymentRequestId(selectedRequest.id)

    window.setTimeout(() => {
      updateSelectedRequest('paid')
      setPaymentRequestId(null)
    }, SIMULATION_DELAY_MS)
  }

  const pendingIncoming =
    selectedRequest?.status === 'pending'
    && selectedRequest.recipient_id === DEMO_CURRENT_USER.id

  const pendingOutgoing =
    selectedRequest?.status === 'pending'
    && selectedRequest.sender_id === DEMO_CURRENT_USER.id

  const shareableUrl = selectedRequest
    ? `${window.location.origin}/demo/request/${selectedRequest.id}`
    : ''

  return (
    <Box
      sx={{
        background:
          'radial-gradient(circle at top left, rgba(0, 140, 255, 0.16), transparent 32%), linear-gradient(180deg, #f7fbff 0%, #eef4ff 100%)',
        minHeight: '100vh',
        px: { sm: 4, xs: 2 },
        py: { sm: 4, xs: 3 },
      }}
    >
      <Box sx={{ margin: '0 auto', maxWidth: 1240 }}>
        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              border: '1px solid rgba(18, 50, 95, 0.08)',
              borderRadius: 6,
              overflow: 'hidden',
              p: { sm: 4, xs: 3 },
            }}
          >
            <Stack
              direction={{ md: 'row', xs: 'column' }}
              justifyContent="space-between"
              spacing={3}
            >
              <Stack spacing={2}>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  <Chip color="primary" label="Public Demo Sandbox" size="small" />
                  <Chip label="React Admin + Supabase production path preserved" size="small" />
                </Stack>
                <Typography sx={{ fontSize: { md: 44, xs: 34 }, fontWeight: 700, lineHeight: 1.05 }}>
                  Review the full payment request flow without waiting on email auth.
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
                  This sandbox mirrors the assignment flow with demo data stored in the
                  browser. The live app still uses Supabase auth and persistence, while
                  this route gives recruiters a frictionless way to test create, filter,
                  view, pay, decline, cancel, and expiration behaviors.
                </Typography>
                <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1.5}>
                  <Button component={RouterLink} to="/" variant="contained">
                    Open live Supabase flow
                  </Button>
                  <Button component={RouterLink} to="/request/demo-public-pending" variant="outlined">
                    Preview a public share link
                  </Button>
                  <Button onClick={resetRequests} variant="text">
                    Reset demo data
                  </Button>
                </Stack>
              </Stack>

              <Paper
                elevation={0}
                sx={{
                  alignSelf: 'stretch',
                  backgroundColor: 'rgba(255, 255, 255, 0.75)',
                  border: '1px solid rgba(18, 50, 95, 0.08)',
                  borderRadius: 4,
                  minWidth: { md: 300 },
                  p: 3,
                }}
              >
                <Stack spacing={1.5}>
                  <Typography fontWeight={700}>Demo identity</Typography>
                  <Typography color="text.secondary">
                    Signed in as {DEMO_CURRENT_USER.fullName}
                  </Typography>
                  <Typography>{DEMO_CURRENT_USER.email}</Typography>
                  <Typography>{DEMO_CURRENT_USER.phone}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Try creating one request with only email and one with only phone to
                    exercise the required validation paths.
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          </Paper>

          <Grid container spacing={3}>
            <Grid item lg={4} xs={12}>
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid rgba(18, 50, 95, 0.08)',
                  borderRadius: 5,
                  p: 3,
                }}
              >
                <Stack spacing={2.5}>
                  <Box>
                    <Typography fontWeight={700} variant="h5">
                      Create request
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Either recipient email or phone is required.
                    </Typography>
                  </Box>

                  {successMessage ? (
                    <Alert data-testid="demo-create-success" severity="success">
                      {successMessage}
                    </Alert>
                  ) : null}

                  <TextField
                    fullWidth
                    helperText={formErrors.recipient_email}
                    inputProps={{ 'data-testid': 'demo-recipient-email' }}
                    label="Recipient email"
                    onChange={(event) => setFieldValue('recipient_email', event.target.value)}
                    value={formValues.recipient_email}
                  />
                  <TextField
                    fullWidth
                    helperText={formErrors.recipient_phone}
                    inputProps={{ 'data-testid': 'demo-recipient-phone' }}
                    label="Recipient phone"
                    onChange={(event) => setFieldValue('recipient_phone', event.target.value)}
                    value={formValues.recipient_phone}
                  />
                  <TextField
                    fullWidth
                    helperText={formErrors.amount}
                    inputProps={{
                      'data-testid': 'demo-amount',
                      inputMode: 'decimal',
                    }}
                    label="Amount (TRY)"
                    onChange={(event) => setFieldValue('amount', event.target.value)}
                    value={formValues.amount}
                  />
                  <TextField
                    fullWidth
                    helperText={formErrors.note}
                    inputProps={{ 'data-testid': 'demo-note' }}
                    label="Note"
                    multiline
                    minRows={3}
                    onChange={(event) => setFieldValue('note', event.target.value)}
                    value={formValues.note}
                  />

                  <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1.5}>
                    <Button data-testid="demo-create-request" onClick={submitCreateRequest} variant="contained">
                      Create request
                    </Button>
                    <Button onClick={resetForm} variant="outlined">
                      Clear form
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            <Grid item lg={8} xs={12}>
              <Stack spacing={3}>
                <Paper
                  data-testid="demo-detail-panel"
                  elevation={0}
                  sx={{
                    border: '1px solid rgba(18, 50, 95, 0.08)',
                    borderRadius: 5,
                    p: 3,
                  }}
                >
                  <Stack spacing={2.5}>
                    <Stack
                      direction={{ md: 'row', xs: 'column' }}
                      justifyContent="space-between"
                      spacing={2}
                    >
                      <Box>
                        <Typography fontWeight={700} variant="h5">
                          Request management
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                          Filter by status, search by sender or recipient, then open a detail view.
                        </Typography>
                      </Box>
                      <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1.5}>
                        <TextField
                          inputProps={{ 'data-testid': 'demo-search' }}
                          label={tab === 'outgoing' ? 'Search recipient' : 'Search sender'}
                          onChange={(event) => setSearch(event.target.value)}
                          size="small"
                          value={search}
                        />
                        <TextField
                          inputProps={{ 'data-testid': 'demo-status-filter' }}
                          label="Status"
                          onChange={(event) =>
                            setStatusFilter(
                              event.target.value as (typeof statusFilterChoices)[number],
                            )}
                          select
                          size="small"
                          value={statusFilter}
                        >
                          {statusFilterChoices.map((choice) => (
                            <MenuItem key={choice} value={choice}>
                              {choice === 'all'
                                ? 'All statuses'
                                : choice.charAt(0).toUpperCase() + choice.slice(1)}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Stack>
                    </Stack>

                    <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1.5}>
                      <Button
                        data-testid="demo-tab-outgoing"
                        onClick={() => {
                          setTab('outgoing')
                          navigate('/demo')
                        }}
                        variant={tab === 'outgoing' ? 'contained' : 'outlined'}
                      >
                        Outgoing
                      </Button>
                      <Button
                        data-testid="demo-tab-incoming"
                        onClick={() => {
                          setTab('incoming')
                          navigate('/demo')
                        }}
                        variant={tab === 'incoming' ? 'contained' : 'outlined'}
                      >
                        Incoming
                      </Button>
                    </Stack>

                    {visibleRequests.length === 0 ? (
                      <Alert severity="info">No requests match the current filter.</Alert>
                    ) : (
                      <Stack spacing={1.5}>
                        {visibleRequests.map((request) => (
                          <Card
                            data-testid={`demo-request-card-${request.id}`}
                            key={request.id}
                            sx={{
                              border:
                                selectedRequest?.id === request.id
                                  ? '2px solid #1976d2'
                                  : '1px solid rgba(18, 50, 95, 0.08)',
                              cursor: 'pointer',
                            }}
                            variant="outlined"
                            onClick={() => selectRequest(request.id)}
                          >
                            <CardContent>
                              <Stack
                                direction={{ sm: 'row', xs: 'column' }}
                                justifyContent="space-between"
                                spacing={1}
                              >
                                <Stack spacing={0.5}>
                                  <Typography fontWeight={700}>
                                    {getCounterpartyLabel(request, tab)}
                                  </Typography>
                                  <Typography color="text.secondary" variant="body2">
                                    {request.note ?? 'No note provided'}
                                  </Typography>
                                </Stack>
                                <Stack alignItems={{ sm: 'flex-end', xs: 'flex-start' }} spacing={0.75}>
                                  <Typography fontWeight={700}>
                                    {currencyFormatter.format(request.amount)}
                                  </Typography>
                                  <StatusBadge status={request.status} />
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    border: '1px solid rgba(18, 50, 95, 0.08)',
                    borderRadius: 5,
                    p: 3,
                  }}
                >
                  {selectedRequest ? (
                    <Stack spacing={2}>
                      <Stack
                        direction={{ md: 'row', xs: 'column' }}
                        justifyContent="space-between"
                        spacing={2}
                      >
                        <Box>
                          <Typography fontWeight={700} variant="h5">
                            Request detail
                          </Typography>
                          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                            ID {selectedRequest.id}
                          </Typography>
                        </Box>
                        <StatusBadge status={selectedRequest.status} testId="demo-detail-status" />
                      </Stack>

                      <Divider />

                      <Grid container spacing={2}>
                        <Grid item md={6} xs={12}>
                          <Typography color="text.secondary" variant="body2">
                            Amount
                          </Typography>
                          <Typography fontWeight={700} variant="h4">
                            {currencyFormatter.format(selectedRequest.amount)}
                          </Typography>
                        </Grid>
                        <Grid item md={6} xs={12}>
                          <Typography color="text.secondary" variant="body2">
                            Sender
                          </Typography>
                          <Typography>{selectedRequest.sender_email ?? 'Unknown sender'}</Typography>
                        </Grid>
                        <Grid item md={6} xs={12}>
                          <Typography color="text.secondary" variant="body2">
                            Recipient
                          </Typography>
                          <Typography>
                            {formatRequestContact(
                              selectedRequest.recipient_email,
                              selectedRequest.recipient_phone,
                              'Unknown recipient',
                            )}
                          </Typography>
                        </Grid>
                        <Grid item md={6} xs={12}>
                          <Typography color="text.secondary" variant="body2">
                            Created at
                          </Typography>
                          <Typography>{new Date(selectedRequest.created_at).toLocaleString()}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography color="text.secondary" variant="body2">
                            Note
                          </Typography>
                          <Typography>{selectedRequest.note ?? 'No note provided.'}</Typography>
                        </Grid>
                      </Grid>

                      <ExpiryCountdown expiresAt={selectedRequest.expires_at} />

                      <ShareableLinkField
                        label="Demo share link"
                        url={shareableUrl}
                      />

                      <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1.5}>
                        {pendingIncoming ? (
                          <>
                            <Button
                              data-testid="demo-pay"
                              disabled={paymentRequestId === selectedRequest.id}
                              onClick={handlePay}
                              variant="contained"
                            >
                              {paymentRequestId === selectedRequest.id ? 'Processing…' : 'Pay'}
                            </Button>
                            <Button
                              color="error"
                              data-testid="demo-decline"
                              onClick={() => updateSelectedRequest('declined')}
                              variant="outlined"
                            >
                              Decline
                            </Button>
                          </>
                        ) : null}

                        {pendingOutgoing ? (
                          <Button
                            color="warning"
                            data-testid="demo-cancel"
                            onClick={() => updateSelectedRequest('cancelled')}
                            variant="outlined"
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </Stack>
                    </Stack>
                  ) : (
                    <Alert severity="info">Select a request to inspect the full detail view.</Alert>
                  )}
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Box>
    </Box>
  )
}

export default DemoWorkspacePage
