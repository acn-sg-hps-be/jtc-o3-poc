import { useState } from 'react'
import { Alert, AlertTitle, Box, CircularProgress, Paper, Typography } from '@mui/material'

// Small hook that runs an async API call and tracks loading/result/error state.
export function useApiCall() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function run(fn) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await fn()
      setResult(data)
      return data
    } catch (e) {
      setError({ message: e.message, status: e.status, body: e.body })
      throw e
    } finally {
      setLoading(false)
    }
  }

  return { loading, result, error, run, setResult, setError }
}

const codeBox = {
  m: 0,
  p: 1.5,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 13,
  whiteSpace: 'pre-wrap',
  overflow: 'auto',
  maxHeight: 420,
}

export function ResultPanel({ loading, error, result }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 2 }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">Calling the Forms API…</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        <AlertTitle>
          {error.message}{error.status ? ` (status ${error.status})` : ''}
        </AlertTitle>
        {error.body != null && (
          <Box component="pre" sx={{ ...codeBox, p: 0, mt: 1 }}>
            {JSON.stringify(error.body, null, 2)}
          </Box>
        )}
        {!error.status && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            No HTTP status usually means a network failure (check the token, base URL, and console).
          </Typography>
        )}
      </Alert>
    )
  }

  if (result != null) {
    return (
      <Paper variant="outlined" sx={{ my: 2, overflow: 'hidden' }}>
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, bgcolor: 'grey.100' }}>
          Response
        </Typography>
        <Box component="pre" sx={codeBox}>{JSON.stringify(result, null, 2)}</Box>
      </Paper>
    )
  }

  return null
}
