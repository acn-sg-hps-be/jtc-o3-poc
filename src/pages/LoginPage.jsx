import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LoginIcon from '@mui/icons-material/Login'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'

const mono = {
  input: { readOnly: true },
  htmlInput: { sx: { fontFamily: 'ui-monospace, monospace', fontSize: 13 } },
}

// Full-screen sign-in shown until the user has a valid PKCE token.
// End users only see the sign-in button; the technical fields are read-only
// and tucked away under "Advanced settings".
export default function LoginPage({ clientId, redirectUri, onSignIn, error }) {
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
                <Typography variant="h5" sx={{ lineHeight: 1.2 }}>Forma Forms — POC</Typography>
                <Typography variant="body2" color="text.secondary">Autodesk Construction Cloud</Typography>
              </Box>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Sign in with your Autodesk account to continue. This uses the OAuth <b>PKCE</b> flow —
              no password or client secret is handled by this app.
            </Typography>

            <Button
              variant="contained" size="large" startIcon={<LoginIcon />}
              disabled={!clientId} onClick={onSignIn}
            >
              Sign in with Autodesk
            </Button>

            {error && <Alert severity="error">{error}</Alert>}

            <Accordion variant="outlined" disableGutters sx={{ '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" color="text.secondary">Advanced settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TextField
                    label="APS Client ID" value={clientId} fullWidth size="small"
                    slotProps={mono}
                    helperText="Configured at build time (VITE_APS_CLIENT_ID)."
                  />
                  <TextField
                    label="Redirect URI" value={redirectUri} fullWidth size="small"
                    slotProps={mono}
                    helperText="Must be registered as a Callback URL on the APS app."
                  />
                  <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: 13 } }}>
                    The app's Client ID must be added as a <b>Custom Integration</b> in the ACC
                    Account Admin, or Forms API calls return <code>403</code>.
                  </Alert>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
