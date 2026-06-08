import { useState } from 'react'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { createForm, batchUpdateValues } from '../api/accForms.js'
import { SECTIONS, SAFETY_TEMPLATE_ID } from '../safetyFormSchema.js'

const today = new Date().toISOString().slice(0, 10)
const isEmpty = (v) => v === undefined || v === '' || v === null

// "Part I - Observation" -> "Part I" (labels use either a hyphen or an en/em dash)
const shortLabel = (full) => full.split(/\s[-–—]\s/)[0].trim()

function fmtError(e) {
  const base = e.status ? `${e.message} (status ${e.status})` : e.message
  return e.body ? `${base} — ${JSON.stringify(e.body)}` : base
}

// Custom UI for the "Safety Observation Form" template, presented as a step-by-step
// wizard. Step 1 creates the draft form; each section step auto-saves its values
// (v2 values:batch-update) when you advance; the final step re-saves everything.
export default function SafetyObservationForm({ token, projectId, baseUrl }) {
  const [name, setName] = useState('Safety Observation Form')
  const [formDate, setFormDate] = useState(today)
  const [description, setDescription] = useState('')
  const [formId, setFormId] = useState('')

  const [values, setValues] = useState({})
  const setField = (fieldId, v) => setValues((prev) => ({ ...prev, [fieldId]: v }))

  const [activeStep, setActiveStep] = useState(0)
  const [completed, setCompleted] = useState({})
  const [busy, setBusy] = useState(false)
  const [stepError, setStepError] = useState(null)
  const [missingIds, setMissingIds] = useState(new Set())
  const [finished, setFinished] = useState(false)

  const canCall = token && projectId

  const steps = [
    { key: 'details', label: 'Details' },
    ...SECTIONS.map((s) => ({ key: s.label, label: shortLabel(s.label), section: s })),
    { key: 'review', label: 'Review' },
  ]
  const lastIndex = steps.length - 1
  const current = steps[activeStep]

  function missingInSection(section) {
    return section.fields.filter((f) => f.required && isEmpty(values[f.fieldId]))
  }
  function sectionCustomValues(section) {
    return section.fields
      .filter((f) => !isEmpty(values[f.fieldId]))
      .map((f) => ({ fieldId: f.fieldId, [f.valueName]: values[f.fieldId] }))
  }
  function allCustomValues() {
    return SECTIONS.flatMap(sectionCustomValues)
  }

  function advance() {
    setCompleted((c) => ({ ...c, [activeStep]: true }))
    setActiveStep((s) => Math.min(s + 1, lastIndex))
  }

  function handleBack() {
    setStepError(null)
    setMissingIds(new Set())
    setActiveStep((s) => Math.max(0, s - 1))
  }

  async function handleNext() {
    setStepError(null)

    // Step 1 — create the draft form, then advance.
    if (current.key === 'details') {
      if (isEmpty(name) || isEmpty(formDate)) {
        setStepError('Form name and date are required.')
        return
      }
      setBusy(true)
      try {
        if (!formId) {
          const created = await createForm(baseUrl, token, projectId, SAFETY_TEMPLATE_ID, {
            name,
            formDate,
            ...(description ? { description } : {}),
          })
          setFormId(created?.id || '')
        }
        advance()
      } catch (e) {
        setStepError(fmtError(e))
      } finally {
        setBusy(false)
      }
      return
    }

    // Section step — validate required fields, then auto-save this section's values.
    if (current.section) {
      const miss = missingInSection(current.section)
      if (miss.length) {
        setMissingIds(new Set(miss.map((m) => m.fieldId)))
        setStepError(`Please fill the required field(s): ${miss.map((m) => m.label).join(', ')}`)
        return
      }
      setMissingIds(new Set())
      if (!formId) {
        setStepError('No draft form yet — go back to the Details step first.')
        return
      }
      setBusy(true)
      try {
        const customValues = sectionCustomValues(current.section)
        if (customValues.length) {
          await batchUpdateValues(baseUrl, token, projectId, formId, { customValues })
        }
        advance()
      } catch (e) {
        setStepError(fmtError(e))
      } finally {
        setBusy(false)
      }
      return
    }

    // Review step — final safety re-save of everything.
    setBusy(true)
    try {
      const customValues = allCustomValues()
      if (customValues.length) {
        await batchUpdateValues(baseUrl, token, projectId, formId, { customValues })
      }
      setCompleted((c) => ({ ...c, [activeStep]: true }))
      setFinished(true)
    } catch (e) {
      setStepError(fmtError(e))
    } finally {
      setBusy(false)
    }
  }

  function resetForm() {
    setValues({})
    setFormId('')
    setName('Safety Observation Form')
    setFormDate(today)
    setDescription('')
    setActiveStep(0)
    setCompleted({})
    setFinished(false)
    setStepError(null)
    setMissingIds(new Set())
  }

  const nextLabel =
    current.key === 'details' ? 'Create draft & continue'
    : current.key === 'review' ? 'Finish & save'
    : 'Save & next'

  return (
    <Stack spacing={3}>
      {!canCall && (
        <Alert severity="warning">
          No <b>Project ID</b> is set. Add one under the <b>API Tester</b> module's Connection
          settings to enable this form.
        </Alert>
      )}

      <Box>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
          <Typography variant="h6">Safety Observation Form</Typography>
          {formId && <Chip size="small" color="success" variant="outlined" label={`Draft: ${formId}`} />}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Complete each section in order. Values are saved to Forma as you advance.
        </Typography>
      </Box>

      {/* Horizontal step navigation */}
      <Box sx={{ overflowX: 'auto', py: 1 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ minWidth: 640 }}>
          {steps.map((s, i) => (
            <Step key={s.key} completed={!!completed[i]}>
              <StepLabel>{s.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Card variant="outlined">
        <CardContent>
          {finished ? (
            <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6">All sections saved</Typography>
              </Stack>
              <Alert severity="success" sx={{ width: '100%' }}>
                Form <b>{formId}</b> has been saved with {allCustomValues().length} field value(s).
              </Alert>
              <Button variant="outlined" onClick={resetForm}>Start a new form</Button>
            </Stack>
          ) : current.key === 'details' ? (
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Form details</Typography>
              <TextField label="Form name" size="small" fullWidth required value={name}
                onChange={(e) => setName(e.target.value)} />
              <TextField label="Form date" type="date" size="small" required value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 240 }} />
              <TextField label="Description" size="small" fullWidth value={description}
                onChange={(e) => setDescription(e.target.value)} />
              <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: 13 } }}>
                Clicking <b>Create draft &amp; continue</b> creates the draft form in Forma. This
                template uses <code>sequentialSectionCompletion</code> + per-section assignees, so
                section saves may be rejected if a section isn't editable by you.
              </Alert>
            </Stack>
          ) : current.section ? (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {current.section.label.trim()}
                </Typography>
                {!current.section.fields.some((f) => f.required) && (
                  <Typography variant="caption" color="text.secondary">
                    Required flags not fetched for this section — all fields optional.
                  </Typography>
                )}
              </Box>
              <Divider />
              {current.section.fields.map((f) => (
                <FieldInput key={f.fieldId} field={f} value={values[f.fieldId]}
                  error={missingIds.has(f.fieldId)} onChange={setField} />
              ))}
            </Stack>
          ) : (
            // Review
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Review</Typography>
              <Typography variant="body2" color="text.secondary">
                {allCustomValues().length} field value(s) will be saved to form <b>{formId}</b>.
              </Typography>
              {SECTIONS.map((s) => {
                const filled = s.fields.filter((f) => !isEmpty(values[f.fieldId]))
                return (
                  <Box key={s.label}>
                    <Typography variant="subtitle2">{s.label.trim()}</Typography>
                    {filled.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">— no values —</Typography>
                    ) : (
                      <Box component="ul" sx={{ m: 0, pl: 3 }}>
                        {filled.map((f) => (
                          <li key={f.fieldId}>
                            <Typography variant="body2" component="span">
                              <b>{f.label}:</b> {String(values[f.fieldId])}
                            </Typography>
                          </li>
                        ))}
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Stack>
          )}

          {stepError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <AlertTitle>Couldn’t save this step</AlertTitle>
              {stepError}
            </Alert>
          )}
        </CardContent>
      </Card>

      {!finished && (
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
          <Button disabled={activeStep === 0 || busy} onClick={handleBack}>Back</Button>
          <Button
            variant="contained"
            disabled={!canCall || busy}
            onClick={handleNext}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {nextLabel}
          </Button>
        </Stack>
      )}
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
