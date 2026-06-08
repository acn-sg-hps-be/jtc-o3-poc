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
import CallSplitIcon from '@mui/icons-material/CallSplit'
import { createForm, batchUpdateValues } from '../api/accForms.js'
import { SECTIONS, SAFETY_TEMPLATE_ID } from '../safetyFormSchema.js'

const today = new Date().toISOString().slice(0, 10)
const isEmpty = (v) => v === undefined || v === '' || v === null

function fmtError(e) {
  const base = e.status ? `${e.message} (status ${e.status})` : e.message
  return e.body ? `${base} — ${JSON.stringify(e.body)}` : base
}

// Custom UI for the "Safety Observation Form" template, presented as a step-by-step
// wizard with conditional branching (Forma itself has no branching):
//   Details → Part I → Part II → Part III → [Part IIIa, only if QP review required] → Part IV → Review
// The Details step creates the draft form; each section step auto-saves its values
// (v2 values:batch-update) when you advance; the final step re-saves everything.
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
  const [missingIds, setMissingIds] = useState(new Set())
  const [finished, setFinished] = useState(false)

  const canCall = token && projectId

  const steps = [
    { key: 'details', label: 'Details' },
    ...SECTIONS.map((s) => ({ key: s.label, label: s.label.trim(), section: s })),
    { key: 'review', label: 'Review' },
  ]
  const lastIndex = steps.length - 1
  const current = steps[activeStep]

  // --- Branching helpers -------------------------------------------------
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

  // If the current section controls a conditional (branching) section, describe the branch.
  function branchInfo() {
    if (!current.section) return null
    const controlled = SECTIONS.find(
      (s) => s.conditional && current.section.fields.some((f) => f.fieldId === s.conditional.fieldId),
    )
    if (!controlled) return null
    const decided = !isEmpty(values[controlled.conditional.fieldId])
    const willInclude = values[controlled.conditional.fieldId] === controlled.conditional.equals
    return { controlled, decided, willInclude }
  }

  function missingInSection(section) {
    return section.fields.filter((f) => f.required && isEmpty(values[f.fieldId]))
  }
  function sectionCustomValues(section) {
    return section.fields
      .filter((f) => !isEmpty(values[f.fieldId]))
      .map((f) => ({ fieldId: f.fieldId, [f.valueName]: values[f.fieldId] }))
  }
  // Final save excludes any branch that was skipped.
  function allCustomValues() {
    return SECTIONS.filter((s) => !isSectionSkipped(s)).flatMap(sectionCustomValues)
  }

  function handleBack() {
    setStepError(null)
    setMissingIds(new Set())
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
        setActiveStep((s) => nextVisible(s))
      } catch (e) {
        setStepError(fmtError(e))
      } finally {
        setBusy(false)
      }
      return
    }

    // Review — final safety re-save of everything (skipped branches excluded).
    setBusy(true)
    try {
      const customValues = allCustomValues()
      if (customValues.length) {
        await batchUpdateValues(baseUrl, token, projectId, formId, { customValues })
      }
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
    setFinished(false)
    setStepError(null)
    setMissingIds(new Set())
  }

  const nextLabel =
    current.key === 'details' ? 'Create draft & continue'
    : current.key === 'review' ? 'Finish & save'
    : 'Save & next'

  const branch = branchInfo()

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

      {/* Horizontal step navigation with full section names + conditional branch */}
      <Box sx={{ overflowX: 'auto', py: 1 }}>
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            minWidth: 860,
            '& .MuiStepLabel-label': { fontSize: 11, lineHeight: 1.25, mt: 0.5 },
            '& .MuiStepLabel-label.Mui-active': { fontWeight: 700 },
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
                  {!decided ? 'if QP required' : met ? 'QP required' : 'skipped'}
                </Typography>
              )
              labelProps.icon = <CallSplitIcon fontSize="small"
                color={isStepSkipped(i) ? 'disabled' : met ? 'primary' : 'action'} />
            }
            return (
              <Step key={s.key} {...stepProps}
                sx={isStepSkipped(i) ? { opacity: 0.45 } : undefined}>
                <StepLabel {...labelProps}>{s.label}</StepLabel>
              </Step>
            )
          })}
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

              {branch && (
                <Alert
                  severity={!branch.decided ? 'info' : branch.willInclude ? 'warning' : 'success'}
                  icon={<CallSplitIcon fontSize="small" />}
                >
                  {!branch.decided ? (
                    <>Answer “{questionLabel(branch)}” to set the path — choosing{' '}
                      <b>{branch.controlled.conditional.equals}</b> adds{' '}
                      <b>{branch.controlled.label.trim()}</b>.</>
                  ) : branch.willInclude ? (
                    <>Next: <b>{branch.controlled.label.trim()}</b> (because {branch.controlled.conditional.because}).</>
                  ) : (
                    <><b>{branch.controlled.label.trim()}</b> will be skipped — continuing to the next section.</>
                  )}
                </Alert>
              )}
            </Stack>
          ) : (
            // Review
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Review</Typography>
              <Typography variant="body2" color="text.secondary">
                {allCustomValues().length} field value(s) will be saved to form <b>{formId}</b>.
              </Typography>
              {SECTIONS.map((s) => {
                const skipped = isSectionSkipped(s)
                const filled = s.fields.filter((f) => !isEmpty(values[f.fieldId]))
                return (
                  <Box key={s.label} sx={{ opacity: skipped ? 0.5 : 1 }}>
                    <Typography variant="subtitle2">
                      {s.label.trim()}{skipped && ' — skipped'}
                    </Typography>
                    {skipped ? null : filled.length === 0 ? (
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

// The label of the controlling (branching) question, for the in-step hint.
function questionLabel(branch) {
  const f = SECTIONS.flatMap((s) => s.fields).find(
    (x) => x.fieldId === branch.controlled.conditional.fieldId,
  )
  return f ? f.label.trim() : 'the branching question'
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
