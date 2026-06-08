import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  listFormTemplates,
  listForms,
  getLayout,
  getSection,
  createForm,
  updateForm,
  batchUpdateValues,
} from '../api/accForms.js'
import { useApiCall, ResultPanel } from '../shared.jsx'

// Raw API testing page: fire each endpoint with hand-edited JSON bodies.
export default function ApiTester({ token, projectId, baseUrl }) {
  const [layoutId, setLayoutId] = useState('f6a63c2d-c7ea-4c6f-b2b8-fbd2a1c27e79')
  const [sectionId, setSectionId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [createBody, setCreateBody] = useState(
    JSON.stringify({ name: 'POC form', formDate: '2026-06-04' }, null, 2),
  )
  const [formId, setFormId] = useState('')
  const [patchTemplateId, setPatchTemplateId] = useState('')
  const [patchBody, setPatchBody] = useState(
    JSON.stringify({ description: 'Updated via the API' }, null, 2),
  )
  const [valuesBody, setValuesBody] = useState(
    JSON.stringify({ customValues: [{ fieldId: '<fieldId>', textVal: 'hello from React' }] }, null, 2),
  )

  const { loading, result, error, run } = useApiCall()
  const canCall = token && projectId
  const off = !canCall || loading

  const parse = (s) => {
    try {
      return JSON.parse(s)
    } catch {
      throw new Error('Invalid JSON in request body')
    }
  }

  const monoInput = { htmlInput: { sx: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 } } }

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Read</Typography>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Button variant="contained" disabled={off}
              onClick={() => run(() => listFormTemplates(baseUrl, token, projectId))}>
              List form templates
            </Button>
            <Button variant="contained" disabled={off}
              onClick={() => run(() => listForms(baseUrl, token, projectId))}>
              List forms
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Inspect layout / sections</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Discover field definitions (incl. the <code>isRequired</code> flag). Get the layout
            first → copy a section <code>uid</code> from its response → get that section.
          </Typography>
          <Stack spacing={2}>
            <TextField label="Layout ID (template's currentLayoutId)" size="small" fullWidth
              value={layoutId} onChange={(e) => setLayoutId(e.target.value)} slotProps={monoInput} />
            <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} disabled={off || !layoutId}
              onClick={() => run(() => getLayout(baseUrl, token, projectId, layoutId))}>
              Get layout
            </Button>
            <TextField label="Section UID (the section's uid, not its id)" size="small" fullWidth
              value={sectionId} onChange={(e) => setSectionId(e.target.value)} slotProps={monoInput} />
            <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} disabled={off || !layoutId || !sectionId}
              onClick={() => run(() => getSection(baseUrl, token, projectId, layoutId, sectionId))}>
              Get section
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Create (from template)</Typography>
          <Stack spacing={2}>
            <TextField label="Template ID" size="small" fullWidth value={templateId}
              onChange={(e) => setTemplateId(e.target.value)} slotProps={monoInput} />
            <TextField label="Body" multiline minRows={4} fullWidth value={createBody}
              onChange={(e) => setCreateBody(e.target.value)} slotProps={monoInput} />
            <Button variant="contained" sx={{ alignSelf: 'flex-start' }} disabled={off || !templateId}
              onClick={() => run(() => createForm(baseUrl, token, projectId, templateId, parse(createBody)))}>
              Create form
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Update</Typography>
          <Stack spacing={2}>
            <TextField label="Form ID" size="small" fullWidth value={formId}
              onChange={(e) => setFormId(e.target.value)} slotProps={monoInput} />
            <TextField label="Template ID (form's formTemplate.id, required for PATCH)" size="small" fullWidth
              value={patchTemplateId} onChange={(e) => setPatchTemplateId(e.target.value)} slotProps={monoInput} />
            <TextField label="Patch body (form details)" multiline minRows={3} fullWidth value={patchBody}
              onChange={(e) => setPatchBody(e.target.value)} slotProps={monoInput} />
            <Button variant="contained" sx={{ alignSelf: 'flex-start' }} disabled={off || !formId || !patchTemplateId}
              onClick={() => run(() => updateForm(baseUrl, token, projectId, patchTemplateId, formId, parse(patchBody)))}>
              Patch form
            </Button>
            <TextField label="Values batch-update body" multiline minRows={5} fullWidth value={valuesBody}
              onChange={(e) => setValuesBody(e.target.value)} slotProps={monoInput} />
            <Button variant="contained" sx={{ alignSelf: 'flex-start' }} disabled={off || !formId}
              onClick={() => run(() => batchUpdateValues(baseUrl, token, projectId, formId, parse(valuesBody)))}>
              Batch-update values
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <ResultPanel loading={loading} error={error} result={result} />
    </Stack>
  )
}
