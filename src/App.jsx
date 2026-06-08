import { useState } from 'react'
import {
  AppBar,
  Box,
  Card,
  CardContent,
  Container,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import ApiTester from './pages/ApiTester.jsx'
import SafetyObservationForm from './pages/SafetyObservationForm.jsx'

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
  const [page, setPage] = useState('safety')

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
            <Stack spacing={2}>
              <TextField
                label="Access token" type="password" value={token} fullWidth size="small"
                placeholder="Bearer token" onChange={(e) => setToken(e.target.value)}
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
