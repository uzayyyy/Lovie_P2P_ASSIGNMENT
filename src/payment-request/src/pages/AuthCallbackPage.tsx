import { useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { supabase } from 'src/providers/supabaseClient'

const AuthCallbackPage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (active && session) {
        navigate('/', { replace: true })
      }
    }

    void syncSession()

    const listener = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/', { replace: true })
      }
    })

    return () => {
      active = false
      listener.data.subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <Typography>Signing you in…</Typography>
    </Box>
  )
}

export default AuthCallbackPage
