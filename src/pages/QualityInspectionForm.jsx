import FormWizard from '../components/FormWizard.jsx'
import {
  SECTIONS,
  QUALITY_TEMPLATE_ID,
  DISCIPLINE_DRIVER,
  GROUP_LABELS,
  GROUP_CONDITIONS,
} from '../qualityInspectionFormSchema.js'

// Quality Defects Inspection module — uses the shared FormWizard with discipline
// grouping: Part II(a–d) and Part V(a–d) collapse into tabbed phase steps driven
// by Part I's "Trade (Discipline)".
export default function QualityInspectionForm(props) {
  return (
    <FormWizard
      title="Quality Defects Inspection"
      defaultName="Quality Defects Inspection"
      sections={SECTIONS}
      templateId={QUALITY_TEMPLATE_ID}
      disciplineDriver={DISCIPLINE_DRIVER}
      groupLabels={GROUP_LABELS}
      groupConditions={GROUP_CONDITIONS}
      {...props}
    />
  )
}
