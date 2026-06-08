// Minimal client for the Autodesk Construction Cloud (ACC) Forms API.
// Docs: https://aps.autodesk.com/en/docs/acc/v1/reference/http/forms-forms-GET/
//
// Notes for the POC:
// - The Forms API expects the ACC project ID WITHOUT the "b." prefix that some
//   other APS/Forge endpoints use. If your ID looks like "b.xxxxxxxx-...", strip
//   the "b." before passing it here (the UI does this for you).
// - `baseUrl` is the API host, e.g. "https://developer.api.autodesk.com".
//   The Forms API sends `Access-Control-Allow-Origin: *`, so direct browser
//   calls work without a proxy.

async function request(baseUrl, token, method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText}`)
    err.status = res.status
    err.body = data
    throw err
  }
  return data
}

const stripPrefix = (projectId) =>
  projectId?.startsWith('b.') ? projectId.slice(2) : projectId

// READ: list form templates available in the project.
export function listFormTemplates(baseUrl, token, projectId, { limit = 50, offset = 0 } = {}) {
  const pid = stripPrefix(projectId)
  return request(
    baseUrl,
    token,
    'GET',
    `/construction/forms/v1/projects/${pid}/form-templates?limit=${limit}&offset=${offset}`,
  )
}

// READ: list forms in the project.
export function listForms(baseUrl, token, projectId, { limit = 50, offset = 0 } = {}) {
  const pid = stripPrefix(projectId)
  return request(
    baseUrl,
    token,
    'GET',
    `/construction/forms/v1/projects/${pid}/forms?limit=${limit}&offset=${offset}`,
  )
}

// READ: get a template's layout (metadata + list of sections, including section IDs).
export function getLayout(baseUrl, token, projectId, layoutId) {
  const pid = stripPrefix(projectId)
  return request(baseUrl, token, 'GET', `/construction/forms/v1/projects/${pid}/layouts/${layoutId}`)
}

// READ: get one section's full definition (the fields in `sectionItems`, with their
// schema/valueName, and any required/optional flag the API exposes).
// NOTE: nested under the layout, and both ids are the `uid` values (not `id`).
export function getSection(baseUrl, token, projectId, layoutId, sectionUid) {
  const pid = stripPrefix(projectId)
  return request(
    baseUrl,
    token,
    'GET',
    `/construction/forms/v1/projects/${pid}/layouts/${layoutId}/sections/${sectionUid}`,
  )
}

// CREATE: create a new form from a template.
// body example: { name: "My form", description: "...", formDate: "2026-06-04" }
export function createForm(baseUrl, token, projectId, templateId, body) {
  const pid = stripPrefix(projectId)
  return request(
    baseUrl,
    token,
    'POST',
    `/construction/forms/v1/projects/${pid}/form-templates/${templateId}/forms`,
    body,
  )
}

// UPDATE: patch top-level form details (name, status, description, etc.).
// NOTE: the template ID IS part of the path here, not just the form ID.
// body example: { status: "inProgress", description: "Updated via the API" }
export function updateForm(baseUrl, token, projectId, templateId, formId, body) {
  const pid = stripPrefix(projectId)
  return request(
    baseUrl,
    token,
    'PATCH',
    `/construction/forms/v1/projects/${pid}/form-templates/${templateId}/forms/${formId}`,
    body,
  )
}

// UPDATE: batch-update the field values inside a form.
// NOTE: this lives on the v2 API (not v1) and does NOT take a template ID.
// body example:
// { customValues: [ { itemLabel: "Notes", textVal: "hello" }, { itemLabel: "Count", numberVal: 3 } ] }
export function batchUpdateValues(baseUrl, token, projectId, formId, body) {
  const pid = stripPrefix(projectId)
  return request(
    baseUrl,
    token,
    'PUT',
    `/construction/forms/v2/projects/${pid}/forms/${formId}/values:batch-update`,
    body,
  )
}
