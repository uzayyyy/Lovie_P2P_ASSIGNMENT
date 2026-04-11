import { FormEvent, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useNotify } from 'react-admin'
import { supabase } from 'src/providers/supabaseClient'
import { DEMO_CURRENT_USER } from 'src/services/demoPaymentRequests'

type Mode = 'magic' | 'password' | 'signup'

const featureCards = [
  {
    body: 'Create requests with either email or phone, a precise TRY amount, and an optional note.',
    title: 'Flexible request creation',
  },
  {
    body: 'Track incoming and outgoing requests across Pending, Paid, Declined, Cancelled, and Expired states.',
    title: 'Operational dashboard',
  },
  {
    body: 'Use a public share link or open the full interactive sandbox without waiting on a mailbox.',
    title: 'Reviewer-friendly demo flow',
  },
]

const LoginPage = () => {
  const notify = useNotify()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [mode, setMode] = useState<Mode>('magic')

  const switchMode = (next: Mode) => {
    setMode(next)
    setSent(false)
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setSent(false)

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        notify('Passwords do not match', { type: 'error' })
        setLoading(false)
        return
      }
      const { data, error } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (error) {
        notify(error.message, { type: 'error' })
      } else if (data.session) {
        window.location.href = '/'
      } else {
        setSent(true)
      }
      return
    }

    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) {
        notify(error.message, { type: 'error' })
      } else {
        window.location.href = '/'
      }
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    setLoading(false)

    if (error) {
      notify(error.message, { type: 'error' })
      return
    }

    setSent(true)
  }

  const submitLabel = () => {
    if (loading) return 'Please wait...'
    if (mode === 'signup') return 'Create account'
    if (mode === 'password') return 'Sign in'
    return 'Send magic link'
  }

  return (
    <Box
      sx={{
        background:
          'radial-gradient(circle at top left, rgba(15, 98, 254, 0.18), transparent 24%), radial-gradient(circle at bottom right, rgba(10, 127, 98, 0.16), transparent 28%), linear-gradient(180deg, #f7fbff 0%, #eef3ff 100%)',
        minHeight: '100vh',
        px: { sm: 4, xs: 2 },
        py: { sm: 4, xs: 3 },
      }}
    >
      <Box sx={{ margin: '0 auto', maxWidth: 1240 }}>
        <Grid alignItems="stretch" container spacing={3}>
          <Grid item lg={7} xs={12}>
            <Paper
              elevation={0}
              sx={{
                border: '1px solid rgba(18, 50, 95, 0.08)',
                borderRadius: 6,
                height: '100%',
                overflow: 'hidden',
                p: { sm: 4.5, xs: 3 },
              }}
            >
              <Stack spacing={3}>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  <Chip color="primary" label="Lovie Interview Assignment" size="small" />
                  <Chip label="React Admin v5 + Supabase" size="small" />
                  <Chip label="Spec-Kit workflow" size="small" />
                </Stack>

                <Stack spacing={2}>
                  <Typography sx={{ fontSize: { lg: 56, xs: 38 }, fontWeight: 700, lineHeight: 1.02 }}>
                    Request money from friends with a live app and a zero-friction demo.
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 18, maxWidth: 760 }}>
                    The production path uses Supabase-backed email auth and persisted payment requests.
                    For fast review, there is also a public interactive sandbox that exercises create,
                    filter, detail, pay, decline, cancel, and expiration states end to end.
                  </Typography>
                </Stack>

                <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1.5}>
                  <Button component={RouterLink} size="large" to="/demo" variant="contained">
                    Open interactive demo
                  </Button>
                  <Button
                    component={RouterLink}
                    size="large"
                    to="/request/demo-public-pending"
                    variant="outlined"
                  >
                    Preview a public share link
                  </Button>
                </Stack>

                <Grid container spacing={2}>
                  {featureCards.map((card) => (
                    <Grid item key={card.title} md={4} xs={12}>
                      <Paper
                        elevation={0}
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.72)',
                          border: '1px solid rgba(18, 50, 95, 0.08)',
                          borderRadius: 4,
                          height: '100%',
                          p: 2.5,
                        }}
                      >
                        <Stack spacing={1.25}>
                          <Typography fontWeight={700}>{card.title}</Typography>
                          <Typography color="text.secondary" variant="body2">
                            {card.body}
                          </Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                <Paper
                  elevation={0}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.78)',
                    border: '1px solid rgba(18, 50, 95, 0.08)',
                    borderRadius: 4,
                    p: 3,
                  }}
                >
                  <Stack spacing={1}>
                    <Typography fontWeight={700}>Quick reviewer path</Typography>
                    <Typography color="text.secondary" variant="body2">
                      1. Open the interactive demo for the fastest full walkthrough.
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      2. Inspect the public share-link preview without signing in.
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      3. Use any real email below if you want to test the live Supabase flow too.
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      Demo identity inside the sandbox: {DEMO_CURRENT_USER.email} / {DEMO_CURRENT_USER.phone}
                    </Typography>
                  </Stack>
                </Paper>
              </Stack>
            </Paper>
          </Grid>

          <Grid item lg={5} xs={12}>
            <Paper
              elevation={0}
              sx={{
                border: '1px solid rgba(18, 50, 95, 0.08)',
                borderRadius: 6,
                p: { sm: 4, xs: 3 },
              }}
            >
              <Stack spacing={3}>
                <Box>
                  <Typography gutterBottom variant="h4">
                    {mode === 'signup' ? 'Create account' : 'Sign in'}
                  </Typography>
                  <Typography color="text.secondary">
                    {mode === 'signup'
                      ? 'Register with email and password to use the live Supabase app.'
                      : mode === 'magic'
                        ? 'Enter your email — we will send a one-click login link.'
                        : 'Sign in with your email and password.'}
                  </Typography>
                </Box>

                <Alert severity="info">
                  The interactive demo is public. Use sign-in below to validate the real auth and database path.
                </Alert>

                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
                  <TextField
                    label="Email"
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                  {mode === 'password' || mode === 'signup' ? (
                    <TextField
                      label="Password"
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      type="password"
                      value={password}
                    />
                  ) : null}
                  {mode === 'signup' ? (
                    <TextField
                      label="Confirm password"
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      type="password"
                      value={confirmPassword}
                    />
                  ) : null}
                  <Button disabled={loading} size="large" type="submit" variant="contained">
                    {submitLabel()}
                  </Button>

                  <Divider />

                  {mode === 'signup' ? (
                    <Stack spacing={1}>
                      <Button onClick={() => switchMode('password')} size="small" type="button" variant="text">
                        Already have an account? Sign in
                      </Button>
                      <Button onClick={() => switchMode('magic')} size="small" type="button" variant="text">
                        Use magic link instead
                      </Button>
                    </Stack>
                  ) : mode === 'password' ? (
                    <Stack spacing={1}>
                      <Button onClick={() => switchMode('signup')} size="small" type="button" variant="text">
                        No account yet? Create one
                      </Button>
                      <Button onClick={() => switchMode('magic')} size="small" type="button" variant="text">
                        Forgot password? Use magic link
                      </Button>
                    </Stack>
                  ) : (
                    <Stack spacing={1}>
                      <Button onClick={() => switchMode('signup')} size="small" type="button" variant="text">
                        No account yet? Create one
                      </Button>
                      <Button onClick={() => switchMode('password')} size="small" type="button" variant="text">
                        Have a password? Sign in
                      </Button>
                    </Stack>
                  )}

                  {sent ? (
                    <Alert severity="success">
                      {mode === 'signup'
                        ? 'Check your inbox to confirm your email, then sign in.'
                        : 'Check your inbox for the magic link. It will sign you in (and create your account if you are new).'}
                    </Alert>
                  ) : null}
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default LoginPage
