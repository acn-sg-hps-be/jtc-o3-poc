import FormWizard from '../components/FormWizard.jsx'
import { SECTIONS, SAFETY_TEMPLATE_ID } from '../safetyFormSchema.js'

// Safety Observation Form module — a thin wrapper over the shared FormWizard.
export default function SafetyObservationForm(props) {
  return (
    <FormWizard
      title="Safety Observation Form"
      defaultName="Safety Observation Form"
      sections={SECTIONS}
      templateId={SAFETY_TEMPLATE_ID}
      {...props}
    />
  )
}
