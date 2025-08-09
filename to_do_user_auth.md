## To-Do: User Auth — Profile & Logout Implementation

Scope: Implement user profile editing and robust logout with token refresh and HTTP wrapper. Keep API differences in mind (refresh may or may not rotate refresh_token; logout may require refresh_token body later).

References
- `docs/backendprd.md` (auth and user endpoints)
- Current implementations in `src/pages/Login.tsx`, `src/pages/Register.tsx`, `src/api/auth.ts`

Conventions
- Storage keys: `access_token`, `refresh_token`, `access_expires_at` (epoch ms)
- One retry only after a successful token refresh; never loop infinitely
- Broadcast login/logout via `localStorage` events for multi-tab sync

---

### Phase 0 — Prep & Alignment
- [x] Confirm refresh API shapes against backend
  - [x] POST `/api/v1/auth/refresh` accepts `{ refresh_token }` (confirmed in `docs/backendprd.md`)
  - [x] Response shape A: `{ access_token, expires_in }` (confirmed — backend returns only these fields)
  - [x] Response shape B: `{ access_token, refresh_token, expires_in }` (not currently returned; keep tolerant handling)
- [x] Confirm logout API expectations
  - [x] POST `/api/v1/auth/logout` requires `Authorization: Bearer <accessToken>` (confirmed header-only)
  - [x] Body `{ refresh_token }` optional for now; keep capability feature-flagged for future backend changes
- [x] Decide feature flag name for logout body inclusion (use `AUTH_LOGOUT_SEND_REFRESH_BODY`, default `false`)
- [x] Confirm router location and bootstrap entry (router in `src/App.tsx`, bootstrap in `src/main.tsx`)
- [x] Decide file layout
  - [x] `src/api/http.ts` (HTTP wrapper)
  - [x] `src/api/auth.ts` (login/refresh/logout)
  - [x] `src/api/users.ts` (me endpoints + update)
  - [x] `src/context/AuthContext.tsx`, `src/hooks/useAuth.ts`
  - [x] `src/pages/Profile.tsx`
  - [x] Route guard component `src/routes/RequireAuth.tsx` (or similar)

Acceptance criteria
- [x] Plan validated; no missing endpoints/configs

---

### Phase 1 — API Layer Additions (`src/api/auth.ts`, `src/api/users.ts`)
- [x] `src/api/users.ts` — create
  - [x] Types: `UserProfile`, `UpdateMePayload` with fields: `first_name`, `last_name`, `bio`, `phone_number`
  - [x] `getMe(): Promise<UserProfile>` — move from `auth.ts` to `users.ts`
  - [x] `updateMe(payload: UpdateMePayload): Promise<UserProfile>` — PUT `/api/v1/users/me`
- [x] `src/api/auth.ts` — extend
  - [x] `refresh(refreshToken: string): Promise<{ access_token: string; expires_in: number; refresh_token?: string }>` — POST `/api/v1/auth/refresh`
  - [x] `logout(accessToken: string, refreshToken?: string): Promise<void>` — POST `/api/v1/auth/logout`
  - [x] Keep refresh response handling tolerant to both A/B shapes
  - [x] Keep logout body `{ refresh_token }` optional behind feature flag
- [x] Update any existing imports to use `users.ts` for `getMe`

Acceptance criteria
- [x] New `users.ts` exists and compiles
- [x] `refresh` and `logout` exposed from `auth.ts`
- [x] `getMe` references updated across codebase

---

### Phase 2 — HTTP Client Wrapper (`src/api/http.ts`)
- [x] Create a small wrapper around `fetch`
  - [x] `request<T>(input: RequestInfo, init?: RequestInit): Promise<T>` (or similar)
  - [x] Auto-inject `Authorization: Bearer <access_token>` if present
  - [x] Centralize JSON parsing and error normalization
- [x] 401 handling with single-flight refresh
  - [x] Keep a module-level `refreshInFlightPromise: Promise<void> | null`
  - [x] On first 401: start refresh (if not in flight)
  - [x] Queue concurrent 401 callers to await the same promise
  - [x] On successful refresh: replay the original request once
  - [x] On refresh failure: clear tokens, broadcast logout, redirect to `/login`
  - [x] Ensure only one replay; never infinite retry
- [x] Optional proactive refresh timer
  - [x] Track `access_expires_at = now + expires_in*1000`
  - [x] Expose `startTokenRefreshTimer` / `stopTokenRefreshTimer`
  - [x] Refresh approximately T-120s before expiry

Acceptance criteria
- [x] Wrapper integrates with token store
- [x] Verified single-flight behavior for concurrent 401s
- [x] Replay-once works; failure path logs out

---

### Phase 3 — Auth State (`src/context/AuthContext.tsx`, `src/hooks/useAuth.ts`)
- [x] State shape
  - [x] `user: UserProfile | null`
  - [x] `status: 'loading' | 'authenticated' | 'unauthenticated'`
  - [x] `accessToken: string | null`
  - [x] `refreshToken: string | null`
  - [x] Optional timer handle for proactive refresh (driven via `http.ts` helpers)
- [x] Actions
  - [x] `signin({ email, password })` → store tokens; call `getMe`; set `authenticated`
  - [x] `loadFromStorage()` → hydrate tokens; if present, call `getMe`; set status appropriately
  - [x] `refreshTokens()` → call `refresh`; update tokens; maintain `access_expires_at`
  - [x] `signout()` → call `logout`; clear tokens/state; stop timers; navigate `/login`
- [x] Persistence
  - [x] LocalStorage read/write helpers for `access_token`, `refresh_token`, `access_expires_at`
  - [x] `window.addEventListener('storage', ...)` to sync multi-tab login/logout
- [x] Provider
  - [x] Export `AuthProvider`
  - [x] Export `useAuth()` hook
  - [x] Wrap app at root (`src/App.tsx`)

Acceptance criteria
- [x] Clear status transitions; no flicker beyond initial `loading`
- [x] Multi-tab sync verified

---

### Phase 4 — Routing & Guards
- [x] Add a route guard component `RequireAuth`
  - [x] If `unauthenticated` → redirect to `/login`
  - [x] If `loading` → optional splash/loader
- [x] Integrate guard where needed (sensitive routes)
- [x] Add route `GET /profile` → `src/pages/Profile.tsx`
- [x] App bootstrap
  - [x] Call `loadFromStorage()` once at boot

Acceptance criteria
- [x] Protected routes redirect appropriately
- [x] `/profile` available only when authenticated

---

### Phase 5 — UI Wiring (Navbar + Profile Page)
- [x] Navbar
  - [x] Unauth: show existing “Sign In” button
  - [x] Auth: show user menu (initials/avatar)
    - [x] “Profile” → navigate `/profile`
    - [ ] “Change Password” (placeholder route; optional for now)
    - [x] “Logout” → triggers `signout()`
- [x] `src/pages/Profile.tsx`
  - [x] On mount: derive `user` from context; also fetch `getMe()` to refresh
  - [x] Form fields: `first_name`, `last_name`, `bio`, `phone_number`
  - [x] Submit: `updateMe()` → update context `user` → toast success
  - [x] Errors: show `422` validation messages; 401 auto-handled by HTTP wrapper
  - [x] Loading/disabled states for UX

Acceptance criteria
- [x] Profile edits persist and reflect immediately in UI
- [x] Logout from navbar reliably clears state and redirects

---

### Phase 6 — Logout Flow Hardening
- [x] On click of “Logout”
  - [x] Call `/api/v1/auth/logout` with `Authorization`
  - [x] If feature flag enabled, send `{ refresh_token }` body
  - [x] Regardless of API outcome: clear tokens, cancel timers, reset state, navigate `/login`
- [x] Broadcast a `localStorage` event (e.g. set `auth_event=logout:<ts>`) for other tabs
- [x] Ensure HTTP wrapper queues are drained/invalidated after logout

Acceptance criteria
- [x] No residual authenticated calls after logout
- [x] All tabs reflect logged-out state within ~100ms

---

### Phase 7 — Token Storage & Sync
- [x] Implement safe getters/setters
  - [x] `getAccessToken()`, `getRefreshToken()`, `getAccessExpiry()`
  - [x] `setTokens({ access, refresh?, expires_in })` → compute and store `access_expires_at`
  - [x] Do not overwrite `refresh_token` if refresh response lacks it
- [x] Storage events
  - [x] On `login`: write tokens and a `storage` broadcast entry
  - [x] On `logout`: remove tokens and broadcast

Acceptance criteria
- [x] Never lose a valid refresh token on partial refresh responses
- [x] Sync events work on multi-tab

---

### Phase 8 — Testing Checklist
- [ ] Login happy path
- [ ] Wrong password (401) shows error and no state persisted
- [ ] Server error (5xx) shows generic failure
- [ ] Auto refresh on access token expiry mid-session; verify request replay
- [ ] Refresh failure forces logout
- [ ] Logout success and failure both clear local state and redirect
- [ ] Profile load success; update success; validation errors (422) displayed
- [ ] Multi-tab login/logout sync
- [ ] Route guard prevents access when unauthenticated

Notes
- Prefer writing unit tests for: token helpers, HTTP wrapper refresh flow, context reducer/actions
- Optionally add an e2e smoke (if e2e infra exists)

---

### Phase 9 — Docs & Dev Experience
- [ ] Update `docs/frontendprd.md` (or add a short `docs/auth.md`) with:
  - [ ] Auth flow diagram
  - [ ] Token lifecycle and storage keys
  - [ ] Guidelines for calling APIs via `request()` wrapper
- [ ] Add code comments for non-obvious logic (single-flight, replay-once)

Acceptance criteria
- [ ] New contributors can follow docs to extend auth features

---

### Phase 10 — Optional Later
- [ ] Change Password page
  - [ ] Route and form; call `POST /api/v1/auth/change-password`
  - [ ] UX and validation
- [ ] Proactive refresh timer polish
  - [ ] Backoff/jitter if server rejects early refresh
  - [ ] Observability hooks (console or telemetry) for refresh attempts

---

Implementation Order Summary
1) Phase 1 (API) → 2 (HTTP wrapper) → 3 (Auth state)
2) Phase 4 (Guards) → 5 (UI: Navbar + Profile)
3) Phase 6–7 (Logout + Storage sync) → 8 (Testing) → 9 (Docs)

Definition of Done (overall)
- [ ] Authenticated experience works end-to-end with refresh and replay-once
- [ ] Profile view/edit works with proper validation and state updates
- [ ] Logout clears state across tabs; guarded routes redirect correctly
- [ ] Tests and docs updated


