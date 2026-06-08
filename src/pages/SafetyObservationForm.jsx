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
import CallSplitIcon from '@mui/icons-material/CallSplit'
import { createForm, batchUpdateValues } from '../api/accForms.js'
import { SECTIONS, SAFETY_TEMPLATE_ID } from '../safetyFormSchema.js'

const today = new Date().toISOString().slice(0, 10)
const isEmpty = (v) => v === undefined || v === '' || v === null

// The Forms API expects every customValue to be a STRING, even toggles.
function serializeValue(field, raw) {
  if (field.valueName === 'toggleVal') return raw === true ? 'Yes' : 'No'
  return raw
}
function fmtError(e) {
  const base = e.status ? `${e.message} (status ${e.status})` : e.message
  return e.body ? `${base} — ${JSON.stringify(e.body)}` : base
}

// Custom UI for the "Safety Observation Form" template — a horizontal step wizard with
// conditional branching (Forma itself has no branching):
//   Form Creation → Part I … Part III → [Part IIIa, only if QP review required] → Part IV → Review
// The first step creates the draft; each section auto-saves its (populated) values when
// you advance. Required fields are indicative only — sections can be left blank/partial.
export default function SafetyObservationForm({ token, projectId, baseUrl }) {
  const [name, setName] = useState('Safety Observation Form')
  const [formDate, setFormDate] = useState(today)
  const [description, setDescription] = useState('')
  const [formId, setFormId] = useState('')

  const [values, setValues] = useState({})
  const setField = (fieldId, v) => setValues((prev) => ({ ...prev, [fieldId]: v }))

  const [activeStep, setActiveStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [stepError, setStepError] = useState(null)

  const canCall = token && projectId

  const steps = [
    { key: 'details', label: 'Form Creation' },
    ...SECTIONS.map((s) => ({ key: s.label, label: s.label.trim(), section: s })),
    { key: 'review', label: 'Review' },
  ]
  const lastIndex = steps.length - 1
  const current = steps[activeStep]

  const isSectionSkipped = (section) =>
    !!section?.conditional && values[section.conditional.fieldId] !== section.conditional.equals
  const isStepSkipped = (i) => isSectionSkipped(steps[i]?.section)

  function nextVisible(from) {
    for (let j = from + 1; j <= lastIndex; j++) if (!isStepSkipped(j)) return j
    return lastIndex
  }
  function prevVisible(from) {
    for (let j = from - 1; j >= 0; j--) if (!isStepSkipped(j)) return j
    return 0
  }

  function branchInfoFor(section) {
    const controlled = SECTIONS.find(
      (s) => s.conditional && section.fields.some((f) => f.fieldId === s.conditional.fieldId),
    )
    if (!controlled) return null
    const decided = !isEmpty(values[controlled.conditional.fieldId])
    const willInclude = values[controlled.conditional.fieldId] === controlled.conditional.equals
    return { controlled, decided, willInclude }
  }

  // Only populated, sendable fields are included (svgVal/signature is never sent).
  function sectionCustomValues(section) {
    return section.fields
      .filter((f) => f.valueName !== 'svgVal' && !isEmpty(values[f.fieldId]))
      .map((f) => ({ fieldId: f.fieldId, [f.valueName]: serializeValue(f, values[f.fieldId]) }))
  }
  function allCustomValues() {
    return SECTIONS.filter((s) => !isSectionSkipped(s)).flatMap(sectionCustomValues)
  }

  function handleBack() {
    setStepError(null)
    setActiveStep((s) => prevVisible(s))
  }

  async function handleNext() {
    setStepError(null)

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
        setActiveStep((s) => nextVisible(s))
      } catch (e) {
        setStepError(fmtError(e))
      } finally {
        setBusy(false)
      }
      return
    }

    if (current.section) {
      if (!formId) {
        setStepError('No draft form yet — go back to the Form Creation step first.')
        return
      }
      setBusy(true)
      try {
        const customValues = sectionCustomValues(current.section)
        if (customValues.length) {
          await batchUpdateValues(baseUrl, token, projectId, formId, { customValues })
        }
        setActiveStep((s) => nextVisible(s))
      } catch (e) {
        setStepError(fmtError(e))
      } finally {
        setBusy(false)
      }
    }
  }

  function resetForm() {
    setValues({})
    setFormId('')
    setName('Safety Observation Form')
    setFormDate(today)
    setDescription('')
    setActiveStep(0)
    setStepError(null)
  }

  function renderBody() {
    if (current.key === 'details') {
      return (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Creates the draft form in Forma. This template uses <code>sequentialSectionCompletion</code>
            {' '}+ per-section assignees, so section saves may be rejected if a section isn’t editable by you.
          </Typography>
          <TextField label="Form name" size="small" fullWidth required value={name}
            onChange={(e) => setName(e.target.value)} />
          <TextField label="Form date" type="date" size="small" required value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 240 }} />
          <TextField label="Description" size="small" fullWidth value={description}
            onChange={(e) => setDescription(e.target.value)} />
        </Stack>
      )
    }

    if (current.section) {
      const branch = branchInfoFor(current.section)
      return (
        <Stack spacing={2.5}>
          {current.section.fields.map((f) => (
            <FieldInput key={f.fieldId} field={f} value={values[f.fieldId]} onChange={setField} />
          ))}
          {branch && (
            <Alert
              severity={!branch.decided ? 'info' : branch.willInclude ? 'warning' : 'success'}
              icon={<CallSplitIcon fontSize="small" />}
            >
              {!branch.decided ? (
                <>Choosing <b>{branch.controlled.conditional.equals}</b> below adds{' '}
                  <b>{branch.controlled.label.trim()}</b>.</>
              ) : branch.willInclude ? (
                <>Next: <b>{branch.controlled.label.trim()}</b> (because {branch.controlled.conditional.because}).</>
              ) : (
                <><b>{branch.controlled.label.trim()}</b> will be skipped — continuing to the next section.</>
              )}
            </Alert>
          )}
        </Stack>
      )
    }

    // Review — read-only final look (everything was saved section-by-section already).
    return (
      <Stack spacing={2}>
        <Alert severity="success" variant="outlined">
          Values are saved to Forma as you complete each section
          {formId ? <> (form <b>{formId}</b>)</> : null}. This is a read-only summary — use{' '}
          <b>Back</b> to revisit and edit any section.
        </Alert>
        {SECTIONS.map((s) => {
          const skipped = isSectionSkipped(s)
          const filled = s.fields.filter((f) => f.valueName !== 'svgVal' && !isEmpty(values[f.fieldId]))
          return (
            <Box key={s.label} sx={{ opacity: skipped ? 0.5 : 1 }}>
              <Typography variant="subtitle2">{s.label.trim()}{skipped && ' — skipped'}</Typography>
              {skipped ? null : filled.length === 0 ? (
                <Typography variant="body2" color="text.secondary">— no values —</Typography>
              ) : (
                <Box component="ul" sx={{ m: 0, pl: 3 }}>
                  {filled.map((f) => (
                    <li key={f.fieldId}>
                      <Typography variant="body2" component="span">
                        <b>{f.label}:</b> {String(serializeValue(f, values[f.fieldId]))}
                      </Typography>
                    </li>
                  ))}
                </Box>
              )}
            </Box>
          )
        })}
      </Stack>
    )
  }

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
          Complete each section in order. Values are saved to Forma as you advance; you can go back
          to edit any earlier section. <Box component="span" sx={{ color: 'error.main' }}>*</Box> marks
          fields that are required in Forma (not enforced here).
        </Typography>
      </Box>

      {/* Horizontal workflow overview — alternativeLabel + no minWidth so it fits without scrolling */}
      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{
          '& .MuiStepLabel-label': { fontSize: 11, lineHeight: 1.25, mt: 0.5 },
          '& .MuiStepLabel-label.Mui-active': { fontWeight: 700 },
          '& .MuiStep-root': { px: 0.5 },
        }}
      >
        {steps.map((s, i) => {
          const cond = s.section?.conditional
          const stepProps = {}
          const labelProps = {}
          if (cond) {
            const decided = !isEmpty(values[cond.fieldId])
            const met = values[cond.fieldId] === cond.equals
            if (isStepSkipped(i)) stepProps.completed = false
            labelProps.optional = (
              <Typography variant="caption" sx={{ fontSize: 10 }}
                color={met ? 'primary' : 'text.secondary'}>
                {!decided ? 'if QP review required' : met ? 'QP review required' : 'skipped'}
              </Typography>
            )
            labelProps.icon = <CallSplitIcon fontSize="small"
              color={isStepSkipped(i) ? 'disabled' : met ? 'primary' : 'action'} />
          }
          return (
            <Step key={s.key} {...stepProps} sx={isStepSkipped(i) ? { opacity: 0.5 } : undefined}>
              <StepLabel {...labelProps}>{s.label}</StepLabel>
            </Step>
          )
        })}
      </Stepper>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>{current.label}</Typography>

          {renderBody()}

          {stepError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <AlertTitle>Couldn’t save this step</AlertTitle>
              {stepError}
            </Alert>
          )}

          <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
            <Button disabled={activeStep === 0 || busy} onClick={handleBack}>Back</Button>
            {current.key === 'review' ? (
              <Button variant="outlined" onClick={resetForm}>Start a new form</Button>
            ) : (
              <Button variant="contained" disabled={!canCall || busy} onClick={handleNext}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}>
                {current.key === 'details' ? 'Create draft & continue' : 'Save & next'}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

function FieldInput({ field, value, onChange }) {
  const { fieldId, label, valueName, options, multiline, required } = field

  if (valueName === 'choiceVal') {
    return (
      <FormControl fullWidth size="small" required={required}>
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
      <TextField type="date" label={label} size="small" required={required}
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

  if (valueName === 'svgVal') {
    return (
      <TextField label={label} size="small" fullWidth disabled
        placeholder="Signature capture isn’t supported in this POC"
        helperText="Signature fields can’t be filled here — left blank (not sent)." />
    )
  }

  return (
    <TextField label={label} size="small" fullWidth required={required}
      multiline={!!multiline} minRows={multiline ? 3 : 1}
      value={value ?? ''} onChange={(e) => onChange(fieldId, e.target.value)} />
  )
}
