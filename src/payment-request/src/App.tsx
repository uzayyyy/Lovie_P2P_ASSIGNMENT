import { useState } from 'react'
import {
  AppBar as MuiAppBar,
  Box,
  Button,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material'
import { Admin, Layout, useLogout, useGetIdentity, useNotify, type LayoutProps } from 'react-admin'
import { supabase } from 'src/providers/supabaseClient'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { authProvider, dataProvider } from 'src/providers'
import AuthCallbackPage from 'src/pages/AuthCallbackPage'
import DemoWorkspacePage from 'src/pages/DemoWorkspacePage'
import LoginPage from 'src/pages/LoginPage'
import PublicRequestPage from 'src/pages/PublicRequestPage'
import paymentRequestsResource from 'src/resources/paymentRequests'

const theme = createTheme({
  palette: {
    background: {
      default: '#f5f7fb',
      paper: '#ffffff',
    },
    mode: 'light',
    primary: {
      main: '#0f62fe',
    },
    secondary: {
      main: '#0a7f62',
    },
  },
  shape: {
    borderRadius: 18,
  },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    h4: {
      fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
})

const ChangePasswordDialog = ({ onClose, open }: { onClose: () => void; open: boolean }) => {
  const notify = useNotify()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (password !== confirm) {
      notify('Passwords do not match', { type: 'error' })
      return
    }
    if (password.length < 6) {
      notify('Password must be at least 6 characters', { type: 'error' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      notify(error.message, { type: 'error' })
    } else {
      notify('Password updated', { type: 'success' })
      setPassword('')
      setConfirm('')
      onClose()
    }
  }

  return (
    <Dialog fullWidth maxWidth="xs" onClose={onClose} open={open}>
      <DialogTitle>Change password</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="New password"
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            value={password}
          />
          <TextField
            fullWidth
            label="Confirm password"
            onChange={(e) => setConfirm(e.target.value)}
            type="password"
            value={confirm}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button disabled={loading || !password} onClick={() => void handleSave()} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const MinimalAppBar = () => {
  const logout = useLogout()
  const { data: identity } = useGetIdentity()
  const [pwOpen, setPwOpen] = useState(false)

  return (
    <>
      <MuiAppBar
        color="transparent"
        elevation={0}
        position="sticky"
        sx={{
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(18, 50, 95, 0.08)',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ gap: 2, minHeight: { sm: 64, xs: 64 } }}>
          <Typography sx={{ fontFamily: '"Space Grotesk", "Segoe UI", sans-serif', fontWeight: 700 }}>
            Lovie Payment Request
          </Typography>
          <Box sx={{ flex: 1 }} />
          {identity?.email ? (
            <Typography color="text.secondary" sx={{ display: { sm: 'block', xs: 'none' } }} variant="body2">
              {String(identity.email)}
            </Typography>
          ) : null}
          <Button onClick={() => setPwOpen(true)} size="small" variant="text">
            Change password
          </Button>
          <Button onClick={() => void logout()} size="small" variant="outlined">
            Sign out
          </Button>
        </Toolbar>
      </MuiAppBar>
      <ChangePasswordDialog onClose={() => setPwOpen(false)} open={pwOpen} />
    </>
  )
}

const EmptyMenu = () => null

const EmptySidebar = () => null

const AppLayout = (props: LayoutProps) => (
  <Layout {...props} appBar={MinimalAppBar} menu={EmptyMenu} sidebar={EmptySidebar} />
)

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route element={<AuthCallbackPage />} path="/auth/callback" />
          <Route element={<DemoWorkspacePage />} path="/demo" />
          <Route element={<DemoWorkspacePage />} path="/demo/request/:id" />
          <Route element={<PublicRequestPage />} path="/request/:id" />
          <Route
            element={(
              <Admin
                authProvider={authProvider}
                dataProvider={dataProvider}
                layout={AppLayout}
                loginPage={LoginPage}
                theme={theme}
                title="Lovie Payment Request"
              >
                {paymentRequestsResource}
              </Admin>
            )}
            path="/*"
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
