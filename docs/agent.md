## Agent-Orchestrated PRD Flow (LangGraph + LangChain)

### Summary
- Sign in → Ingest idea → Open workspace → Clarifications (HTTP) → Iterative PRD/Mermaid generation over WebSocket (mode="agent", streamed) → Save (HTTP) to persist and create checkpoints (versions).
- Frontend acts as conductor: it sends last 10 chat turns and current drafts on every turn. Backend LangGraph pipeline remains stateless per-message (no checkpointer).

---

## Auth
- All HTTP endpoints require Authorization header: `Authorization: Bearer {access_token}`.
- WebSocket connects with token query: `wss://{host}/ws/chats/{chat_id}?token={jwt}`.

---

## Model configuration
- Primary provider: Gemini ("gemini-2.5-flash").
- Secondary provider: Groq (fastest inference; e.g., "llama-3.1-8b-instant").
- Tertiary provider: OpenAI ("gpt-4o-mini-2024-07-18").
- Token window target: ~6,000 tokens per turn (prompt + outputs).

---

## Endpoints

### 1) Ingest Idea
- Purpose: create chat + project from a one‑liner idea (optional files).

- Method/Path: POST `/api/v1/agent/ingest-idea`

- Request (JSON)
```
{
  "idea": "One-liner product idea",
  "metadata": { "source": "landing", "campaign": "..." } // optional
}
```

- Request (multipart/form-data; if uploading files)
- Fields:
  - `idea`: string (required)
  - `files[]`: file(s) (optional)

- Response 201
```
{
  "project_id": "64f5a1b2c3d4e5f6789012ab",
  "chat_id": "64f5a1b2c3d4e5f6789012cd",
  "message": "Idea ingested; chat and project created"
}
```

- Errors: 400, 401, 500

---

### 2) Clarifications (Thinking Lens)
- Purpose: fetch clarifying questions to present in a modal.

- Method/Path: POST `/api/v1/agent/projects/{project_id}/clarifications`

- Request (JSON)
```
{
  "initial_idea": "One-liner product idea",
  "num_questions": 5
}
```

- Response 200
```
{
  "questions": [
    "Who is the primary target user?",
    "What is the core job-to-be-done?",
    "What success metrics matter most?",
    "What constraints or compliance requirements apply?",
    "Which go-to-market channels do you expect?"
  
}
```

- Errors: 401, 404, 422, 500

---

### 3) Save Artifacts (Checkpoint + Persistence)
- Purpose: persist current drafts and create a versioned checkpoint.

- Method/Path: POST `/api/v1/agent/projects/{project_id}/save-artifacts`

- Request (JSON)
```
{
  "prd_markdown": "# Product Requirements Document\n...",
  "mermaid": "graph TD\n A[User] --> B[Frontend]\n B --> C[Backend]\n",
  "etag": "optional-etag" // optimistic concurrency
}
```

- Response 200
```
{
  "prd_url": "https://res.cloudinary.com/.../current/prd.md",
  "flowchart_url": "https://res.cloudinary.com/.../current/flowchart.mmd",
  "version": "v1.1",
  "checkpoint_id": "2025-08-09T12:34:56Z",
  "etag": "new-etag"
}
```

- Errors: 401, 404, 409 (etag), 422 (validation), 500

---

### 4) Version History (optional, recommended)

- List Versions (GET `/api/v1/projects/{project_id}/versions`)
- Response 200
```
{
  "versions": [
    {
      "version": "v1.1",
      "timestamp": "2025-08-09T12:34:56Z",
      "changes": "Saved from workspace",
      "prd_url": "https://...",
      "flowchart_url": "https://..."
    }
  ]
}
```

- Rollback (POST `/api/v1/projects/{project_id}/rollback`)
- Request
```
{ "version": "v1.0" }
```
- Response 200
```
{
  "message": "Rolled back to v1.0",
  "current_version": "v1.0"
}
```

---

## WebSocket protocol (mode="agent")

- Connect: `wss://{host}/ws/chats/{chat_id}?token={jwt}`

### Client → Server (send_message, mode="agent")
```
{
  "type": "send_message",
  "data": {
    "mode": "agent",
    "project_id": "64f5a1b2c3d4e5f6789012ab",
    "content": "User instruction or question",
    "last_messages": [
      { "role": "user", "content": "..." },
      { "role": "assistant", "content": "..." }
    ],
    "initial_idea": "A mobile fitness app that...",
    "clarifications": [
      { "question": "Who is the primary user?", "answer": "Busy professionals" }
    ],
    "base_prd_markdown": "# Product Requirements Document\n...",
    "base_mermaid": "graph TD\n A --> B\n",
    "attachments": [
      { "name": "requirements.pdf", "type": "application/pdf", "url": "https://...", "text": "short extracted preview" }
    ],
    "client_run_id": "uuid-optional"
  }
}
```

- Required client fields:
  - `mode`: “agent”
  - `project_id`: string
  - `content`: string
  - `last_messages`: up to 10 recent turns, each with {role, content}
  - `base_prd_markdown`, `base_mermaid`: your current drafts (empty strings allowed)
- Optional:
  - `initial_idea`, `clarifications`, `attachments`, `client_run_id`

### Server → Client (streamed events)
- stream_start
```
{ "type": "stream_start", "data": { "project_id": "...", "client_run_id": "uuid-optional" } }
```
- ai_response_streaming (0..n times)
```
{ "type": "ai_response_streaming", "data": { "delta": "text chunk", "is_complete": false, "provider": "gemini", "model": "gemini-2.5-flash" } }
```
- artifacts_preview (PRD only, then PRD+Mermaid)
```
{ "type": "artifacts_preview",
  "data": {
    "prd_markdown": "# PRD...\n...",
    "mermaid": null,
    "thinking_lens_status": { "discovery": true, "user_journey": true, "metrics": true, "gtm": true, "risks": true }
  }
}
```
```
{ "type": "artifacts_preview",
  "data": {
    "prd_markdown": "# PRD...\n...",
    "mermaid": "graph TD\n A[User] --> B[Frontend]\n B --> C[Backend]\n",
    "thinking_lens_status": { "discovery": true, "user_journey": true, "metrics": true, "gtm": true, "risks": true }
  }
}
```
- ai_response_complete
```
{ "type": "ai_response_complete", "data": { "message": "Artifacts generated", "provider": "gemini", "model": "gemini-2.5-flash", "response_time_ms": 1430 } }
```
- error
```
{ "type": "error", "data": { "message": "Invalid payload", "code": "BAD_REQUEST" } }
```

### Notes
- Backend does not fetch history. It uses client-supplied `last_messages` and current drafts.
- Nothing is persisted during agent mode. Save endpoint is required to persist and version.

---

## Frontend integration (no code)

### State you keep
- Access token
- project_id, chat_id
- initial idea
- clarifications (Q/A list)
- last 10 messages (role + content); drop oldest when adding a new one
- current PRD markdown and Mermaid drafts (what is displayed)
- version/etag after saves
- UI flags (e.g., streaming in progress, temporary stream buffer)

### How to drive the loop
- On workspace load: connect WS with `chat_id`.
- Clarifications: call HTTP endpoint, display modal, store Q/A.
- Initial generation: send WS “send_message” with mode="agent" including:
  - project id, last 10 messages, initial idea, Q/A, and your current drafts (likely empty initially).
- On streamed previews: update PRD and Mermaid panes as events arrive.
- On next user message: send another agent turn with updated last 10 messages and current drafts.
- When satisfied: call Save endpoint with current drafts; store returned urls/version/etag.

### Payload constraints and best practices
- Cap `last_messages` at 10 (include role + content).
- Always include `base_prd_markdown` and `base_mermaid` (empty strings are fine) to guide the model.
- Prefer attachments with short text previews (or URLs) over raw content.
- Debounce sends (e.g., on Send or after a small delay) to avoid overlapping agent runs.
- Handle Mermaid render errors gracefully (keep previous diagram if new one fails to parse).

---

## Typical end-to-end sequence

1) Ingest idea (HTTP)
- Send the one‑liner (and files if needed).
- Receive `project_id` and `chat_id`; navigate to the workspace and connect WS.

2) Clarifications (HTTP)
- Request questions; show modal; collect answers.

3) Initial generation (WS)
- Send an agent turn with: project id, user request, last 10 messages, initial idea, Q/A, empty drafts.
- Receive streamed PRD preview, then PRD+Mermaid preview.

4) Iterate (WS)
- For each new user query, send another agent turn with updated last 10 messages and current drafts.
- Update UI from new previews.

5) Save (HTTP)
- Send current PRD and Mermaid drafts.
- Receive urls/version/checkpoint_id/etag. Update local version and links.

---

## Error responses (HTTP)
- 400: `{ "detail": "Invalid request" }`
- 401: `{ "detail": "Not authenticated" }`
- 404: `{ "detail": "Project not found" }`
- 409: `{ "detail": "Version conflict" }`
- 422: `{ "detail": "Validation error: ..." }`
- 500: `{ "detail": "Internal server error" }`

---

## What the backend LangGraph does per agent turn
- Prepare context (trim drafts, cap last messages, limit attachments).
- Generate PRD (Gemini primary; Groq fast model fallback; OpenAI gpt‑4o‑mini fallback) with token streaming.
- Emit early PRD preview.
- Generate Mermaid from new PRD; emit PRD+Mermaid preview.
- Emit completion message.
- No persistence; Save endpoint handles storage and checkpointing.

---

## Change log markers for versions (Save)
- On Save:
  - Persist `current/prd.md` and `current/flowchart.mmd`.
  - Write a checkpoint in `versions/{timestamp}/` (prd, flowchart, metadata).
  - Update `current_version`, `last_agent_run`, and `thinking_lens_status`.
  - Return `prd_url`, `flowchart_url`, `version`, `checkpoint_id`, and `etag`.

---

This document defines the full flow, HTTP endpoints with payloads, and the WebSocket streaming protocol used for the LangGraph-backed agent iteration loop.
