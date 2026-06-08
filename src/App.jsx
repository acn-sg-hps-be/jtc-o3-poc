import { useEffect, useState } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import ApiTester from './pages/ApiTester.jsx'
import SafetyObservationForm from './pages/SafetyObservationForm.jsx'
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
  const [token, setToken] = usePersisted('acc_token', '')
  const [projectId, setProjectId] = usePersisted('acc_project_id', '')
  const [baseUrl, setBaseUrl] = usePersisted('acc_base_url', DIRECT_HOST)
  const [clientId, setClientId] = usePersisted('aps_client_id', import.meta.env.VITE_APS_CLIENT_ID ?? '')
  const [page, setPage] = useState('safety')

  const [authMsg, setAuthMsg] = useState(null)
  const [authErr, setAuthErr] = useState(null)
  const redirectUri = getRedirectUri()

  // On load: if we came back from Autodesk with ?code=..., finish the PKCE exchange.
  useEffect(() => {
    handleRedirectCallback()
      .then((tok) => {
        if (tok) {
          setToken(tok.access_token)
          setAuthMsg('Signed in with Autodesk — access token loaded.')
        }
      })
      .catch((e) => setAuthErr(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function signIn() {
    setAuthErr(null)
    setAuthMsg(null)
    try {
      await login({ clientId, redirectUri })
    } catch (e) {
      setAuthErr(e.message)
    }
  }

  function signOut() {
    logout()
    setToken('')
    setAuthErr(null)
    setAuthMsg('Signed out.')
  }

  // Status of the PKCE-issued token (a manual paste won't have a stored record).
  const apsTok = getToken()
  const pkceActive = !!apsTok && !isExpired(apsTok)
  const expiresLabel = apsTok?.expires_at
    ? new Date(apsTok.expires_at).toLocaleTimeString()
    : null

  const ActivePage = PAGES.find((p) => p.key === page).Component

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <DescriptionOutlinedIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>ACC Forms — POC</Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>Autodesk Construction Cloud</Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Shared connection settings (used by both pages) */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Connection</Typography>

            {/* Authentication: PKCE sign-in (no backend) with a manual-token fallback */}
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="subtitle2">Sign in with Autodesk (PKCE)</Typography>
                {pkceActive ? (
                  <Chip color="success" size="small"
                    label={expiresLabel ? `Authenticated · expires ${expiresLabel}` : 'Authenticated'} />
                ) : token ? (
                  <Chip color="default" size="small" variant="outlined" label="Token set manually" />
                ) : (
                  <Chip color="warning" size="small" label="Not authenticated" />
                )}
              </Stack>

              <TextField
                label="APS Client ID" value={clientId} fullWidth size="small"
                placeholder="From your APS app (Desktop, Mobile, Single-Page App type)"
                onChange={(e) => setClientId(e.target.value)}
                helperText='App type must be "Desktop, Mobile, Single-Page App" — a public client with no secret.'
              />

              <Tooltip title="Register this exact URL as the app's Callback URL in the APS portal">
                <TextField
                  label="Redirect URI (register this in APS)" value={redirectUri} fullWidth size="small"
                  slotProps={{
                    input: { readOnly: true },
                    htmlInput: { sx: { fontFamily: 'ui-monospace, monospace', fontSize: 13 } },
                  }}
                />
              </Tooltip>

              <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Button variant="contained" startIcon={<LoginIcon />} disabled={!clientId} onClick={signIn}>
                  Sign in with Autodesk
                </Button>
                <Button variant="outlined" color="inherit" startIcon={<LogoutIcon />}
                  disabled={!token && !pkceActive} onClick={signOut}>
                  Sign out
                </Button>
              </Stack>

              {authMsg && <Alert severity="success" onClose={() => setAuthMsg(null)}>{authMsg}</Alert>}
              {authErr && <Alert severity="error" onClose={() => setAuthErr(null)}>{authErr}</Alert>}

              <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: 13 } }}>
                Add this app's Client ID as a <b>Custom Integration</b> in the ACC Account Admin, or
                Forms API calls will return <code>403</code> even with a valid token.
              </Alert>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={2}>
              <TextField
                label="Access token" type="password" value={token} fullWidth size="small"
                placeholder="Set by sign-in, or paste a Bearer token manually"
                onChange={(e) => setToken(e.target.value)}
                helperText="Filled automatically after PKCE sign-in. You can still paste a token by hand."
              />
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
