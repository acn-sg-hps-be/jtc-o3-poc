import { useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { createForm, batchUpdateValues } from '../api/accForms.js'
import { SECTIONS, SAFETY_TEMPLATE_ID } from '../safetyFormSchema.js'
import { useApiCall, ResultPanel } from '../shared.jsx'

const today = new Date().toISOString().slice(0, 10)

// Custom UI for the "Safety Observation Form" template.
// Flow: (1) create a draft form from the template, then (2) save field values
// via the v2 values:batch-update endpoint.
export default function SafetyObservationForm({ token, projectId, baseUrl }) {
  const [name, setName] = useState('Safety Observation Form')
  const [formDate, setFormDate] = useState(today)
  const [description, setDescription] = useState('')
  const [formId, setFormId] = useState('')

  const [values, setValues] = useState({})
  const setField = (fieldId, v) => setValues((prev) => ({ ...prev, [fieldId]: v }))

  const [missing, setMissing] = useState([])

  const { loading, result, error, run } = useApiCall()
  const canCall = token && projectId

  const isEmpty = (v) => v === undefined || v === '' || v === null

  async function createDraft() {
    const created = await run(() =>
      createForm(baseUrl, token, projectId, SAFETY_TEMPLATE_ID, {
        name,
        formDate,
        ...(description ? { description } : {}),
      }),
    )
    if (created?.id) setFormId(created.id)
  }

  function buildCustomValues() {
    const out = []
    for (const section of SECTIONS) {
      for (const f of section.fields) {
        if (isEmpty(values[f.fieldId])) continue
        out.push({ fieldId: f.fieldId, [f.valueName]: values[f.fieldId] })
      }
    }
    return out
  }

  function requiredMissing() {
    const out = []
    for (const section of SECTIONS) {
      for (const f of section.fields) {
        if (f.required && isEmpty(values[f.fieldId])) {
          out.push({ fieldId: f.fieldId, section: section.label, label: f.label })
        }
      }
    }
    return out
  }

  async function saveValues() {
    const miss = requiredMissing()
    setMissing(miss)
    if (miss.length > 0) return
    const customValues = buildCustomValues()
    await run(() => batchUpdateValues(baseUrl, token, projectId, formId, { customValues }))
  }

  const customValues = buildCustomValues()
  const requiredCount = SECTIONS.reduce((n, s) => n + s.fields.filter((f) => f.required).length, 0)
  const missingIds = new Set(missing.map((m) => m.fieldId))

  return (
    <Stack spacing={3}>
      {!canCall && (
        <Alert severity="warning">
          Enter an access token and project ID in the <b>Connection</b> box above to enable this form.
        </Alert>
      )}

      <Alert severity="info">
        <AlertTitle>Sectioned form</AlertTitle>
        This template has <code>sequentialSectionCompletion: true</code> and per-section role
        assignees. In Forma's native UI the sections must be completed in order before sign-off.
        Sections are shown below in their official order.
      </Alert>

      {/* Step 1 */}
      <Card variant="outlined">
        <CardHeader
          title="1. Create draft form"
          slotProps={{ title: { variant: 'h6' } }}
          sx={{ pb: 0 }}
        />
        <CardContent>
          <Stack spacing={2}>
            <TextField label="Form name" size="small" fullWidth value={name}
              onChange={(e) => setName(e.target.value)} />
            <TextField label="Form date" type="date" size="small" value={formDate}
              onChange={(e) => setFormDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Description" size="small" fullWidth value={description}
              onChange={(e) => setDescription(e.target.value)} />
            <Button variant="contained" sx={{ alignSelf: 'flex-start' }}
              disabled={!canCall || loading} onClick={createDraft}>
              Create draft form
            </Button>
            <TextField
              label="Form ID" size="small" fullWidth value={formId}
              onChange={(e) => setFormId(e.target.value)}
              helperText="Set automatically after creating — or paste an existing draft's id."
              slotProps={{ htmlInput: { sx: { fontFamily: 'ui-monospace, monospace', fontSize: 13 } } }}
            />
            {formId && <Alert severity="success">Working with form <b>{formId}</b></Alert>}
          </Stack>
        </CardContent>
      </Card>

      {/* Step 2 */}
      <Box>
        <Typography variant="h6" sx={{ mb: 1.5 }}>2. Fill in observations</Typography>
        <Stack spacing={2}>
          {SECTIONS.map((section, i) => {
            const hasRequired = section.fields.some((f) => f.required)
            return (
              <Card key={section.label} variant="outlined">
                <CardHeader
                  avatar={<Chip label={i + 1} color="primary" size="small" />}
                  title={section.label.trim()}
                  slotProps={{ title: { variant: 'subtitle1', fontWeight: 600 } }}
                  action={!hasRequired
                    ? <Chip label="required flags not fetched" size="small" variant="outlined" sx={{ mt: 1, mr: 1 }} />
                    : null}
                  sx={{ bgcolor: 'grey.50' }}
                />
                <Divider />
                <CardContent>
                  <Stack spacing={2.5}>
                    {section.fields.map((f) => (
                      <FieldInput key={f.fieldId} field={f} value={values[f.fieldId]}
                        error={missingIds.has(f.fieldId)} onChange={setField} />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      </Box>

      {/* Step 3 */}
      <Card variant="outlined">
        <CardHeader title="3. Save to Forma" slotProps={{ title: { variant: 'h6' } }} sx={{ pb: 0 }} />
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {customValues.length} field(s) will be sent. <Box component="span" sx={{ color: 'error.main' }}>*</Box> marks
            the {requiredCount} required field(s).
          </Typography>

          {missing.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Fill these required fields before saving</AlertTitle>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {missing.map((m) => (
                  <li key={m.fieldId}>{m.label} <Typography component="span" variant="caption" color="text.secondary">({m.section.trim()})</Typography></li>
                ))}
              </ul>
            </Alert>
          )}

          <Button variant="contained" color="primary"
            disabled={!canCall || !formId || loading || customValues.length === 0}
            onClick={saveValues}>
            Save values to Forma
          </Button>

          <Accordion variant="outlined" sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">Preview payload</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="pre" sx={{ m: 0, fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace' }}>
                {JSON.stringify({ customValues }, null, 2)}
              </Box>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      <ResultPanel loading={loading} error={error} result={result} />
    </Stack>
  )
}

function FieldInput({ field, value, error, onChange }) {
  const { fieldId, label, valueName, options, multiline, required } = field

  if (valueName === 'choiceVal') {
    return (
      <FormControl fullWidth size="small" required={required} error={error}>
        <InputLabel id={`lbl-${fieldId}`}>{label}</InputLabel>
        <Select labelId={`lbl-${fieldId}`} label={label} value={value ?? ''}
          onChange={(e) => onChange(fieldId, e.target.value)}>
          <MenuItem value=""><em>— none —</em></MenuItem>
          {options.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
        </Select>
      </FormControl>
    )
  }

  if (valueName === 'dateVal') {
    return (
      <TextField type="date" label={label} size="small" required={required} error={error}
        value={value ?? ''} onChange={(e) => onChange(fieldId, e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 240 }} />
    )
  }

  if (valueName === 'toggleVal') {
    return (
      <FormControlLabel
        control={<Checkbox checked={value === true} onChange={(e) => onChange(fieldId, e.target.checked)} />}
        label={<>{label}{required && <Box component="span" sx={{ color: 'error.main' }}> *</Box>}</>}
      />
    )
  }

  return (
    <TextField label={label} size="small" fullWidth required={required} error={error}
      multiline={!!multiline} minRows={multiline ? 3 : 1}
      value={value ?? ''} onChange={(e) => onChange(fieldId, e.target.value)} />
  )
}
