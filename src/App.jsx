import { useEffect, useState } from 'react'
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import ApiTester from './pages/ApiTester.jsx'
import SafetyObservationForm from './pages/SafetyObservationForm.jsx'
import LoginPage from './pages/LoginPage.jsx'
import {
  login,
  logout,
  handleRedirectCallback,
  getToken,
  isExpired,
  getRedirectUri,
} from './auth/pkce.js'

const DIRECT_HOST = 'https://developer.api.autodesk.com'

function usePersisted(key, initial) {
  const [val, setVal] = useState(() => localStorage.getItem(key) ?? initial)
  const set = (v) => {
    setVal(v)
    localStorage.setItem(key, v)
  }
  return [val, set]
}

const PAGES = [
  { key: 'safety', label: 'Safety Observation Form', Component: SafetyObservationForm },
  { key: 'tester', label: 'API Tester', Component: ApiTester },
]

export default function App() {
  const [projectId, setProjectId] = usePersisted('acc_project_id', '')
  const [baseUrl, setBaseUrl] = usePersisted('acc_base_url', DIRECT_HOST)
  const [clientId, setClientId] = usePersisted('aps_client_id', import.meta.env.VITE_APS_CLIENT_ID ?? '')
  const [page, setPage] = useState('safety')

  // Auth is sourced solely from the PKCE token record (single source of truth).
  const [auth, setAuth] = useState(() => {
    const t = getToken()
    return t && !isExpired(t) ? t : null
  })
  const [ready, setReady] = useState(false)
  const [authErr, setAuthErr] = useState(null)
  const redirectUri = getRedirectUri()

  useEffect(() => {
    // Tidy up the legacy duplicate token key — PKCE's aps_token is authoritative now.
    localStorage.removeItem('acc_token')
    handleRedirectCallback()
      .then((tok) => { if (tok) setAuth(tok) })
      .catch((e) => setAuthErr(e.message))
      .finally(() => setReady(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function signIn() {
    setAuthErr(null)
    try {
      await login({ clientId, redirectUri })
    } catch (e) {
      setAuthErr(e.message)
    }
  }

  function signOut() {
    logout()
    setAuth(null)
  }

  const authed = !!auth && !isExpired(auth)
  const token = authed ? auth.access_token : ''
  const expiresLabel = auth?.expires_at ? new Date(auth.expires_at).toLocaleTimeString() : null

  // Returning from Autodesk with ?code=...: show a spinner while we finish the exchange,
  // instead of briefly flashing the login page.
  const completing = !ready && new URLSearchParams(window.location.search).has('code')
  if (completing) {
    return <CenteredSpinner label="Completing sign-in…" />
  }

  if (!authed) {
    return (
      <LoginPage
        clientId={clientId}
        setClientId={setClientId}
        redirectUri={redirectUri}
        onSignIn={signIn}
        error={authErr}
      />
    )
  }

  const ActivePage = PAGES.find((p) => p.key === page).Component

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <DescriptionOutlinedIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>ACC Forms — POC</Typography>
          {expiresLabel && (
            <Chip
              size="small" label={`Session until ${expiresLabel}`}
              sx={{ mr: 2, bgcolor: 'rgba(255,255,255,0.18)', color: '#fff' }}
            />
          )}
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={signOut}>Sign out</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Shared settings (used by both pages). The token comes from sign-in. */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Connection</Typography>
            <Stack spacing={2}>
              <TextField
                label="Project ID" value={projectId} fullWidth size="small"
                placeholder="xxxxxxxx-xxxx-..." onChange={(e) => setProjectId(e.target.value)}
                helperText='Without the "b." prefix — the client strips it for you.'
              />
              <TextField
                label="API base URL" value={baseUrl} fullWidth size="small"
                onChange={(e) => setBaseUrl(e.target.value)}
                helperText="Forms API allows direct browser calls (CORS *). Point at your own backend later if you add one."
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Page navigation */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={page} onChange={(_, v) => setPage(v)}>
            {PAGES.map((p) => <Tab key={p.key} value={p.key} label={p.label} />)}
          </Tabs>
        </Box>

        <ActivePage token={token} projectId={projectId} baseUrl={baseUrl} />
      </Container>
    </Box>
  )
}

function CenteredSpinner({ label }) {
  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'background.default',
    }}>
      <CircularProgress />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  )
}
