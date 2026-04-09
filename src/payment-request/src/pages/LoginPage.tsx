import { FormEvent, useState } from 'react'
import { useNotify } from 'react-admin'
import { Box, Button, Paper, TextField, Typography } from '@mui/material'
import { supabase } from 'src/providers/supabaseClient'

const LoginPage = () => {
  const notify = useNotify()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      notify(error.message, { type: 'error' })
      return
    }

    setSent(true)
  }

  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 420,
          p: 4,
          width: '100%',
        }}
      >
        <Typography gutterBottom variant="h4">
          Lovie Payment Request
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Sign in with a magic link to create, manage, and pay requests.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <Button disabled={loading} type="submit" variant="contained">
            {loading ? 'Sending…' : 'Send Magic Link'}
          </Button>
          {sent ? (
            <Typography color="success.main">
              Check your email for the magic link.
            </Typography>
          ) : null}
        </Box>
      </Paper>
    </Box>
  )
}

export default LoginPage
