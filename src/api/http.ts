import {
  refresh as apiRefresh,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeTokens,
  clearTokens,
} from '@/api/auth'

let refreshInFlightPromise: Promise<void> | null = null
let proactiveRefreshTimerId: number | null = null
let forcedLogout = false

type RequestOptions = {
  skipAuth?: boolean
}

function normalizeAccessToken(raw: string | null): string | null {
  if (!raw) return null
  let t = String(raw).trim()
  if (!t || t === 'null' || t === 'undefined') return null
  t = t.replace(/^(Bearer|bearer|JWT|jwt)\s+/, '')
  return t
}

function normalizeRefreshToken(raw: string | null): string | null {
  if (!raw) return null
  let t = String(raw).trim()
  if (!t || t === 'null' || t === 'undefined') return null
  t = t.replace(/^(Bearer|bearer|JWT|jwt)\s+/, '')
  return t
}

function getAccessToken(): string | null {
  return normalizeAccessToken(getStoredAccessToken())
}

function getRefreshToken(): string | null {
  return normalizeRefreshToken(getStoredRefreshToken())
}

function withAuthHeaders(init: RequestInit = {}): RequestInit {
  const token = getAccessToken()
  if (!token) return init
  const headers = new Headers(init.headers || {})
  headers.set('Authorization', `Bearer ${token}`)
  return { ...init, headers }
}

async function parseJsonSafe<T = unknown>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function performTokenRefresh(): Promise<void> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token')
  }
  const result = await apiRefresh(refreshToken)
  const { access_token, refresh_token, expires_in } = result
  // Persist tokens; do not overwrite refresh if backend omitted it
  const nextRefresh = normalizeRefreshToken(refresh_token || getRefreshToken())
  const nextAccess = normalizeAccessToken(access_token || null)
  if (!nextAccess || !nextRefresh) {
    throw new Error('Incomplete refresh response')
  }
  storeTokens(nextAccess, nextRefresh)
  // Optionally store access expiry for proactive refresh
  try {
    if (typeof expires_in === 'number') {
      const expiresAt = Date.now() + expires_in * 1000
      localStorage.setItem('access_expires_at', String(expiresAt))
    }
  } catch {}
}

async function ensureRefreshedOnce(): Promise<void> {
  if (!refreshInFlightPromise) {
    refreshInFlightPromise = (async () => {
      try {
        await performTokenRefresh()
      } finally {
        // Always clear so future 401s can trigger a new cycle
        const p = refreshInFlightPromise
        refreshInFlightPromise = null
        // Avoid unhandled rejections — await the promise chain end
        await p?.catch(() => {})
      }
    })()
  }
  return refreshInFlightPromise
}

function broadcastLogout(): void {
  try {
    localStorage.setItem('auth_event', `logout:${Date.now()}`)
  } catch {}
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    // Hard redirect to ensure state reset
    window.location.assign('/login')
  }
}

export async function request<T = unknown>(input: RequestInfo | URL, init: RequestInit = {}, options: RequestOptions = {}): Promise<T> {
  const { skipAuth } = options
  if (forcedLogout) {
    clearTokens()
    broadcastLogout()
    redirectToLogin()
    const err: any = new Error('Unauthorized: user logged out')
    err.status = 401
    throw err
  }
  const firstAttemptInit = skipAuth ? init : withAuthHeaders(init)

  const res = await fetch(input, firstAttemptInit)
  if (res.status !== 401) {
    if (res.ok) {
      return (await parseJsonSafe<T>(res)) as T
    }
    const body = await parseJsonSafe<any>(res)
    const error: any = new Error(`${res.status} ${res.statusText}: ${body?.message || body?.error || 'Request failed'}`)
    error.status = res.status
    error.body = body
    throw error
  }

  // 401 handling: attempt a single refresh then replay once
  try {
    await ensureRefreshedOnce()
  } catch (e) {
    // Refresh failed — clear tokens, broadcast, redirect, and throw
    clearTokens()
    broadcastLogout()
    redirectToLogin()
    const err: any = new Error('Unauthorized: refresh failed')
    err.cause = e
    err.status = 401
    throw err
  }

  // Replay once with possibly updated access token
  const replayInit = skipAuth ? init : withAuthHeaders(init)
  const replayRes = await fetch(input, replayInit)
  if (replayRes.ok) {
    return (await parseJsonSafe<T>(replayRes)) as T
  }
  // If still unauthorized or other error, surface it without further retries
  const replayBody = await parseJsonSafe<any>(replayRes)
  const replayError: any = new Error(`${replayRes.status} ${replayRes.statusText}: ${replayBody?.message || replayBody?.error || 'Request failed'}`)
  replayError.status = replayRes.status
  replayError.body = replayBody
  if (replayRes.status === 401) {
    // Force logout to be safe
    clearTokens()
    broadcastLogout()
    redirectToLogin()
  }
  throw replayError
}

// Optional proactive refresh timer support
export function startTokenRefreshTimer(): void {
  stopTokenRefreshTimer()
  let msUntilRefresh = 0
  try {
    const raw = localStorage.getItem('access_expires_at')
    if (raw) {
      const expiresAt = Number(raw)
      const leadTime = 120_000 // 2 minutes
      msUntilRefresh = Math.max(0, expiresAt - Date.now() - leadTime)
    }
  } catch {}
  if (msUntilRefresh <= 0) return
  proactiveRefreshTimerId = window.setTimeout(async () => {
    try {
      await ensureRefreshedOnce()
      // Reschedule based on the new expiry
      startTokenRefreshTimer()
    } catch {
      clearTokens()
      broadcastLogout()
      redirectToLogin()
    }
  }, msUntilRefresh)
}

export function stopTokenRefreshTimer(): void {
  if (proactiveRefreshTimerId != null) {
    clearTimeout(proactiveRefreshTimerId)
    proactiveRefreshTimerId = null
  }
}

export function forceLogoutNow(): void {
  forcedLogout = true
  refreshInFlightPromise = null
  stopTokenRefreshTimer()
  clearTokens()
  broadcastLogout()
}


