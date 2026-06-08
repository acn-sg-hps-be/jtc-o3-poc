import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import LoginIcon from '@mui/icons-material/Login'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'

// Full-screen sign-in shown until the user has a valid PKCE token.
export default function LoginPage({ clientId, setClientId, redirectUri, onSignIn, error }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card variant="outlined" sx={{ maxWidth: 460, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <DescriptionOutlinedIcon color="primary" fontSize="large" />
              <Box>
                <Typography variant="h5" sx={{ lineHeight: 1.2 }}>ACC Forms — POC</Typography>
                <Typography variant="body2" color="text.secondary">Autodesk Construction Cloud</Typography>
              </Box>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Sign in with your Autodesk account to continue. This uses the OAuth <b>PKCE</b> flow —
              no password or client secret is handled by this app.
            </Typography>

            <TextField
              label="APS Client ID" value={clientId} fullWidth size="small"
              onChange={(e) => setClientId(e.target.value)}
              helperText='From your APS app (Desktop, Mobile, Single-Page App type).'
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

            <Button
              variant="contained" size="large" startIcon={<LoginIcon />}
              disabled={!clientId} onClick={onSignIn}
            >
              Sign in with Autodesk
            </Button>

            {error && <Alert severity="error">{error}</Alert>}

            <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: 13 } }}>
              The app's Client ID must be added as a <b>Custom Integration</b> in the ACC Account
              Admin, or Forms API calls will return <code>403</code> even with a valid token.
            </Alert>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
