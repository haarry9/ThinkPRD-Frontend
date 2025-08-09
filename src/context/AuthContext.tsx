import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { UserProfile } from '@/api/users'
import { getMe } from '@/api/users'
import {
  login,
  refresh as apiRefresh,
  logout as apiLogout,
  storeTokens,
  clearTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
} from '@/api/auth'
import { startTokenRefreshTimer, stopTokenRefreshTimer, forceLogoutNow } from '@/api/http'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type SignInPayload = { email: string; password: string }

type AuthContextValue = {
  user: UserProfile | null
  status: AuthStatus
  accessToken: string | null
  refreshToken: string | null
  signin: (payload: SignInPayload) => Promise<void>
  loadFromStorage: () => Promise<void>
  refreshTokens: () => Promise<void>
  signout: () => Promise<void>
  setUser: (u: UserProfile | null) => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)

  const writeExpiry = (expiresIn: number | undefined) => {
    try {
      if (typeof expiresIn === 'number') {
        const expiresAt = Date.now() + expiresIn * 1000
        localStorage.setItem('access_expires_at', String(expiresAt))
      }
    } catch {}
  }

  const broadcast = (event: 'login' | 'logout') => {
    try {
      localStorage.setItem('auth_event', `${event}:${Date.now()}`)
    } catch {}
  }

  const refreshTokens = useCallback(async () => {
    const rt = getStoredRefreshToken()
    if (!rt) throw new Error('No refresh token')
    const result = await apiRefresh(rt)
    const nextRefresh = result.refresh_token || getStoredRefreshToken()
    if (!result.access_token || !nextRefresh) throw new Error('Incomplete refresh response')
    storeTokens(result.access_token, nextRefresh)
    writeExpiry(result.expires_in)
    setAccessToken(result.access_token)
    setRefreshToken(nextRefresh)
    startTokenRefreshTimer()
  }, [])

  const loadFromStorage = useCallback(async () => {
    setStatus('loading')
    const at = getStoredAccessToken()
    const rt = getStoredRefreshToken()
    setAccessToken(at)
    setRefreshToken(rt)
    if (!at || !rt) {
      setUser(null)
      setStatus('unauthenticated')
      stopTokenRefreshTimer()
      return
    }
    try {
      const me = await getMe(at)
      setUser(me)
      setStatus('authenticated')
      startTokenRefreshTimer()
    } catch (err: any) {
      // Only attempt refresh on 401
      if (err?.status === 401) {
        try {
          await refreshTokens()
          const at2 = getStoredAccessToken()
          if (!at2) throw new Error('No access token after refresh')
          const me2 = await getMe(at2)
          setUser(me2)
          setStatus('authenticated')
          startTokenRefreshTimer()
        } catch (err2: any) {
          // If still unauthorized after refresh, log out; otherwise keep tokens and proceed as authenticated with unknown user
          if (err2?.status === 401) {
            clearTokens()
            setUser(null)
            setAccessToken(null)
            setRefreshToken(null)
            setStatus('unauthenticated')
            stopTokenRefreshTimer()
          } else {
            setUser(null)
            setStatus('authenticated')
            startTokenRefreshTimer()
          }
        }
      } else {
        // Non-401 (e.g., 403 Forbidden). Keep tokens; proceed authenticated with unknown user
        setUser(null)
        setStatus('authenticated')
        startTokenRefreshTimer()
      }
    }
  }, [refreshTokens])

  const signin = useCallback(async ({ email, password }: SignInPayload) => {
    setStatus('loading')
    const res = await login({ email, password })
    storeTokens(res.access_token, res.refresh_token)
    writeExpiry(res.expires_in)
    setAccessToken(res.access_token)
    setRefreshToken(res.refresh_token)

    // Seed user immediately from login payload if available
    if (res.user) {
      setUser({
        id: res.user.id,
        email: res.user.email,
        full_name: res.user.full_name,
      } as UserProfile)
    } else {
      setUser(null)
    }

    setStatus('authenticated')
    startTokenRefreshTimer()
    broadcast('login')

    // Best-effort enrichment with /users/me
    try {
      const me = await getMe(res.access_token)
      setUser(me)
    } catch {
      // ignore (403/others). We keep the seeded user or null
    }
  }, [])

  const signout = useCallback(async () => {
    const at = getStoredAccessToken()
    const rt = getStoredRefreshToken()
    try {
      if (at) await apiLogout(at, rt || undefined)
    } catch {
      // ignore; we will clear client state regardless
    }
    forceLogoutNow()
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    setStatus('unauthenticated')
    broadcast('logout')
    if (typeof window !== 'undefined') {
      window.location.assign('/login')
    }
  }, [])

  // Hydrate on mount
  useEffect(() => {
    loadFromStorage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Multi-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth_event' && typeof e.newValue === 'string') {
        if (e.newValue.startsWith('logout:')) {
          clearTokens()
          setUser(null)
          setAccessToken(null)
          setRefreshToken(null)
          setStatus('unauthenticated')
          stopTokenRefreshTimer()
        } else if (e.newValue.startsWith('login:')) {
          loadFromStorage()
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [loadFromStorage])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    accessToken,
    refreshToken,
    signin,
    loadFromStorage,
    refreshTokens,
    signout,
    setUser,
  }), [user, status, accessToken, refreshToken, signin, loadFromStorage, refreshTokens, signout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


