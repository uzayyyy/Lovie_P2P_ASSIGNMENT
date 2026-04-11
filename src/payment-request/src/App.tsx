import {
  AppBar as MuiAppBar,
  Box,
  Button,
  CssBaseline,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material'
import { Admin, Layout, useLogout, useGetIdentity, type LayoutProps } from 'react-admin'
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

const MinimalAppBar = () => {
  const logout = useLogout()
  const { data: identity } = useGetIdentity()

  return (
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
        <Button onClick={() => void logout()} size="small" variant="outlined">
          Sign out
        </Button>
      </Toolbar>
    </MuiAppBar>
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
