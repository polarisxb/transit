import { useSyncExternalStore } from 'react'

// new-api login session model: a short-lived JWT access token kept in memory,
// rotated through POST /api/user/auth/refresh which authenticates with an
// HttpOnly cookie. A non-HttpOnly hint cookie tells us whether a refresh is
// worth attempting on a cold start.

export interface AuthUser {
  id: number
  username: string
  display_name?: string
  role: number
  group?: string
  quota?: number
  used_quota?: number
  aff_code?: string
}

export interface LoginSession {
  sid: string
  current: boolean
  login_method: string
  ip: string
  user_agent: string
  created_at: number
  last_active_at: number
  expires_at: number
}

export interface AuthBundle {
  access_token: string
  token_type: string
  access_expires_at: number
  session: LoginSession
  user: AuthUser
}

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous' | 'offline'

interface AuthState {
  status: AuthStatus
  bundle: AuthBundle | null
  retryAt?: number
}

let state: AuthState = { status: 'checking', bundle: null }
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function setState(next: AuthState) {
  state = {
    status: next.status,
    bundle: next.bundle,
    retryAt: next.status === 'offline' ? next.retryAt : undefined,
  }
  emit()
}

export function getAuthState() {
  return state
}

export function useAuth() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
    () => state
  )
}

export function setBundle(bundle: AuthBundle) {
  setState({ status: 'authenticated', bundle })
}

export function clearAuth() {
  setState({ status: 'anonymous', bundle: null })
}

export function patchUser(patch: Partial<AuthUser>) {
  if (!state.bundle) return
  setState({
    status: state.status,
    bundle: { ...state.bundle, user: { ...state.bundle.user, ...patch } },
  })
}

/** Password / 2FA changes rotate the access token but omit `user`. Keep the current user. */
export function applyAuthRotation(data: unknown) {
  if (!isRecord(data) || !state.bundle) return
  const session = data.session
  if (typeof data.access_token !== 'string' || typeof data.access_expires_at !== 'number' || !isRecord(session)) {
    return
  }
  setBundle({
    access_token: data.access_token,
    token_type: typeof data.token_type === 'string' ? data.token_type : 'Bearer',
    access_expires_at: data.access_expires_at,
    session: {
      sid: String(session.sid ?? ''),
      current: Boolean(session.current),
      login_method: String(session.login_method ?? ''),
      ip: String(session.ip ?? ''),
      user_agent: String(session.user_agent ?? ''),
      created_at: Number(session.created_at ?? 0),
      last_active_at: Number(session.last_active_at ?? 0),
      expires_at: Number(session.expires_at ?? 0),
    },
    user: state.bundle.user,
  })
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object'
}

export function isAuthBundle(v: unknown): v is AuthBundle {
  if (!isRecord(v)) return false
  const user = v.user
  const session = v.session
  return (
    typeof v.access_token === 'string' &&
    v.access_token.length > 0 &&
    typeof v.access_expires_at === 'number' &&
    isRecord(user) &&
    typeof user.id === 'number' &&
    typeof user.username === 'string' &&
    isRecord(session) &&
    typeof session.sid === 'string'
  )
}

function hasSessionHint(): boolean {
  return document.cookie.split(';').some((c) => c.trim().startsWith('new_api_has_session='))
}

// ---------------------------------------------------------------------------
// Refresh (single flight). Mirrors the upstream client: 409 AUTH_REFRESH_RACE
// is retried with short back-off, 401 means the cookie is gone.
// ---------------------------------------------------------------------------
export type RefreshOutcome = 'authenticated' | 'anonymous' | 'transient' | 'throttled'

let refreshInFlight: Promise<RefreshOutcome> | null = null
const raceDelays = [80, 200, 500]
const AUTH_REFRESH_LOCK = 'new-api:auth-refresh'
const THROTTLE_CAP_SEC = 20 * 60
const THROTTLE_KEY = 'portal:auth-throttle-until'

function readThrottleUntil(): number {
  try {
    const n = Number(sessionStorage.getItem(THROTTLE_KEY) || 0)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

let throttleUntil = readThrottleUntil()

function writeThrottleUntil(ts: number) {
  throttleUntil = ts
  try {
    if (ts > Date.now()) sessionStorage.setItem(THROTTLE_KEY, String(ts))
    else sessionStorage.removeItem(THROTTLE_KEY)
  } catch {
    // ignore quota / private-mode
  }
}

function retryAfterSeconds(res: Response): number {
  const sec = Number(res.headers.get('Retry-After') || THROTTLE_CAP_SEC)
  if (!Number.isFinite(sec) || sec <= 0) return THROTTLE_CAP_SEC
  return Math.min(Math.ceil(sec), THROTTLE_CAP_SEC)
}

async function doRefresh(attempt = 0, omitSid = false): Promise<RefreshOutcome> {
  const sid = omitSid ? undefined : state.bundle?.session.sid
  let res: Response
  try {
    res = await fetch('/api/user/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-store',
        ...(sid ? { 'X-Auth-Session': sid } : {}),
      },
    })
  } catch {
    return 'transient'
  }

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  const data = isRecord(body) ? body : {}
  const code = typeof data.code === 'string' ? data.code : undefined

  if (data.success === true && isAuthBundle(data.data)) {
    setBundle(data.data)
    return 'authenticated'
  }
  if (res.status === 409 && code === 'AUTH_REFRESH_RACE') {
    const delay = raceDelays[attempt]
    if (delay !== undefined) {
      await new Promise((r) => setTimeout(r, delay))
      return doRefresh(attempt + 1, omitSid)
    }
  }
  if (res.status === 409 && code === 'AUTH_SESSION_MISMATCH' && !omitSid) {
    return doRefresh(attempt + 1, true)
  }
  if (res.status === 401 || res.status === 409) {
    clearAuth()
    return 'anonymous'
  }
  if (res.status === 429) {
    writeThrottleUntil(Date.now() + retryAfterSeconds(res) * 1000)
    return 'throttled'
  }
  if (!res.ok) return 'transient'
  clearAuth()
  return 'anonymous'
}

export function refreshAuthentication(): Promise<RefreshOutcome> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    if (Date.now() < throttleUntil) return 'throttled'
    const run = () => doRefresh()
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
      return navigator.locks.request(AUTH_REFRESH_LOCK, { mode: 'exclusive' }, run)
    }
    return run()
  })().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

/** Return a token that is valid for at least another minute, refreshing if needed. */
export async function getFreshAccessToken(): Promise<string | null> {
  const b = state.bundle
  const now = Math.floor(Date.now() / 1000)
  if (b && b.access_expires_at > now + 60) return b.access_token
  if (!b && !hasSessionHint()) return null
  const outcome = await refreshAuthentication()
  return outcome === 'authenticated' ? (state.bundle?.access_token ?? null) : null
}

/** Cold start. A missing session hint skips the network, matching new-api. */
export async function bootstrapAuth(opts?: { force?: boolean }): Promise<void> {
  if (state.bundle) return
  if (!opts?.force && Date.now() < throttleUntil) {
    setState({ status: 'offline', bundle: null, retryAt: throttleUntil })
    return
  }
  if (!hasSessionHint()) {
    clearAuth()
    return
  }
  if (opts?.force) writeThrottleUntil(0)
  setState({ status: 'checking', bundle: null })
  const outcome = await refreshAuthentication()
  if (state.bundle || outcome === 'authenticated') return
  if (outcome === 'throttled') {
    setState({ status: 'offline', bundle: null, retryAt: throttleUntil })
    return
  }
  if (outcome === 'transient') {
    setState({ status: 'offline', bundle: null })
    return
  }
  clearAuth()
}

// ---------------------------------------------------------------------------
// Login / logout
// ---------------------------------------------------------------------------
export type LoginResult =
  | { kind: 'ok' }
  | { kind: '2fa'; flowToken: string }
  | { kind: 'error'; message: string }

async function postJson(path: string, body?: unknown, headers?: Record<string, string>) {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    json = null
  }
  return { res, json: isRecord(json) ? json : {} }
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const { json } = await postJson('/api/user/login?turnstile=', { username, password })
  if (json.success !== true) {
    return { kind: 'error', message: String(json.message || '登录失败') }
  }
  const data = json.data
  if (isRecord(data) && data.require_2fa === true && typeof data.flow_token === 'string') {
    return { kind: '2fa', flowToken: data.flow_token }
  }
  if (isAuthBundle(data)) {
    setBundle(data)
    return { kind: 'ok' }
  }
  return { kind: 'error', message: '服务端返回了无法识别的登录响应' }
}

export async function login2fa(code: string, flowToken: string): Promise<LoginResult> {
  const { json } = await postJson('/api/user/login/2fa', { code, flow_token: flowToken })
  if (json.success !== true) {
    return { kind: 'error', message: String(json.message || '验证码错误') }
  }
  if (isAuthBundle(json.data)) {
    setBundle(json.data)
    return { kind: 'ok' }
  }
  return { kind: 'error', message: '服务端返回了无法识别的登录响应' }
}

export async function logout(): Promise<void> {
  const b = state.bundle
  try {
    await postJson('/api/user/auth/logout', undefined, {
      ...(b ? { Authorization: `Bearer ${b.access_token}` } : {}),
      ...(b?.session.sid ? { 'X-Auth-Session': b.session.sid } : {}),
    })
  } finally {
    clearAuth()
  }
}
