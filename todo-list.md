---
title: Agent Integration TODO (Frontend)
owner: frontend
status: in-progress
---

### Scope
Deep, phased checklist to integrate the agent HTTP endpoints and WebSocket protocol (as defined in `docs/agent.md`) into the existing UI. No code in this doc — only concrete tasks with owners and acceptance criteria.

### Legend
- [x] done
- [ ] todo

### Phase 0 — Discovery and Foundations
- [x] Review current auth, HTTP, and UI scaffolding
  - Files: `src/api/http.ts`, `src/api/auth.ts`, `src/api/users.ts`, `src/context/AuthContext.tsx`, `src/hooks/useAuth.ts`
  - Observations: `request()` injects `Authorization` and auto-refreshes on 401; redirects to `/login` on hard failures
- [x] Review workspace UI and chat scaffolding
  - Files: `src/components/layout/Workspace.tsx`, `src/components/PRDEditor.tsx`, `src/components/FlowchartView.tsx`, `src/components/chat/ChatPanel.tsx`, `src/components/sidebar/ModeSegmented.tsx`, `src/components/sidebar/ThinkingLensChips.tsx`
  - Observations: all mock/local state; no HTTP/WS wiring yet; save/history buttons are placeholders
- [x] Review entry flow
  - Files: `src/pages/Index.tsx`, `src/components/ClarificationModal.tsx`
  - Observations: modal uses static questions; workspace is entered without calling backend; no gating by clarifications
 - [x] Networking decision (no proxy; absolute URLs only)
   - Do NOT use a dev proxy. All HTTP calls must hit `http://localhost:8000/api/v1/...` directly.
   - All WS connections must hit `ws://localhost:8000/ws/...` (or `wss://` in prod behind TLS).
   - Ensure backend CORS and WS origins allow the frontend origin during local dev.
   - Decision: absolute bases with no proxy. Dev defaults — `API_BASE: http://localhost:8000/api/v1`, `WS_BASE: ws://localhost:8000`; backend must allow origin `http://localhost:5173`.

Acceptance for Phase 0
- Evidence of understanding captured (this file). No code changes besides this plan.

### Phase 1 — API layer (HTTP types + functions)
- [x] Add shared types
  - File: `src/api/agent.types.ts`
  - Include: `IngestIdeaRequest/Response`, `ClarificationsRequest/Response`, `SaveArtifactsRequest/Response`, `VersionItem`, `ListVersionsResponse`, `RollbackRequest/Response`, WS event types (`StreamStartEvent`, `AiResponseStreamingEvent`, `ArtifactsPreviewEvent`, `AiResponseCompleteEvent`, `WsErrorEvent`), `AgentTurnPayload`
- [x] Implement agent HTTP functions using `request()`
  - File: `src/api/agent.ts`
  - Functions:
    - `ingestIdea(payload: { idea: string; metadata?: Record<string, any> } | FormData)` → `POST http://localhost:8000/api/v1/agent/ingest-idea`
    - `fetchClarifications(projectId: string, body: { initial_idea: string; num_questions: number })` → `POST http://localhost:8000/api/v1/agent/projects/{project_id}/clarifications`
    - `saveArtifacts(projectId: string, body: { prd_markdown: string; mermaid: string; etag?: string })` → `POST http://localhost:8000/api/v1/agent/projects/{project_id}/save-artifacts`
- [x] Implement projects HTTP functions
  - File: `src/api/projects.ts`
  - Functions:
    - `listVersions(projectId: string)` → `GET http://localhost:8000/api/v1/projects/{project_id}/versions`
    - `rollback(projectId: string, version: string)` → `POST http://localhost:8000/api/v1/projects/{project_id}/rollback`
- [x] Normalize existing API modules to absolute base URL
  - Update `src/api/auth.ts`, `src/api/users.ts` to call `http://localhost:8000/api/v1/...` instead of relative `/api/v1/...`.
- [x] Option (preferred): introduce env-configured bases
  - Define `API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1'` and use `new URL(path, API_BASE)`.
  - Define `WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000'` for WebSocket URLs.

Acceptance for Phase 1
- Type-safe functions exist; compile passes; no UI usage yet.

### Phase 2 — WebSocket client for Agent mode
- [x] Add WS client module
  - File: `src/api/wsAgent.ts`
  - Responsibilities:
    - Build absolute URL: `ws://localhost:8000/ws/chats/{chat_id}?token={jwt}` (or `WS_BASE + /ws/...` if env var set)
    - Connect/close lifecycle; backoff reconnect; online/offline awareness
    - `sendAgentTurn(payload: AgentTurnPayload)` with single-flight guard; cap `last_messages` at 10; optional debounce
    - Event parsing and channeling to listeners: `stream_start`, `ai_response_streaming`, `artifacts_preview`, `ai_response_complete`, `error`
    - Concurrency: ignore events not matching the latest `client_run_id`


Acceptance for Phase 2
- Manual test: WS connects directly to `ws://localhost:8000` in dev; can send a mocked `send_message` and receive events from backend (smoke test via console wired in temporary playground).

### Phase 3 — Session state hook (agent orchestration)
- [x] Create orchestrating hook
  - File: `src/hooks/useAgentSession.ts`
  - State:
    - IDs: `projectId`, `chatId`
    - Inputs: `initialIdea`, `clarifications: Array<{ question: string; answer: string }>`
    - Chat: `messages: Array<{ id: string; role: 'user'|'assistant'; content: string; timestamp: string }>` (retain all; cap to last 10 for payload)
    - Drafts: `prdMarkdown`, `mermaid`, `lastGoodMermaid`
    - Lens: `thinkingLensStatus: { discovery: boolean; user_journey: boolean; metrics: boolean; gtm: boolean; risks: boolean }`
    - Versioning: `etag?: string`, `currentVersion?: string`, `versions: VersionItem[]`
    - Flags: `isStreaming`, `unsavedChanges`, `lastUpdated?: string`, `error?: string`, `wsConnected: boolean`
  - Actions:
    - `bootstrapFromIngest(idea: string, files?: File[])` → calls `ingestIdea` and stashes `projectId/chatId`
    - `loadClarifications(numQuestions: number)` → calls `fetchClarifications`, stores questions for modal
    - `setClarificationAnswers(answers)` → persists Q/A in state
    - `connect()` / `disconnect()` → manages `wsAgent`
    - `sendAgentMessage(content: string)` → builds and sends `AgentTurnPayload` with current drafts and last 10 messages
    - `save()` → calls `saveArtifacts`; updates `etag`, version, clears `unsavedChanges`
    - `fetchVersions()` / `rollback(version)` → list + rollback, then refresh drafts
  - Reducers/refs:
    - Keep a `wsRef` and `runIdRef` for correlation
    - Update `lastGoodMermaid` after successful render confirmation from `FlowchartView` via callback or optimistic heuristics

Acceptance for Phase 3
- Hook unit compiles; no UI wiring yet; mocked storybook or console can change state without runtime errors.

### Phase 4 — Home flow wiring (gate workspace by clarifications)
- [x] Modify `Index.tsx`
  - On Generate click:
    - Validate idea non-empty; collect optional files
    - Call `bootstrapFromIngest(idea, files?)`
    - Open Clarification modal
  - In modal open handler:
    - Call `loadClarifications(numQuestions)` using simple input-quality heuristic (longer/vaguer → more questions)
    - Render returned `questions` (replace static defaults)
  - On modal submit:
    - Store Q/A via `setClarificationAnswers`
    - Navigate to `/workspace/:projectId/:chatId`
- [x] Clarifications UI adjustments
  - Reuse `ClarificationModal` to render a single list if server questions provided
  - Keep keyboard submit (Ctrl/Cmd+Enter), close handler, and validation (ensure each lens has at least one answer or warn)

Acceptance for Phase 4
- After Generate+answers, navigation occurs; no WS errors; workspace not reachable without answering clarifications.

### Phase 5 — Workspace route + component integration
- [x] Add route wrapper
  - File: `src/pages/Workspace.tsx`
  - Read `projectId`, `chatId` from URL; protect with `RequireAuth`
  - On mount: `connect()`; on unmount: `disconnect()`
- [x] Wire `Workspace` component to session state
  - `PRDEditor` value→ `prdMarkdown`; `onChange` marks `unsavedChanges`
  - `FlowchartView` code→ `mermaid` (fallback to `lastGoodMermaid` on render error)
  - `ThinkingLensChips` from `thinkingLensStatus`
  - Chat `onSend` → `sendAgentMessage` (disable while `isStreaming`)
  - On first mount: auto-send initial agent run with idea + Q/A

Acceptance for Phase 5
- Initial agent run streams PRD then Mermaid; chat bubbles show deltas; editor locks while streaming; no overlapping sends allowed.

### Phase 6 — Save, Versions, and Rollback
- [x] Implement Save button
  - Click → `save()` with `{ prd_markdown, mermaid, etag }`
  - On success: show toast, update version label and `etag`, clear `unsavedChanges`
  - On 409: open conflict modal with actions
- [x] Versions UI
  - History click → `fetchVersions()` and show list with timestamps and changes
  - Rollback selection → `rollback(version)`; update drafts and version; mark as saved

Acceptance for Phase 6
- Able to save and see version info; rollback updates editors; 409 path is user-resolvable.

### Phase 7 — Resilience & UX polish
- [x] WebSocket robustness
  - Reconnect with backoff; refresh token on reconnect; show transient banner on reconnecting state
  - Ignore stale events by `client_run_id`
- [x] Editor/Send guards
  - Disable PRD edits and Send while streaming; show small banner/tooltips
- [x] Mermaid resilience
  - Maintain `lastGoodMermaid`; if new code fails to render, keep previous diagram and surface a non-blocking warning
- [x] Unsaved indicator
  - Show “Unsaved changes” badge if drafts differ from last saved + `etag`
- [x] Error handling
  - Surface HTTP/WS errors via `use-toast`; redirect to `/login` on persistent 401s

Acceptance for Phase 7
- Smooth UX across intermittent network; minimal footguns during streaming/saving.

### Phase 8 — Configuration & Env (no proxy)
- [x] Centralize base URLs (env-driven)
  - `VITE_API_BASE` default `http://localhost:8000/api/v1`
  - `VITE_WS_BASE` default `ws://localhost:8000`
- [x] Ensure backend CORS/WS origins allow the frontend origin in dev and prod

Acceptance for Phase 8
- All HTTP calls use `API_BASE` absolute URLs; WS uses `WS_BASE`. No reliance on Vite proxy.

### Phase 9 — Manual QA checklist
- [ ] Login → idea → clarifications → workspace
- [ ] Initial run streams PRD then Mermaid; chat deltas visible
- [ ] Iteration run updates drafts again; no overlap allowed
- [ ] Save returns version + etag; unsaved indicator resets
- [ ] History lists versions; rollback applies
- [ ] WS reconnect after server restart resumes OK; token refresh during session OK
- [ ] Mermaid invalid code preserves last good diagram
- [ ] 409 during save shows conflict modal and is resolvable

### Phase 10 — Future enhancements (post-MVP backlog)
- [ ] File attachment ingestion UI on Home (plus button → files[] into multipart)
- [ ] “Think” mode non-mutating chat channel (HTTP or WS) when backend supports it
- [ ] Autosave with debounced `saveArtifacts` and optimistic `etag` handling
- [ ] Version diff viewer (PRD and Mermaid)
- [ ] Project list and recent items on Home

Notes
- Follow existing code style and token refresh semantics.
- Keep types explicit; avoid `any` in exported APIs.
- Respect payload constraints in `docs/agent.md` (always include `base_prd_markdown` and `base_mermaid`; cap `last_messages` at 10).

