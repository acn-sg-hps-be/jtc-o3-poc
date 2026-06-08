// Schema for the "Safety Observation Form" template, derived from a real form
// instance returned by the ACC Forms API.
//
// We address every field by its stable `fieldId` (not the label), so trailing
// spaces / punctuation in the original labels don't matter for the API.
//
// `valueName` is the typed key the API expects in the batch-update payload:
//   textVal   -> string
//   choiceVal -> one of `options` (string)
//   dateVal   -> "YYYY-MM-DD"
//   toggleVal -> boolean

export const SAFETY_TEMPLATE_ID = '73f54188-74a6-4a3b-af49-b851030f6cbd'

export const SECTIONS = [
  {
    label: 'Part I - Observation',
    // Field defs verified against GET sections (isRequired + presets are authoritative).
    fields: [
      { fieldId: 'da21a3ca-b386-4977-8f6f-6eba2c4e2c10', label: 'Inspection Category', valueName: 'choiceVal', required: true, options: ['Assessment Regime (For WSD Only)', 'Observation Regime'] },
      { fieldId: '979cf6c5-6b13-4c85-9b61-c533e8ec98da', label: 'Inspection Type', valueName: 'choiceVal', required: true, options: ['Physical', 'Drone', '360 Camera', 'CCTV'] },
      { fieldId: '4b8741d6-228d-4da9-9dca-b47965860609', label: 'Inspection Date', valueName: 'dateVal', required: true },
      { fieldId: '5a37f393-b9bc-42e4-ba15-a6ec6e7053a4', label: 'Location', valueName: 'textVal', required: true },
      { fieldId: '732abe98-5886-4ac1-93f9-582706e91391', label: 'Description of Observation', valueName: 'textVal', required: true, multiline: true },
      { fieldId: '629426f9-b7e1-473a-9aed-d49e46eb4392', label: 'JTC SWO Recommendation', valueName: 'choiceVal', required: true, options: ['Recommended', 'N.A.'] },
    ],
  },
  {
    label: "Part II - Contractor's Response to Observation",
    fields: [
      { fieldId: '16807a5a-fcbc-4be8-aad6-b58c37776992', label: 'Rectification Date', valueName: 'dateVal' },
      { fieldId: '583171e7-3708-4169-97e8-3bf836b71184', label: 'Contractor Held Responsible for this Observation', valueName: 'textVal' },
      { fieldId: '7774b710-7387-4ac2-8c17-c4f9e9f5baf3', label: 'Description of Rectification', valueName: 'textVal', multiline: true },
      { fieldId: '7e7b2ffd-3f0b-4696-9c6f-fa41b81411ed', label: 'Supporting Documents', valueName: 'toggleVal' },
      { fieldId: '0e675ea9-46af-4b18-9221-a23cf13f60d6', label: "Contractor's Details", valueName: 'textVal' },
    ],
  },
  {
    label: 'Part III – RE/RTO Verification',
    fields: [
      { fieldId: 'f83a52a1-5b81-458e-9df0-1a08f3545295', label: 'Have the contractor’s works been satisfactorily completed?', valueName: 'choiceVal', options: ['Yes', 'No'] },
      { fieldId: '68bd8313-08a1-411d-8a07-5373770450c7', label: 'Is a Qualified Person (QP) review required?', valueName: 'choiceVal', options: ['Yes', 'No'] },
      { fieldId: 'c3c9ae7a-1bd3-4390-bce1-b05d2d1077b6', label: 'RE/RTO Details', valueName: 'textVal' },
    ],
  },
  {
    label: 'Part IIIa – QP Approval',
    fields: [
      { fieldId: '6bd6af87-a2d8-4eab-a616-f2065f855668', label: "Have the contractor's works been satisfactorily completed?", valueName: 'choiceVal', options: ['Yes', 'No', 'Answer 3'] },
      { fieldId: 'cd86dba7-e503-4c47-a200-958f7da5db54', label: "QP's Details", valueName: 'textVal' },
    ],
  },
  {
    label: 'Part IV - SO/ SO Rep Acknowledgement',
    fields: [
      { fieldId: '67ae6d09-90e4-4740-842e-e13e63c9359c', label: "SO/ SO Rep's Acknowledgement", valueName: 'choiceVal', options: ['Yes'] },
      { fieldId: '82ece583-30c9-41f6-b7e3-ead5d8de14f6', label: 'Comments on verification of works', valueName: 'textVal', multiline: true },
      { fieldId: 'eb8fcff8-e577-4edb-bb6d-18f39483bff1', label: "SO/ SO Rep's Details", valueName: 'textVal' },
    ],
  },
]
