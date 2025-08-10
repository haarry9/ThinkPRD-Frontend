// Shared types for Agent HTTP and WS integration

export type IngestIdeaRequest = {
  idea: string
  metadata?: Record<string, any>
}

export type IngestIdeaResponse = {
  project_id: string
  chat_id: string
  message: string
}

export type ClarificationsRequest = {
  initial_idea: string
  num_questions: number
}

export type ClarificationsResponse = {
  questions: string[]
  by_lens?: {
    discovery?: string[]
    user_journey?: string[]
    metrics?: string[]
    gtm?: string[]
    risks?: string[]
  }
}

export type SaveArtifactsRequest = {
  prd_markdown: string
  mermaid: string
  etag?: string
}

export type SaveArtifactsResponse = {
  prd_url: string
  flowchart_url: string
  version: string
  checkpoint_id: string
  etag: string
}

export type VersionItem = {
  version: string
  timestamp: string
  changes?: string
  prd_url?: string
  flowchart_url?: string
}

export type ListVersionsResponse = {
  versions: VersionItem[]
}

export type RollbackRequest = {
  version: string
}

export type RollbackResponse = {
  message: string
  current_version: string
}

// WS events
export type StreamStartEvent = {
  type: 'stream_start'
  data: { project_id: string; client_run_id?: string }
}

export type AiResponseStreamingEvent = {
  type: 'ai_response_streaming'
  data: { delta: string; is_complete: boolean; provider?: string; model?: string }
}

export type ArtifactsPreviewEvent = {
  type: 'artifacts_preview'
  data: {
    prd_markdown: string
    mermaid: string | null
    thinking_lens_status?: {
      discovery: boolean
      user_journey: boolean
      metrics: boolean
      gtm: boolean
      risks: boolean
    }
    sections_status?: Record<string, boolean>
  }
}

export type AiResponseCompleteEvent = {
  type: 'ai_response_complete'
  data: { message: string; provider?: string; model?: string; response_time_ms?: number }
}

export type WsErrorEvent = {
  type: 'error'
  data: { message: string; code?: string }
}

export type MessageSentEvent = {
  type: 'message_sent'
  data: { message_id: string; user_id: string; content: string; timestamp: string; message_type: 'user' | 'assistant' }
}

export type FileIndexedEvent = {
  type: 'file_indexed'
  data: { project_id: string; file_id: string; filename: string; num_chunks: number }
}

export type AgentInterruptRequestEvent = {
  type: 'agent_interrupt_request'
  data: { question_id: string; question: string; lens?: string; rationale?: string }
}

export type AgentInterruptClearedEvent = {
  type: 'agent_interrupt_cleared'
  data: { question_id: string }
}

export type AgentWsEvent =
  | StreamStartEvent
  | AiResponseStreamingEvent
  | ArtifactsPreviewEvent
  | AiResponseCompleteEvent
  | WsErrorEvent
  | MessageSentEvent
  | AgentInterruptRequestEvent
  | AgentInterruptClearedEvent
  | FileIndexedEvent

// Payloads for client → server (WS)
export type ChatMessage = { role: 'user' | 'assistant'; content: string }
export type ClarificationQA = { question: string; answer: string }
export type Attachment = { name: string; type: string; url: string; text?: string }

export type AgentTurnPayload = {
  mode: 'agent'
  project_id: string
  content: string
  last_messages: ChatMessage[]
  initial_idea?: string
  clarifications?: ClarificationQA[]
  base_prd_markdown: string
  base_mermaid: string
  attachments?: Attachment[]
  client_run_id?: string
  generate_flowchart?: boolean
  ui_overrides?: {
    thinking_lens_status?: Partial<{
      discovery: boolean
      user_journey: boolean
      metrics: boolean
      gtm: boolean
      risks: boolean
    }>
  }
}

export type AgentResumePayload =
  | { answer: { question_id: string; text: string } }
  | { accept: { question_id: string; finish?: boolean } }

