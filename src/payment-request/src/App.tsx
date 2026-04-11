import {
  AppBar as MuiAppBar,
  Box,
  CssBaseline,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material'
import { Admin, Layout, type LayoutProps } from 'react-admin'
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
  },
})

const MinimalAppBar = () => (
  <MuiAppBar
    color="transparent"
    elevation={0}
    position="fixed"
    sx={{
      backdropFilter: 'blur(18px)',
      borderBottom: '1px solid rgba(18, 50, 95, 0.08)',
      color: 'text.primary',
    }}
  >
    <Toolbar sx={{ gap: 2, minHeight: { sm: 72, xs: 72 } }}>
      <Typography sx={{ fontFamily: '"Space Grotesk", "Segoe UI", sans-serif', fontWeight: 700 }}>
        Lovie Payment Request
      </Typography>
      <Box sx={{ flex: 1 }} />
      <Typography color="text.secondary" variant="body2">
        Live dashboard
      </Typography>
    </Toolbar>
  </MuiAppBar>
)

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
