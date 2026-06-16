// AUTO-DERIVED from GET section responses (project ddcae968…, layout 28a0cf02…),
// then augmented with discipline-group metadata for the parallel Review/Acknowledgement phases.
// "Quality Defects Inspection" template. fieldId = each section item's `schema` value.
// valueName: textVal | choiceVal | dateVal | toggleVal | svgVal.

export const QUALITY_TEMPLATE_ID = "e39ba83b-a8e0-46db-a50f-8d5f09fb59ad"

// Part I "Trade (Discipline)" drives which discipline section is active in each phase.
// Map keys are the exact preset values (note the trailing space on "Electrical ").
export const DISCIPLINE_DRIVER = {
  fieldId: "20f30e4f-fefd-467c-b753-a94bb602a6d3",
  map: {
    "Architecture/Landscape": "a",
    "Structural": "b",
    "Mechanical": "c",
    "Electrical ": "d",
  },
}

export const GROUP_LABELS = {
  review: "Part II — SO Rep & Discipline Assistant Reviews",
  acknowledgement: "Part V — SO Rep & Discipline Assistant Acknowledgements",
}

// "Systems & Components" options are prefixed by discipline; filter them by the Trade value.
const SYSTEMS_FILTER = {
  fieldId: DISCIPLINE_DRIVER.fieldId,
  prefixes: {
    "Architecture/Landscape": "Arch",
    "Structural": "C&S",
    "Mechanical": "Mech",
    "Electrical ": "Elec",
  },
}

// Part I "Department" = "CQD/Others" reveals the two gated fields below (hidden for NOD/FMC).
const DEPARTMENT_GATE = { fieldId: "da2d2529-3f4f-41ac-ac17-c79341c02e1d", equals: "CQD/Others" }

// The discipline phases (Part II review, Part V acknowledgement) only apply when
// "Additional Reviewer Required?" is Yes (the toggle is on).
export const GROUP_CONDITIONS = {
  review: { fieldId: "d4cc1592-89ad-45c6-9228-a5aaa2599173", equals: true },
  acknowledgement: { fieldId: "d4cc1592-89ad-45c6-9228-a5aaa2599173", equals: true },
}

export const SECTIONS = [
  {
    label: "Part I - Lodging of Quality/ Defect Inspection Form",
    fields: [
      { fieldId: "da2d2529-3f4f-41ac-ac17-c79341c02e1d", label: "Department", valueName: "choiceVal", options: ["CQD/Others", "NOD/FMC"] },
      { fieldId: "d4cc1592-89ad-45c6-9228-a5aaa2599173", label: "Additional Reviewer Required?", valueName: "toggleVal", showWhen: DEPARTMENT_GATE },
      { fieldId: "20f30e4f-fefd-467c-b753-a94bb602a6d3", label: "Trade (Discipline)", valueName: "choiceVal", options: ["Architecture/Landscape", "Electrical ", "Mechanical", "Structural"], showWhen: DEPARTMENT_GATE },
      { fieldId: "07c1398a-e1bb-4b66-b633-20891c007204", label: "Date of Inspection", valueName: "dateVal" },
      { fieldId: "8ba05efc-a9af-4299-bddc-c81c58453750", label: "Type of Quality Observation", valueName: "choiceVal", options: ["Red Flag", "Quality Observation", "In Order", "Recurring", "Red Flag & Recurring", "Outstanding", "Good Practise"] },
      { fieldId: "26be03e3-1a95-43f5-b016-58046b310dad", label: "Location of Observation", valueName: "textVal", multiline: true },
      { fieldId: "5415413c-53ca-4f37-b470-98d6a664f8ae", label: "Systems & Components", valueName: "choiceVal", options: ["Arch - Door", "Arch - Floor", "Arch - Dry Wall Partition", "C&S - ERSS", "C&S - False Works", "C&S - Steel Works", "Mech - Improper Drainage System", "Mech - Slope Movement Failure"], filterByField: SYSTEMS_FILTER },
      { fieldId: "636c6cf8-f642-4374-8682-d6986cb7768a", label: "Type of Inspection Check", valueName: "choiceVal", options: ["A – Document Inspection ", "B – Work-in-Progression Inspection ", "C – Completed Works Inspection  "] },
      { fieldId: "319c24d4-31be-4cfb-ad4a-1fd5c43e4199", label: "Quality Inspection Check Item", valueName: "choiceVal", options: ["Mech - Chiller", "Mech - Fan Coil Unit", "FPS - Automatic Fire Alarm System", "FPS - Automatic Fire Sprinkler System", "Plumbing - Bulk Meter", "Plumbing - U/G Pipe Installation", "Elec - High Voltage Powe Cable", "Elec - High Voltage Main Switchboard", "ELV - Structured Cabling System", "ELV - Building Safety System"] },
      { fieldId: "1ff997c7-8c98-4579-8d35-a2b9be3c94f5", label: "Observation & Comments", valueName: "textVal", multiline: true },
      { fieldId: "bd9538b7-4e0a-48d8-a828-f0e3c07c7011", label: "Recommendations and Remarks, where required", valueName: "textVal", multiline: true },
      { fieldId: "230793bf-e2be-4b1f-8a2d-188dc544d2e2", label: "Due Date for Inspection Closure", valueName: "dateVal" },
      { fieldId: "51205b28-346f-4076-9249-8f9274b1960f", label: "Observation Image", valueName: "toggleVal" },
      { fieldId: "614b4129-f5d0-499e-8393-2add10299ada", label: "Does Additional reviewer concur with lodged form?", valueName: "toggleVal" },
    ],
  },
  {
    label: "Part II (a) - SO/ SO Rep Review",
    group: "review", discipline: "a", disciplineLabel: "Architecture",
    fields: [
      { fieldId: "ecded7a2-7e32-4060-bb28-8e1084ca3abd", label: "Are there any time or cost implications?", valueName: "toggleVal" },
      { fieldId: "845deed2-118c-48e8-a109-1b1cd71ee8c2", label: "Classification of Finding", valueName: "choiceVal", options: ["Design", "Construction"] },
      { fieldId: "b6d70d7d-d0b2-45c0-9d84-c324ad4610e1", label: "Severity", valueName: "choiceVal", options: ["Major", "Minor", "NA"] },
      { fieldId: "f9b78650-c4b0-44a4-8461-34afdb2a4d61", label: "SO Recommendations and Remarks", valueName: "toggleVal" },
      { fieldId: "df05fdbc-42f9-4b5d-b612-31927243edea", label: "SO/ SO Rep (Architecture) Details", valueName: "textVal", multiline: true },
      { fieldId: "eb24889f-303c-4053-86a2-a18a05a38e07", label: "Signature", valueName: "svgVal" },
    ],
  },
  {
    label: "Part II (b) - SO Rep Assistant (Civil & Structural) Review",
    group: "review", discipline: "b", disciplineLabel: "Civil & Structural",
    fields: [
      { fieldId: "b0e8b19a-4823-4aa4-b6a6-c44a0b5770fa", label: "Are there any time or cost implications?", valueName: "toggleVal" },
      { fieldId: "88d5a064-8e41-4675-bca1-5fec295112c9", label: "Classification of Findings", valueName: "choiceVal", options: ["Design", "Construction"] },
      { fieldId: "101e4cde-7661-4d12-9436-b1348687769e", label: "Severity", valueName: "choiceVal", options: ["Major", "Minor", "NA"] },
      { fieldId: "8d967ead-3aaa-4f27-894a-60c3a25c6e7e", label: "SO Rep Assistant (Civil & Structural) Recommendations and Remark", valueName: "textVal", multiline: true },
      { fieldId: "f4415968-c851-4ff2-8f32-39b99ad70e6e", label: "SO Rep Assistant (Civil & Structural) Detail", valueName: "textVal", multiline: true },
      { fieldId: "5938c6ce-8a56-4719-81b6-9ca06a95b575", label: "Signature", valueName: "svgVal" },
    ],
  },
  {
    label: "Part II (c) - SO Rep Assistant (Mechanical) Review",
    group: "review", discipline: "c", disciplineLabel: "Mechanical",
    fields: [
      { fieldId: "477c0b6b-97b3-4d95-a20e-1864b7b62460", label: "Are there any time or cost implications?", valueName: "toggleVal" },
      { fieldId: "fc5213c6-03c2-4520-9a39-f0486e649c47", label: "Classification of Finding", valueName: "choiceVal", options: ["Design ", "Construction"] },
      { fieldId: "5daa722b-86f4-4259-8073-499097760152", label: "Severity", valueName: "choiceVal", options: ["Major", "Minor", "NA"] },
      { fieldId: "a85b0b7b-71d0-47d3-a69e-1fa7ddb579b8", label: "SO Rep Assistant (Mechanical) Recommendations and Remarks", valueName: "textVal", multiline: true },
      { fieldId: "00b4b953-65ca-42c8-afcf-cc8f098fe66a", label: "SO Rep Assistant (Mechanical) Details", valueName: "textVal", multiline: true },
      { fieldId: "c81dcdaf-31b5-4321-ab25-ad8b79939fba", label: "Signature", valueName: "svgVal" },
    ],
  },
  {
    label: "Part II (d) - SO Rep Assistant (Electrical) Review",
    group: "review", discipline: "d", disciplineLabel: "Electrical",
    fields: [
      { fieldId: "b884dcb7-100e-471a-a8dd-1b8acd62195d", label: "Are there any time or cost implications?", valueName: "toggleVal" },
      { fieldId: "689bd917-b2a6-468c-af9d-9023a9d29414", label: "Classification of Finding", valueName: "choiceVal", options: ["Design", "Construction"] },
      { fieldId: "25fbb830-6f2e-4e03-82ed-e11ed7d15f9a", label: "Severity", valueName: "choiceVal", options: ["Major", "Minor", "NA"] },
      { fieldId: "e3815994-aac7-4d31-a294-d50f5e7ab7e7", label: "SO Rep Assistant (Electrical) Recommendations and Remarks", valueName: "textVal", multiline: true },
      { fieldId: "c7527c07-3077-47c8-b31f-27395040f249", label: "SO Rep Assistant (Electrical) Details", valueName: "textVal", multiline: true },
      { fieldId: "4059bd5e-5084-4dfa-8349-4720046c4157", label: "Signature", valueName: "svgVal" },
    ],
  },
  {
    label: "Part III - Contractor Rectification",
    fields: [
      { fieldId: "3a6a41e6-bbb5-4da4-99c2-af1c05d1bbfb", label: "Are there any time or cost implications?", valueName: "toggleVal" },
      { fieldId: "579ba08e-5754-459d-8798-06807fd64d72", label: "Rectification Date", valueName: "dateVal" },
      { fieldId: "6c66c21f-fc97-405f-9249-b230541059b3", label: "Description of Rectification", valueName: "textVal", multiline: true },
      { fieldId: "be99f61b-10e9-4139-8a16-2cd0b09173f8", label: "Photos", valueName: "toggleVal" },
      { fieldId: "19bf3601-c54a-48a1-a05e-4eed41fd58a1", label: "Contractor Details", valueName: "textVal", multiline: true },
      { fieldId: "c272eabd-09e7-4803-8126-5ea358fbf857", label: "Signature", valueName: "svgVal" },
    ],
  },
  {
    label: "Part IV - RE/RTO Verification",
    fields: [
      { fieldId: "c081a994-b063-4837-86a6-b4650f2e53fe", label: "Have the contractor's works been satisfactorily completed?", valueName: "toggleVal" },
      { fieldId: "cc123961-30e1-45d8-b4cf-d5710d77076e", label: "Comments on verification of works (if any)", valueName: "textVal", multiline: true },
      { fieldId: "70da8b4a-1571-4824-94ea-e41f353b594b", label: "Additional Photos", valueName: "toggleVal" },
      { fieldId: "006961b9-4c3c-4949-9f5f-5cc7e5fbfdb9", label: "RE/RTO Details", valueName: "textVal", multiline: true },
      { fieldId: "f33ae9bd-3869-44ed-81a8-37afad4f09a5", label: "Signature", valueName: "svgVal" },
    ],
  },
  {
    label: "Part V (a) - SO/ SO Rep Acknowledgement",
    group: "acknowledgement", discipline: "a", disciplineLabel: "Architecture",
    fields: [
      { fieldId: "40eb2f5e-0ff9-4d32-99b1-65ff84934522", label: "SO/ SO Rep's Acknowledgement", valueName: "choiceVal", options: ["I have acknowledged the satisfactory completion of works done by the Contractor."] },
      { fieldId: "3e62d0ca-addb-4f17-8f62-c4912631d917", label: "Comments on verification of works (if any)", valueName: "textVal", multiline: true },
      { fieldId: "c0bb7973-ccd1-4fdb-a580-602f72530bec", label: "SO/ SO Rep (Architecture) Details and Acknowledgement date", valueName: "dateVal" },
      { fieldId: "aea6bac8-69ce-4df7-b53d-1b13109c9b32", label: "Signature", valueName: "svgVal" },
    ],
  },
  {
    label: "Part V (b) - SO Rep Assistant (Civil & Structural) Acknowledgement",
    group: "acknowledgement", discipline: "b", disciplineLabel: "Civil & Structural",
    fields: [
      { fieldId: "d3b2c541-fc1c-450f-9391-efb90f6bc0ad", label: "SO Rep Assistant (Civil & Structural) Acknowledgement", valueName: "choiceVal", options: ["I have acknowledged the satisfactory completion of works done by the Contractor."] },
      { fieldId: "3a9fab7b-8102-465a-b808-521635be7b98", label: "Comments on verification of works (if any", valueName: "textVal", multiline: true },
      { fieldId: "f329de42-7194-4b02-9410-001160848f70", label: "SO Rep Assistant (Civil & Structural) Details and Acknowledgement Date", valueName: "dateVal" },
      { fieldId: "141ea47e-1b60-42d0-91ba-ea15a0ae6be3", label: "Signature", valueName: "svgVal" },
    ],
  },
  {
    label: "Part V (c) - SO Rep Assistant (Mechanical) Acknowledgement",
    group: "acknowledgement", discipline: "c", disciplineLabel: "Mechanical",
    fields: [
      { fieldId: "26a147b0-ab71-43aa-b732-06b549ae1fde", label: "SO Rep Assistant (Mechanical) Acknowledgement", valueName: "choiceVal", options: ["I have acknowledged the satisfactory completion of works done by the Contractor"] },
      { fieldId: "10af9a75-803c-4e79-85fa-fa93ef005ef1", label: "Comments on verification of works (if any)", valueName: "textVal", multiline: true },
      { fieldId: "c8df6b0e-5536-40be-b7ff-d0005a2cede3", label: "SO Rep Assistant (Mechanical) Details and Acknowledgement date", valueName: "dateVal" },
      { fieldId: "e11e2a48-38c4-4afc-b626-1179d243e2ce", label: "Signature", valueName: "svgVal" },
    ],
  },
  {
    label: "Part V (d) - SO Rep Assistant (Electrical) Acknowledgement",
    group: "acknowledgement", discipline: "d", disciplineLabel: "Electrical",
    fields: [
      { fieldId: "0fdb2fda-4b05-406e-8e27-cb984b065b53", label: "SO Rep Assistant (Electrical) Acknowledgement", valueName: "choiceVal", options: ["I have acknowledged the satisfactory completion of works done by the Contractor"] },
      { fieldId: "8185bab3-e2fb-4cc5-8945-c471d9c16daf", label: "Comments on verification of works (if any)", valueName: "textVal", multiline: true },
      { fieldId: "30c8b5d3-dac0-4335-b07a-b2ada57a696d", label: "SO Rep Assistant (Electrical) Details and Acknowledgement date", valueName: "dateVal" },
      { fieldId: "8c491a72-57d3-42a7-aa4e-1dcc1a523e1c", label: "Signature", valueName: "svgVal" },
    ],
  },
  {
    label: "Part VI - PM Final Inputs",
    fields: [
      { fieldId: "3df7ebe7-3c7a-4f6e-a6fb-b0e325af9447", label: "Should this observation be captured as part of PIR?", valueName: "toggleVal" },
      { fieldId: "bc8507d2-aa21-416d-8830-15351e9b776c", label: "Have Design Issues been rectified by SO/ SO Rep (Architecture) ?", valueName: "toggleVal" },
    ],
  },
]
