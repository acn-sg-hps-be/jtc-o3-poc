import { useEffect, useState } from 'react'
import {
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Tab,
  Tabs,
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

// Top-level modules, shown as tabs in the app bar. They share the same auth + settings.
const PAGES = [
  { key: 'safety', label: 'Safety Observation Form', Component: SafetyObservationForm },
  { key: 'tester', label: 'API Tester', Component: ApiTester },
]

export default function App() {
  // Project ID & base URL default from env (baked into the build). Overridable in the
  // API Tester module for the current session — intentionally NOT persisted to localStorage.
  const [projectId, setProjectId] = useState(import.meta.env.VITE_ACC_PROJECT_ID ?? '')
  const [baseUrl, setBaseUrl] = useState(DIRECT_HOST)
  const [clientId] = useState(import.meta.env.VITE_APS_CLIENT_ID ?? '')
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
    // Tidy legacy keys we no longer use — token comes from the PKCE store, settings from env.
    ;['acc_token', 'acc_project_id', 'acc_base_url'].forEach((k) => localStorage.removeItem(k))
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

  // Returning from Autodesk with ?code=...: show a spinner while finishing the exchange.
  const completing = !ready && new URLSearchParams(window.location.search).has('code')
  if (completing) {
    return <CenteredSpinner label="Completing sign-in…" />
  }

  if (!authed) {
    return (
      <LoginPage clientId={clientId} redirectUri={redirectUri} onSignIn={signIn} error={authErr} />
    )
  }

  const ActivePage = PAGES.find((p) => p.key === page).Component

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <DescriptionOutlinedIcon />
          <Typography variant="h6" sx={{ whiteSpace: 'nowrap' }}>Forma Forms — POC</Typography>

          {/* Module navigation lives in the top menu */}
          <Tabs
            value={page}
            onChange={(_, v) => setPage(v)}
            textColor="inherit"
            sx={{
              flexGrow: 1,
              ml: 2,
              '& .MuiTabs-indicator': { backgroundColor: '#fff' },
              '& .MuiTab-root': { minHeight: 64, opacity: 0.8 },
              '& .Mui-selected': { opacity: 1 },
            }}
          >
            {PAGES.map((p) => <Tab key={p.key} value={p.key} label={p.label} />)}
          </Tabs>

          {expiresLabel && (
            <Chip
              size="small" label={`Session until ${expiresLabel}`}
              sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff' }}
            />
          )}
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={signOut}>Sign out</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <ActivePage
          token={token}
          projectId={projectId}
          baseUrl={baseUrl}
          setProjectId={setProjectId}
          setBaseUrl={setBaseUrl}
        />
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
