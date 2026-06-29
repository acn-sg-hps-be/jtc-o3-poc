import { useRef, useState } from 'react'
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
  Dialog,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BlockIcon from '@mui/icons-material/Block'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import { createForm, batchUpdateValues } from '../api/accForms.js'

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

// Reusable step-wizard for any Forms template, driven by a `sections` schema:
//   Form Creation → one step per section → Summary
// Two kinds of branching (Forma has neither natively):
//   • section.conditional { fieldId, equals } — show/skip a single section
//   • section.group + section.discipline — consecutive grouped sections collapse into ONE
//     tabbed phase step; `disciplineDriver` picks which discipline tab is active (others greyed)
// The first step creates the draft; each section auto-saves its populated values on advance.
export default function FormWizard({
  title,
  defaultName,
  sections,
  templateId,
  token,
  projectId,
  baseUrl,
  disciplineDriver,
  groupLabels = {},
  groupConditions = {},
}) {
  const [name, setName] = useState(defaultName || title || 'New form')
  const [formDate, setFormDate] = useState(today)
  const [description, setDescription] = useState('')
  const [formId, setFormId] = useState('')

  const [values, setValues] = useState({})
  const setField = (fieldId, v) => setValues((prev) => ({ ...prev, [fieldId]: v }))

  const [activeStep, setActiveStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [stepError, setStepError] = useState(null)
  // POC-only local photo attachments (preview + filename), keyed by fieldId. Never sent to Forma.
  const [photos, setPhotos] = useState({})

  const canCall = token && projectId

  // Build steps, collapsing consecutive group-tagged sections into one tabbed phase step.
  const steps = (() => {
    const out = [{ key: 'details', label: 'Form Creation' }]
    let i = 0
    while (i < sections.length) {
      const sec = sections[i]
      if (sec.group) {
        const g = sec.group
        const members = []
        while (i < sections.length && sections[i].group === g) { members.push(sections[i]); i++ }
        out.push({ key: 'group:' + g, label: groupLabels[g] || g, group: g, members })
      } else {
        out.push({ key: sec.label, label: sec.label.trim(), section: sec })
        i++
      }
    }
    out.push({ key: 'review', label: 'Summary' })
    return out
  })()
  const lastIndex = steps.length - 1
  const current = steps[activeStep]

  // Which discipline is active, from the Trade-style driver field.
  const activeDiscipline = disciplineDriver
    ? (disciplineDriver.map[values[disciplineDriver.fieldId]] ?? null)
    : null

  // A field can be gated by another field's value (e.g. shown only when Department = CQD).
  const isFieldVisible = (field) =>
    !field.showWhen || values[field.showWhen.fieldId] === field.showWhen.equals
  // A grouped phase can be skipped wholesale by a condition (e.g. Additional Reviewer = Yes).
  const isGroupSkipped = (group) => {
    const c = groupConditions[group]
    return c ? values[c.fieldId] !== c.equals : false
  }

  function isSectionActive(section) {
    if (section.group) return !isGroupSkipped(section.group) && section.discipline === activeDiscipline
    if (section.conditional) return values[section.conditional.fieldId] === section.conditional.equals
    return true
  }
  const isStepSkipped = (i) => {
    const st = steps[i]
    if (st?.group) return isGroupSkipped(st.group)
    if (st?.section?.conditional) return !isSectionActive(st.section)
    return false
  }

  function nextVisible(from) {
    for (let j = from + 1; j <= lastIndex; j++) if (!isStepSkipped(j)) return j
    return lastIndex
  }
  function prevVisible(from) {
    for (let j = from - 1; j >= 0; j--) if (!isStepSkipped(j)) return j
    return 0
  }

  function branchInfoFor(section) {
    const controlled = sections.find(
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
      .filter((f) => isFieldVisible(f) && f.valueName !== 'svgVal' && !isEmpty(values[f.fieldId]))
      .map((f) => ({ fieldId: f.fieldId, [f.valueName]: serializeValue(f, values[f.fieldId]) }))
  }
  function allCustomValues() {
    return sections.filter(isSectionActive).flatMap(sectionCustomValues)
  }

  function handleBack() {
    setStepError(null)
    setActiveStep((s) => prevVisible(s))
  }

  async function saveSectionThenAdvance(section) {
    if (!formId) {
      setStepError('No draft form yet — go back to the Form Creation step first.')
      return
    }
    setBusy(true)
    try {
      if (section) {
        const customValues = sectionCustomValues(section)
        if (customValues.length) {
          await batchUpdateValues(baseUrl, token, projectId, formId, { customValues })
        }
      }
      setActiveStep((s) => nextVisible(s))
    } catch (e) {
      setStepError(fmtError(e))
    } finally {
      setBusy(false)
    }
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
          const created = await createForm(baseUrl, token, projectId, templateId, {
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

    // A grouped phase step saves only the active discipline's section.
    if (current.group) {
      await saveSectionThenAdvance(current.members.find((m) => m.discipline === activeDiscipline))
      return
    }

    if (current.section) {
      await saveSectionThenAdvance(current.section)
    }
  }

  function resetForm() {
    setValues({})
    setFormId('')
    setName(defaultName || title || 'New form')
    setFormDate(today)
    setDescription('')
    setActiveStep(0)
    setStepError(null)
    setPhotos({})
  }

  // Some choice fields filter their options by another field's value (e.g. Systems &
  // Components narrows to the selected Trade's discipline prefix).
  function effectiveOptions(field) {
    if (field.valueName !== 'choiceVal' || !field.filterByField) return field.options
    const driverVal = values[field.filterByField.fieldId]
    const prefix = field.filterByField.prefixes[driverVal]
    // No discipline selected yet → no options to choose from.
    return prefix ? field.options.filter((o) => o.startsWith(prefix)) : []
  }
  function renderFields(section) {
    return section.fields.filter(isFieldVisible).map((f) => (
      <Stack key={f.fieldId} spacing={1}>
        <FieldInput field={f} value={values[f.fieldId]}
          options={effectiveOptions(f)} onChange={setField} />
        {f.attachPhoto && (
          <PhotoAttach
            photo={photos[f.fieldId]}
            onPick={(p) => setPhotos((prev) => ({ ...prev, [f.fieldId]: p }))}
            onRemove={() => setPhotos((prev) => { const n = { ...prev }; delete n[f.fieldId]; return n })}
          />
        )}
      </Stack>
    ))
  }

  function renderBody() {
    if (current.key === 'details') {
      return (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Clicking <b>Create draft &amp; continue</b> creates the draft form in Forma; each section
            is then saved as you advance.
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

    // Grouped phase step — discipline sub-tabs (active one fillable, others greyed).
    if (current.group) {
      const activeMember = current.members.find((m) => m.discipline === activeDiscipline)
      return (
        <Stack spacing={1.5}>
          <Tabs
            value={activeDiscipline ?? false}
            onChange={() => {}}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {current.members.map((m) => {
              const isActive = m.discipline === activeDiscipline
              const icon = isActive
                ? <CheckCircleIcon fontSize="small" color="success" />
                : <BlockIcon fontSize="small" />
              return (
                <Tab key={m.discipline} value={m.discipline} disabled={!isActive}
                  icon={icon} iconPosition="start" label={m.disciplineLabel}
                  sx={{ minHeight: 48, textTransform: 'none' }} />
              )
            })}
          </Tabs>
          {activeMember ? (
            <Stack spacing={2.5} sx={{ pt: 1 }}>{renderFields(activeMember)}</Stack>
          ) : (
            <Alert severity="info">
              Select <b>Trade (Discipline)</b> in <b>Part I</b> to activate the relevant discipline tab.
              The other disciplines stay greyed out for this form.
            </Alert>
          )}
        </Stack>
      )
    }

    if (current.section) {
      const branch = branchInfoFor(current.section)
      return (
        <Stack spacing={2.5}>
          {renderFields(current.section)}
          {branch && (
            <Alert
              severity={!branch.decided ? 'info' : branch.willInclude ? 'warning' : 'success'}
              icon={<CallSplitIcon fontSize="small" />}
            >
              {!branch.decided ? (
                <>Choosing <b>{branch.controlled.conditional.equals}</b> below adds{' '}
                  <b>{branch.controlled.label.trim()}</b>.</>
              ) : branch.willInclude ? (
                <>Next: <b>{branch.controlled.label.trim()}</b>
                  {branch.controlled.conditional.because ? <> (because {branch.controlled.conditional.because})</> : null}.</>
              ) : (
                <><b>{branch.controlled.label.trim()}</b> will be skipped — continuing to the next section.</>
              )}
            </Alert>
          )}
        </Stack>
      )
    }

    // Summary — read-only final look (everything was saved section-by-section already).
    return (
      <Stack spacing={2}>
        <Alert severity="success" variant="outlined">
          Values are saved to Forma as you complete each section
          {formId ? <> (form <b>{formId}</b>)</> : null}. This is a read-only summary — use{' '}
          <b>Back</b> to revisit and edit any section.
        </Alert>
        {sections.map((s) => {
          const inactive = !isSectionActive(s)
          const filled = s.fields.filter((f) => isFieldVisible(f) && f.valueName !== 'svgVal' && !isEmpty(values[f.fieldId]))
          const why = s.group
            ? (isGroupSkipped(s.group) ? ' — skipped (no additional reviewer)' : ' — not applicable for the selected trade')
            : ' — skipped'
          return (
            <Box key={s.label} sx={{ opacity: inactive ? 0.5 : 1 }}>
              <Typography variant="subtitle2">{s.label.trim()}{inactive && why}</Typography>
              {inactive ? null : filled.length === 0 ? (
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
          <Typography variant="h6">{title}</Typography>
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
          const skipped = isStepSkipped(i)
          const stepProps = {}
          const labelProps = {}
          if (skipped) stepProps.completed = false
          if (cond) {
            const decided = !isEmpty(values[cond.fieldId])
            const met = values[cond.fieldId] === cond.equals
            labelProps.optional = (
              <Typography variant="caption" sx={{ fontSize: 10 }}
                color={met ? 'primary' : 'text.secondary'}>
                {!decided ? 'conditional' : met ? 'included' : 'skipped'}
              </Typography>
            )
            labelProps.icon = <CallSplitIcon fontSize="small"
              color={skipped ? 'disabled' : met ? 'primary' : 'action'} />
          } else if (s.group) {
            const discLabel = s.members.find((m) => m.discipline === activeDiscipline)?.disciplineLabel
            const caption = skipped ? 'no additional reviewer' : (discLabel || 'set Trade in Part I')
            labelProps.optional = (
              <Typography variant="caption" sx={{ fontSize: 10 }}
                color={!skipped && discLabel ? 'primary' : 'text.secondary'}>
                {caption}
              </Typography>
            )
            labelProps.icon = <CallSplitIcon fontSize="small"
              color={skipped ? 'disabled' : discLabel ? 'primary' : 'action'} />
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

// POC-only photo attach: shows a local preview + lightbox. NOT uploaded to Forma — real
// photo support needs the Data Management upload + Relationships API (and likely a backend).
function PhotoAttach({ photo, onPick, onRemove }) {
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  return (
    <Box>
      {photo ? (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box component="img" src={photo.dataUrl} alt="" onClick={() => setOpen(true)}
            sx={{
              width: 160, height: 160, objectFit: 'cover', borderRadius: 1.5,
              border: '1px solid', borderColor: 'divider', cursor: 'zoom-in',
            }} />
          <Button size="small" color="inherit" onClick={onRemove}>Remove</Button>
        </Stack>
      ) : (
        <Button size="small" variant="outlined" startIcon={<PhotoCameraOutlinedIcon />}
          onClick={() => inputRef.current?.click()} sx={{ alignSelf: 'flex-start' }}>
          Attach photo
        </Button>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            const reader = new FileReader()
            reader.onload = () => onPick({ name: file.name, dataUrl: reader.result })
            reader.readAsDataURL(file)
          }
          e.target.value = ''
        }} />
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth={false}
        slotProps={{ paper: { sx: { m: 0, bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible' } } }}>
        <Box component="img" src={photo?.dataUrl} alt="" onClick={() => setOpen(false)}
          sx={{ maxWidth: '92vw', maxHeight: '88vh', display: 'block', borderRadius: 1, cursor: 'zoom-out' }} />
      </Dialog>
    </Box>
  )
}

function FieldInput({ field, value, options, onChange }) {
  const { fieldId, label, valueName, multiline, required } = field
  const opts = options ?? field.options

  if (valueName === 'choiceVal') {
    // If the current value isn't in the (possibly filtered) options, show blank to
    // avoid MUI's out-of-range warning when a dependent filter narrows the list.
    const safeValue = opts?.includes(value) ? value : ''
    return (
      <FormControl fullWidth size="small" required={required}>
        <InputLabel id={`lbl-${fieldId}`}>{label}</InputLabel>
        <Select labelId={`lbl-${fieldId}`} label={label} value={safeValue}
          onChange={(e) => onChange(fieldId, e.target.value)}>
          <MenuItem value=""><em>— none —</em></MenuItem>
          {opts.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
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
