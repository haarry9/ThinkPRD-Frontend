export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user?: {
    id: string
    email: string
    full_name?: string
    first_name?: string
    last_name?: string
    phone_number?: string | null
    bio?: string | null
  }
}

export type RegisterRequest = {
  email: string
  password: string
  confirm_password: string
  first_name: string
  last_name: string
}

function normalizeUser(raw: any): LoginResponse['user'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const id = raw.id
  const email = raw.email
  const profile = raw.profile || {}
  const first_name = raw.first_name ?? profile.first_name
  const last_name = raw.last_name ?? profile.last_name
  const phone_number = raw.phone_number ?? profile.phone_number ?? null
  const bio = raw.bio ?? profile.bio ?? null
  const full_name = raw.full_name || [first_name, last_name].filter(Boolean).join(' ') || undefined
  return { id, email, full_name, first_name, last_name, phone_number, bio }
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    // Try parse JSON error first, fall back to text
    let message = 'Login failed'
    let parsed: any = null
    try {
      parsed = await res.json()
      message = parsed?.error || parsed?.message || message
    } catch {
      const text = await res.text().catch(() => '')
      if (text) message = text
    }
    const error: any = new Error(`${res.status} ${res.statusText}: ${message}`)
    error.status = res.status
    error.body = parsed
    throw error
  }
  const data: any = await res.json()
  const token = data?.token || data
  const normalized: LoginResponse = {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    token_type: token.token_type || 'bearer',
    expires_in: token.expires_in,
    user: normalizeUser(data?.user),
  }
  return normalized
}

export async function register(payload: RegisterRequest): Promise<{ message: string; user_id: string }> {
  const res = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    let message = 'Registration failed'
    try {
      const data = await res.json()
      message = data?.error || data?.message || message
    } catch {
      const text = await res.text().catch(() => '')
      if (text) message = text
    }
    throw new Error(`${res.status} ${res.statusText}: ${message}`)
  }
  return res.json()
}

// moved to users.ts

function sanitizeToken(raw: string): string {
  let t = String(raw || '').trim()
  t = t.replace(/^(Bearer|bearer|JWT|jwt)\s+/, '')
  return t
}

export function storeTokens(accessToken: string, refreshToken: string) {
  try {
    const at = sanitizeToken(accessToken)
    const rt = sanitizeToken(refreshToken)
    localStorage.setItem('access_token', at)
    localStorage.setItem('refresh_token', rt)
  } catch {}
}

export function clearTokens() {
  try {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('access_expires_at')
  } catch {}
}

export function getStoredAccessToken(): string | null {
  try {
    return localStorage.getItem('access_token')
  } catch {
    return null
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem('refresh_token')
  } catch {
    return null
  }
}

export function getStoredAccessExpiry(): number | null {
  try {
    const raw = localStorage.getItem('access_expires_at')
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}

export function setTokens(params: { access: string; refresh?: string; expires_in?: number }): void {
  const { access, refresh, expires_in } = params
  try {
    const at = sanitizeToken(access)
    localStorage.setItem('access_token', at)
    if (typeof refresh === 'string' && refresh) {
      const rt = sanitizeToken(refresh)
      localStorage.setItem('refresh_token', rt)
    }
    if (typeof expires_in === 'number') {
      const expiresAt = Date.now() + expires_in * 1000
      localStorage.setItem('access_expires_at', String(expiresAt))
    }
  } catch {}
}

export async function refresh(refreshToken: string): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const res = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: sanitizeToken(refreshToken) }),
  })
  if (!res.ok) {
    let message = 'Token refresh failed'
    try {
      const data = await res.json()
      message = data?.error || data?.message || message
    } catch {}
    const error: any = new Error(`${res.status} ${res.statusText}: ${message}`)
    error.status = res.status
    throw error
  }
  return res.json()
}

const AUTH_LOGOUT_SEND_REFRESH_BODY = false

export async function logout(accessToken: string, refreshToken?: string): Promise<void> {
  const body = AUTH_LOGOUT_SEND_REFRESH_BODY && refreshToken ? JSON.stringify({ refresh_token: sanitizeToken(refreshToken) }) : undefined
  const headers: Record<string, string> = { Authorization: `Bearer ${sanitizeToken(accessToken)}` }
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    headers,
    body,
  })
  if (!res.ok) {
    // We still clear client state regardless; surface error for logging
    try {
      const data = await res.json()
      console.error('Logout failed:', res.status, res.statusText, data)
    } catch {
      console.error('Logout failed:', res.status, res.statusText)
    }
  }
}


