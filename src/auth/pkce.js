// PKCE (Proof Key for Code Exchange) 3-legged OAuth for Autodesk Platform Services.
// Lets a pure-browser SPA obtain an access token with NO client secret and NO backend.
//
// Verified against Autodesk's official sample:
//   https://github.com/autodesk-platform-services/aps-pkce-webapp
//
// Prerequisites in the APS portal (https://aps.autodesk.com):
//   1. Create an app of type "Desktop, Mobile, Single-Page App" (a public client — no secret).
//   2. Add the EXACT redirect URI (see getRedirectUri() below) as the app's Callback URL.
//   3. To reach ACC project data, add the app's Client ID as a Custom Integration in the
//      ACC Account Admin, or calls will 403 even with a valid token.

const AUTH_BASE = 'https://developer.api.autodesk.com/authentication/v2'

// Scopes needed for ACC Forms CRUD. Add more if you call other APIs.
export const DEFAULT_SCOPE = 'data:read data:write'

const VERIFIER_KEY = 'aps_pkce_verifier'
const STATE_KEY = 'aps_pkce_state'
const LOGIN_CFG_KEY = 'aps_pkce_login_cfg' // { clientId, redirectUri, scope } — needed during the callback
const TOKEN_KEY = 'aps_token' // { access_token, refresh_token, expires_at, scope }

// The redirect URI must match the Callback URL registered on the APS app EXACTLY.
// We use the app's own page URL so the ?code=... lands right back here.
export function getRedirectUri() {
  return window.location.origin + window.location.pathname
}

function base64url(bytes) {
  let str = ''
  const arr = new Uint8Array(bytes)
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(len) {
  // Unreserved characters per RFC 7636 — safe for a code_verifier.
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  let out = ''
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length]
  return out
}

async function challengeFromVerifier(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(digest)
}

export function getToken() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveToken(tok) {
  // Refresh a minute early to avoid edge-of-expiry failures.
  const expires_at = Date.now() + (tok.expires_in - 60) * 1000
  const stored = {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_at,
    scope: tok.scope,
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(stored))
  return stored
}

export function isExpired(tok = getToken()) {
  return !tok || !tok.expires_at || Date.now() >= tok.expires_at
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
}

// Step 1 — redirect the browser to Autodesk's consent screen.
export async function login({ clientId, redirectUri = getRedirectUri(), scope = DEFAULT_SCOPE }) {
  if (!clientId) throw new Error('Missing APS Client ID')
  const verifier = randomString(64)
  const state = randomString(16)
  const challenge = await challengeFromVerifier(verifier)

  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(LOGIN_CFG_KEY, JSON.stringify({ clientId, redirectUri, scope }))

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    nonce: randomString(16),
    prompt: 'login',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  window.location.assign(`${AUTH_BASE}/authorize?${params.toString()}`)
}

// Step 2 — on page load, if we returned with ?code=..., exchange it for a token.
// Returns the stored token record, or null if this load isn't an auth callback.
export async function handleRedirectCallback() {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const returnedState = url.searchParams.get('state')

  if (error) {
    cleanUrl()
    throw new Error(`Authorization failed: ${error} — ${url.searchParams.get('error_description') || ''}`)
  }
  if (!code) return null

  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  const expectedState = sessionStorage.getItem(STATE_KEY)
  const cfg = JSON.parse(sessionStorage.getItem(LOGIN_CFG_KEY) || '{}')
  cleanUrl()

  if (!verifier) throw new Error('Missing PKCE verifier — did the page reload mid-login?')
  if (expectedState && returnedState !== expectedState) {
    throw new Error('State mismatch — possible CSRF; aborting token exchange.')
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: cfg.clientId,
    code_verifier: verifier,
    code,
    redirect_uri: cfg.redirectUri,
  })
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
  const data = await res.json()
  if (!res.ok) {
    const e = new Error(data.error_description || data.error || 'Token exchange failed')
    e.status = res.status
    e.body = data
    throw e
  }

  sessionStorage.removeItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(LOGIN_CFG_KEY)
  return saveToken(data)
}

// Optional — exchange the stored refresh token for a fresh access token.
export async function refresh({ clientId, scope = DEFAULT_SCOPE }) {
  const tok = getToken()
  if (!tok?.refresh_token) throw new Error('No refresh token stored — sign in again.')
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: tok.refresh_token,
    scope,
  })
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
  const data = await res.json()
  if (!res.ok) {
    logout()
    const e = new Error(data.error_description || 'Token refresh failed')
    e.status = res.status
    e.body = data
    throw e
  }
  return saveToken(data)
}

function cleanUrl() {
  // Strip ?code=...&state=... from the address bar after we've consumed it.
  window.history.replaceState({}, document.title, window.location.origin + window.location.pathname)
}
