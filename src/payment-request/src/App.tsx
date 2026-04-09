import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { Admin, CustomRoutes, Layout, type LayoutProps } from 'react-admin'
import { Route } from 'react-router-dom'
import { authProvider, dataProvider } from 'src/providers'
import AuthCallbackPage from 'src/pages/AuthCallbackPage'
import LoginPage from 'src/pages/LoginPage'
import PublicRequestPage from 'src/pages/PublicRequestPage'
import paymentRequestsResource from 'src/resources/paymentRequests'

const theme = createTheme({
  palette: {
    mode: 'light',
  },
})

const AppLayout = (props: LayoutProps) => (
  <>
    <CssBaseline />
    <Layout {...props} />
  </>
)

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Admin
        authProvider={authProvider}
        dataProvider={dataProvider}
        layout={AppLayout}
        loginPage={LoginPage}
        title="Lovie Payment Request"
      >
        {paymentRequestsResource}
        <CustomRoutes noLayout>
          <Route element={<AuthCallbackPage />} path="/auth/callback" />
          <Route element={<PublicRequestPage />} path="/request/:id" />
        </CustomRoutes>
      </Admin>
    </ThemeProvider>
  )
}

export default App
