import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ingestIdea, fetchClarifications, saveArtifacts } from '@/api/agent'
import type {
  IngestIdeaResponse,
  ClarificationsResponse,
  SaveArtifactsResponse,
  ClarificationQA,
  ChatMessage,
  AgentTurnPayload,
  VersionItem,
} from '@/api/agent.types'
import { listVersions as apiListVersions, rollback as apiRollback } from '@/api/projects'
import { WsAgentClient } from '@/api/wsAgent'
import type { AgentResumePayload, AgentInterruptRequestEvent, FlowchartTurnPayload } from '@/api/agent.types'

export type ThinkingLensStatus = {
  discovery: boolean
  user_journey: boolean
  metrics: boolean
  gtm: boolean
  risks: boolean
}

export type SessionMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export type UseAgentSessionState = {
  // IDs
  projectId?: string
  chatId?: string
  // Inputs
  initialIdea: string
  clarifications: Array<{ question: string; answer: string }>
  // Chat
  messages: SessionMessage[]
  // Drafts
  prdMarkdown: string
  mermaid: string
  lastGoodMermaid: string
  // Lens
  thinkingLensStatus: ThinkingLensStatus
  sectionsStatus?: Record<string, boolean>
  // Versioning
  etag?: string
  currentVersion?: string
  versions: VersionItem[]
  // Flags
  isStreaming: boolean
  unsavedChanges: boolean
  lastUpdated?: string
  error?: string
  wsConnected: boolean
  // Flowchart-only run flags
  isFlowchartStreaming?: boolean
  flowProgress?: string
  // HITL
  pendingQuestion?: { question_id: string; question: string; lens?: string; rationale?: string }
  uiOverrides?: {
    thinkingLensStatus?: Partial<ThinkingLensStatus>
  }
  // Live assistant stream preview for chat bubble
  streamingAssistantContent?: string
}

export type UseAgentSessionApi = {
  state: UseAgentSessionState
  // Actions
  bootstrapFromIngest: (idea: string, files?: File[]) => Promise<IngestIdeaResponse>
  loadClarifications: (numQuestions: number, overrideProjectId?: string, overrideIdea?: string) => Promise<ClarificationsResponse>
  setClarificationAnswers: (answers: Array<{ question: string; answer: string }>) => void
  setIds: (projectId: string, chatId: string) => void
  reset: () => void
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  sendAgentMessage: (content: string, opts?: { silent?: boolean }) => Promise<void>
  sendChatMessage: (content: string) => Promise<void>
  isBusy: () => boolean
  save: () => Promise<SaveArtifactsResponse>
  saveForce: () => Promise<SaveArtifactsResponse>
  fetchVersions: () => Promise<void>
  rollback: (version: string) => Promise<void>
  setPrdMarkdown: (value: string) => void
  setMermaid: (value: string) => void
  markMermaidRendered: (ok: boolean) => void
  clearError: () => void
  applyServerDrafts: (prd: string, mmd: string) => void
  // HITL controls
  answerPendingQuestion: (text: string) => Promise<void>
  setLensOverride: (key: keyof ThinkingLensStatus, next: boolean) => void
}

function nowIso(): string {
  return new Date().toISOString()
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function useAgentSession(): UseAgentSessionApi {
  const [state, setState] = useState<UseAgentSessionState>(() => ({
    initialIdea: '',
    clarifications: [],
    messages: [],
    prdMarkdown: '',
    mermaid: '',
    lastGoodMermaid: '',
    thinkingLensStatus: { discovery: false, user_journey: false, metrics: false, gtm: false, risks: false },
    versions: [],
    isStreaming: false,
    unsavedChanges: false,
    wsConnected: false,
    streamingAssistantContent: '',
    isFlowchartStreaming: false,
  }))

  const wsRef = useRef<WsAgentClient | null>(null)
  const runIdRef = useRef<string | undefined>(undefined)
  const aiStreamBufferRef = useRef<string>('')

  // Derived helpers
  const chatMessagesForPayload = useCallback((): ChatMessage[] => {
    return state.messages.map((m) => ({ role: m.role, content: m.content }))
  }, [state.messages])

  const ensureWsClient = useCallback(() => {
    if (wsRef.current) return wsRef.current
    if (!state.chatId) throw new Error('chatId is not set')
    const client = new WsAgentClient(state.chatId, { reconnect: true })
    client.setConnectionListener({
      onConnected: () => setState((s) => ({ ...s, wsConnected: true })),
      onDisconnected: () => setState((s) => ({ ...s, wsConnected: false })),
    })
    // Wire events
    client.on('stream_start', (e) => {
      const kind = (e as any)?.data?.kind
      if (kind === 'flowchart') {
        setState((s) => ({ ...s, isFlowchartStreaming: true, wsConnected: true }))
        return
      }
      setState((s) => ({ ...s, isStreaming: true, wsConnected: true, streamingAssistantContent: '' }))
      aiStreamBufferRef.current = ''
    })
    client.on('ai_response_streaming', (e) => {
      aiStreamBufferRef.current += e.data.delta || ''
      const preview = aiStreamBufferRef.current
      // Show live stream in chat pane
      setState((s) => ({ ...s, streamingAssistantContent: preview }))
    })
    client.on('artifacts_preview', (e) => {
      const kind = (e as any)?.data?.kind
      if (kind === 'flowchart') {
        setState((s) => ({
          ...s,
          mermaid: e.data.mermaid ?? s.mermaid,
          unsavedChanges: true,
          lastUpdated: nowIso(),
        }))
        return
      }
      setState((s) => ({
        ...s,
        prdMarkdown: e.data.prd_markdown ?? s.prdMarkdown,
        mermaid: e.data.mermaid ?? s.mermaid,
        thinkingLensStatus: e.data.thinking_lens_status ?? s.thinkingLensStatus,
        sectionsStatus: e.data.sections_status ?? s.sectionsStatus,
        unsavedChanges: true,
        lastUpdated: nowIso(),
      }))
    })
    client.on('ai_response_complete', (e) => {
      const kind = (e as any)?.data?.kind
      if (kind === 'flowchart') {
        setState((s) => ({ ...s, isFlowchartStreaming: false, lastUpdated: nowIso() }))
        aiStreamBufferRef.current = ''
        return
      }
      const content = aiStreamBufferRef.current
      if (content) {
        setState((s) => ({
          ...s,
          messages: [...s.messages, { id: uuid(), role: 'assistant', content, timestamp: nowIso() }],
          isStreaming: false,
          lastUpdated: nowIso(),
          streamingAssistantContent: '',
        }))
      } else {
        setState((s) => ({ ...s, isStreaming: false, lastUpdated: nowIso(), streamingAssistantContent: '' }))
      }
      aiStreamBufferRef.current = ''
    })
    // If a question is pending and assistant completes an ack, keep pendingQuestion as-is
    // so the next user message routes to answerPendingQuestion.
    client.on('agent_interrupt_request', (e) => {
      const data = (e as AgentInterruptRequestEvent).data
      setState((s) => ({
        ...s,
        pendingQuestion: data,
        isStreaming: false,
        streamingAssistantContent: '',
        // Do NOT push the agent question here; it will be acknowledged by the agent itself
        messages: s.messages,
      }))
    })
    client.on('agent_interrupt_cleared', () => {
      setState((s) => ({ ...s, pendingQuestion: undefined }))
    })
    client.on('message_sent', (e: any) => {
      try {
        const evt = e as { type: 'message_sent'; data: { content: string; message_type: 'user' | 'assistant'; timestamp: string } }
        setState((s) => ({
          ...s,
          messages: [
            ...s.messages,
            {
              id: uuid(),
              role: evt.data.message_type === 'assistant' ? 'assistant' : 'user',
              content: evt.data.content,
              timestamp: evt.data.timestamp || nowIso(),
            },
          ],
        }))
      } catch {}
    })
    client.on('error', (e) => {
      const kind = (e as any)?.data?.kind
      if (kind === 'flowchart') {
        setState((s) => ({ ...s, error: e.data.message || 'WebSocket error', isFlowchartStreaming: false }))
        aiStreamBufferRef.current = ''
        return
      }
      setState((s) => ({ ...s, error: e.data.message || 'WebSocket error', isStreaming: false, streamingAssistantContent: '' }))
      aiStreamBufferRef.current = ''
    })
    wsRef.current = client
    return client
  }, [state.chatId])

  const connect = useCallback(async () => {
    const client = ensureWsClient()
    await client.connect()
    // Best-effort mark connected shortly after
    setTimeout(() => {
      setState((s) => ({ ...s, wsConnected: client.isConnected() }))
    }, 50)
  }, [ensureWsClient])

  const disconnect = useCallback(async () => {
    if (wsRef.current) {
      await wsRef.current.disconnect()
    }
    wsRef.current = null
    setState((s) => ({ ...s, wsConnected: false }))
  }, [])

  const setIds = useCallback((projectId: string, chatId: string) => {
    setState((s) => ({ ...s, projectId, chatId }))
  }, [])

  const reset = useCallback(() => {
    // Disconnect WS and clear all volatile state
    if (wsRef.current) {
      wsRef.current.disconnect().catch(() => {})
      wsRef.current = null
    }
    runIdRef.current = undefined
    aiStreamBufferRef.current = ''
    setState({
      initialIdea: '',
      clarifications: [],
      messages: [],
      prdMarkdown: '',
      mermaid: '',
      lastGoodMermaid: '',
      thinkingLensStatus: { discovery: false, user_journey: false, metrics: false, gtm: false, risks: false },
      versions: [],
      isStreaming: false,
      unsavedChanges: false,
      wsConnected: false,
    })
  }, [])

  const bootstrapFromIngest = useCallback(async (idea: string, files?: File[]) => {
    // Persist idea immediately
    setState((s) => ({ ...s, initialIdea: idea }))
    let res: IngestIdeaResponse
    if (files && files.length > 0) {
      const fd = new FormData()
      fd.set('idea', idea)
      for (const f of files) fd.append('files[]', f)
      res = await ingestIdea(fd)
    } else {
      res = await ingestIdea({ idea })
    }
    setState((s) => ({ ...s, projectId: res.project_id, chatId: res.chat_id }))
    return res
  }, [])

  const loadClarifications = useCallback(
    async (numQuestions: number, overrideProjectId?: string, overrideIdea?: string) => {
      const projectIdLocal = overrideProjectId ?? state.projectId
      if (!projectIdLocal) throw new Error('projectId is not set')
      const ideaLocal = overrideIdea ?? state.initialIdea
      const body = { initial_idea: ideaLocal, num_questions: numQuestions }
      const res: ClarificationsResponse = await fetchClarifications(projectIdLocal, body)
      // Seed clarifications with empty answers
      const clarifications: ClarificationQA[] = res.questions.map((q) => ({ question: q, answer: '' }))
      setState((s) => ({ ...s, clarifications }))
      return res
    },
    [state.projectId, state.initialIdea]
  )

  const setClarificationAnswers = useCallback((answers: Array<{ question: string; answer: string }>) => {
    setState((s) => ({ ...s, clarifications: answers }))
  }, [])

  const answerPendingQuestion = useCallback(async (text: string) => {
    if (!wsRef.current) throw new Error('WebSocket is not connected')
    const q = state.pendingQuestion
    if (!q) throw new Error('No pending question')
    // Interpret special commands
    const payload: AgentResumePayload = text === '__FINISH__'
      ? { accept: { question_id: q.question_id, finish: true } }
      : (text.trim().length > 0
          ? { answer: { question_id: q.question_id, text } }
          : { accept: { question_id: q.question_id } })
    // Optimistically append the user's answer to chat
    if (text && text !== '__FINISH__') {
      setState((s) => ({
        ...s,
        messages: [...s.messages, { id: uuid(), role: 'user', content: text, timestamp: nowIso() }],
      }))
    }
    await wsRef.current.sendAgentResume(payload)
  }, [state.pendingQuestion])

  const sendAgentMessage = useCallback(async (content: string, opts?: { silent?: boolean }) => {
    const { projectId, prdMarkdown, mermaid, initialIdea, clarifications } = state
    if (!projectId || !state.chatId) throw new Error('projectId/chatId not set')

    // During HITL, always send the raw message; backend will classify whether it's an answer

    const client = ensureWsClient()
    if (client.isBusy()) {
      throw new Error('Generation in progress. Please wait for the current run to finish.')
    }
    const clientRunId = uuid()
    runIdRef.current = clientRunId
    // Push user message immediately unless silent
    if (!opts?.silent) {
      setState((s) => ({
        ...s,
        messages: [...s.messages, { id: uuid(), role: 'user', content, timestamp: nowIso() }],
        error: undefined,
      }))
    } else {
      setState((s) => ({ ...s, error: undefined }))
    }
    const payload: AgentTurnPayload = {
      mode: 'agent',
      project_id: projectId,
      content,
      last_messages: chatMessagesForPayload(),
      initial_idea: initialIdea,
      clarifications,
      base_prd_markdown: prdMarkdown,
      base_mermaid: mermaid,
      client_run_id: clientRunId,
      ui_overrides: state.uiOverrides?.thinkingLensStatus
        ? { thinking_lens_status: state.uiOverrides.thinkingLensStatus }
        : undefined,
      // Ensure initial runs do not request flowcharts
      generate_flowchart: false,
    }
    const clientInstance = ensureWsClient()
    await clientInstance.connect()
    await clientInstance.sendAgentTurn(payload)
  }, [state, chatMessagesForPayload, ensureWsClient, answerPendingQuestion])

  const sendChatMessage = useCallback(async (content: string) => {
    const { projectId } = state
    if (!projectId || !state.chatId) throw new Error('projectId/chatId not set')
    const client = ensureWsClient()
    await client.connect()
    // Optimistic user echo
    setState((s) => ({
      ...s,
      messages: [...s.messages, { id: uuid(), role: 'user', content, timestamp: nowIso() }],
      error: undefined,
    }))
    await client.sendChatTurn({
      mode: 'chat',
      project_id: projectId,
      content,
      last_messages: chatMessagesForPayload(),
    })
  }, [state, ensureWsClient, chatMessagesForPayload])

  const setLensOverride = useCallback((key: keyof ThinkingLensStatus, next: boolean) => {
    setState((s) => ({
      ...s,
      uiOverrides: {
        thinkingLensStatus: { ...(s.uiOverrides?.thinkingLensStatus || {}), [key]: next },
      },
    }))
  }, [])

  const isBusy = useCallback(() => {
    return !!state.isStreaming || !!state.isFlowchartStreaming || !!wsRef.current?.isBusy()
  }, [state.isStreaming, state.isFlowchartStreaming])

  const generateFlowchart = useCallback(async () => {
    const { projectId, prdMarkdown, mermaid } = state
    if (!projectId || !state.chatId) throw new Error('projectId/chatId not set')
    const client = ensureWsClient()
    if (client.isBusy()) throw new Error('Generation in progress. Please wait to finish.')
    await client.connect()
    setState((s) => ({ ...s, isFlowchartStreaming: true, flowProgress: mermaid ? 'updating flowchart…' : 'generating flowchart…' }))
    const payload: FlowchartTurnPayload = {
      mode: 'flowchart',
      project_id: projectId,
      base_prd_markdown: prdMarkdown,
      base_mermaid: mermaid || state.lastGoodMermaid || undefined,
      client_run_id: uuid(),
    }
    await client.sendFlowchartTurn(payload)
  }, [state, ensureWsClient])

  const save = useCallback(async () => {
    const { projectId, prdMarkdown, mermaid, etag } = state
    if (!projectId) throw new Error('projectId is not set')
    const res = await saveArtifacts(projectId, { prd_markdown: prdMarkdown, mermaid, etag })
    setState((s) => ({
      ...s,
      etag: res.etag,
      currentVersion: res.version,
      unsavedChanges: false,
      lastUpdated: nowIso(),
    }))
    return res
  }, [state])

  const saveForce = useCallback(async () => {
    const { projectId, prdMarkdown, mermaid } = state
    if (!projectId) throw new Error('projectId is not set')
    const res = await saveArtifacts(projectId, { prd_markdown: prdMarkdown, mermaid })
    setState((s) => ({
      ...s,
      etag: res.etag,
      currentVersion: res.version,
      unsavedChanges: false,
      lastUpdated: nowIso(),
    }))
    return res
  }, [state])

  const fetchVersions = useCallback(async () => {
    const { projectId } = state
    if (!projectId) throw new Error('projectId is not set')
    const list = await apiListVersions(projectId)
    setState((s) => ({ ...s, versions: list.versions }))
  }, [state])

  const rollback = useCallback(async (version: string) => {
    const { projectId } = state
    if (!projectId) throw new Error('projectId is not set')
    await apiRollback(projectId, version)
    // After rollback, reflect current version; drafts refresh can be handled later when content is fetched.
    setState((s) => ({ ...s, currentVersion: version, unsavedChanges: false }))
  }, [state])

  const setPrdMarkdown = useCallback((value: string) => {
    setState((s) => ({ ...s, prdMarkdown: value, unsavedChanges: true }))
  }, [])

  const setMermaid = useCallback((value: string) => {
    setState((s) => ({ ...s, mermaid: value, unsavedChanges: true }))
  }, [])

  const markMermaidRendered = useCallback((ok: boolean) => {
    if (!ok) return
    setState((s) => ({ ...s, lastGoodMermaid: s.mermaid || s.lastGoodMermaid }))
  }, [])

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: undefined }))
  }, [])

  const applyServerDrafts = useCallback((prd: string, mmd: string) => {
    setState((s) => ({
      ...s,
      prdMarkdown: prd,
      mermaid: mmd,
      lastGoodMermaid: mmd || s.lastGoodMermaid,
      unsavedChanges: false,
      lastUpdated: nowIso(),
    }))
  }, [])

  // Cleanup event listeners and WS on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.disconnect().catch(() => {})
      wsRef.current = null
    }
  }, [])

  return {
    state,
    bootstrapFromIngest,
    loadClarifications,
    setClarificationAnswers,
    setIds,
    reset,
    connect,
    disconnect,
    sendAgentMessage,
    sendChatMessage,
    isBusy,
    save,
    saveForce,
    fetchVersions,
    rollback,
    setPrdMarkdown,
    setMermaid,
    markMermaidRendered,
    clearError,
    applyServerDrafts,
    generateFlowchart,
    // HITL
    answerPendingQuestion,
    setLensOverride,
  }
}

