import { WS_BASE } from '@/api/config'
import { getStoredAccessToken } from '@/api/auth'
import type {
  AgentTurnPayload,
  AgentWsEvent,
  AiResponseCompleteEvent,
  AiResponseStreamingEvent,
  ArtifactsPreviewEvent,
  StreamStartEvent,
  WsErrorEvent,
  AgentInterruptRequestEvent,
  AgentInterruptClearedEvent,
  AgentResumePayload,
  MessageSentEvent,
  FileIndexedEvent,
  FlowchartTurnPayload,
} from '@/api/agent.types'

type ListenerMap = {
  stream_start: Set<(e: StreamStartEvent) => void>
  ai_response_streaming: Set<(e: AiResponseStreamingEvent) => void>
  artifacts_preview: Set<(e: ArtifactsPreviewEvent) => void>
  ai_response_complete: Set<(e: AiResponseCompleteEvent) => void>
  error: Set<(e: WsErrorEvent) => void>
  agent_interrupt_request: Set<(e: AgentInterruptRequestEvent) => void>
  agent_interrupt_cleared: Set<(e: AgentInterruptClearedEvent) => void>
  message_sent: Set<(e: MessageSentEvent) => void>
  file_indexed: Set<(e: FileIndexedEvent) => void>
}

function createListeners(): ListenerMap {
  return {
    stream_start: new Set(),
    ai_response_streaming: new Set(),
    artifacts_preview: new Set(),
    ai_response_complete: new Set(),
    error: new Set(),
    agent_interrupt_request: new Set(),
    agent_interrupt_cleared: new Set(),
    message_sent: new Set(),
    file_indexed: new Set(),
  }
}

function capLastMessages<T extends { role: 'user' | 'assistant'; content: string }>(messages: T[]): T[] {
  if (!Array.isArray(messages)) return []
  const len = messages.length
  return len <= 10 ? messages.slice() : messages.slice(len - 10)
}

export type WsAgentClientOptions = {
  reconnect: boolean
  maxBackoffMs?: number
}

export class WsAgentClient {
  private chatId: string
  private ws: WebSocket | null = null
  private closing = false
  private listeners: ListenerMap = createListeners()
  private runIdLatest: string | undefined
  private sendInFlight = false
  private reconnectAttempt = 0
  private online = true
  private seenMessageIds: Set<string> = new Set()
  private options: Required<WsAgentClientOptions>
  private onConnectedCb: (() => void) | null = null
  private onDisconnectedCb: (() => void) | null = null
  private streamTimeoutId: number | null = null

  constructor(chatId: string, options?: WsAgentClientOptions) {
    this.chatId = chatId
    this.options = {
      reconnect: options?.reconnect ?? true,
      maxBackoffMs: options?.maxBackoffMs ?? 15_000,
    }
    if (typeof window !== 'undefined') {
      this.online = navigator.onLine
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
    }
  }

  setConnectionListener(listeners: { onConnected?: () => void; onDisconnected?: () => void }) {
    this.onConnectedCb = listeners.onConnected || null
    this.onDisconnectedCb = listeners.onDisconnected || null
  }

  on<T extends AgentWsEvent['type']>(type: T, handler: (event: Extract<AgentWsEvent, { type: T }>) => void): () => void {
    const set = (this.listeners as any)[type] as Set<any>
    set.add(handler)
    return () => set.delete(handler)
  }

  off<T extends AgentWsEvent['type']>(type: T, handler: (event: Extract<AgentWsEvent, { type: T }>) => void): void {
    const set = (this.listeners as any)[type] as Set<any>
    set.delete(handler)
  }

  isConnected(): boolean {
    return this.ws != null && this.ws.readyState === WebSocket.OPEN
  }

  async connect(): Promise<void> {
    // If already open, resolve immediately
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return
    // If connecting, wait until open
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      await new Promise<void>((resolve, reject) => {
        const onOpenOnce = () => {
          this.ws?.removeEventListener('open', onOpenOnce)
          resolve()
        }
        const onCloseOnce = () => {
          this.ws?.removeEventListener('close', onCloseOnce)
          reject(new Error('WebSocket closed before opening'))
        }
        this.ws?.addEventListener('open', onOpenOnce)
        this.ws?.addEventListener('close', onCloseOnce)
        // Safety timeout
        setTimeout(() => {
          try { this.ws?.removeEventListener('open', onOpenOnce); this.ws?.removeEventListener('close', onCloseOnce) } catch {}
          if (this.isConnected()) resolve()
        }, 5000)
      })
      return
    }
    this.closing = false
    const token = this.getToken()
    const url = this.buildUrl(this.chatId, token)
    this.ws = new WebSocket(url)
    this.ws.addEventListener('open', this.onOpen)
    this.ws.addEventListener('message', this.onMessage)
    this.ws.addEventListener('close', this.onClose)
    this.ws.addEventListener('error', this.onError)
    await new Promise<void>((resolve, reject) => {
      const onOpenOnce = () => {
        this.ws?.removeEventListener('open', onOpenOnce)
        resolve()
      }
      const onCloseOnce = () => {
        this.ws?.removeEventListener('close', onCloseOnce)
        reject(new Error('WebSocket closed before opening'))
      }
      this.ws?.addEventListener('open', onOpenOnce)
      this.ws?.addEventListener('close', onCloseOnce)
      // Safety timeout
      setTimeout(() => {
        try { this.ws?.removeEventListener('open', onOpenOnce); this.ws?.removeEventListener('close', onCloseOnce) } catch {}
        if (this.isConnected()) resolve()
      }, 5000)
    })
  }

  async disconnect(): Promise<void> {
    this.closing = true
    this.reconnectAttempt = 0
    if (this.ws) {
      try {
        this.ws.removeEventListener('open', this.onOpen)
        this.ws.removeEventListener('message', this.onMessage)
        this.ws.removeEventListener('close', this.onClose)
        this.ws.removeEventListener('error', this.onError)
        this.ws.close()
      } finally {
        this.ws = null
      }
    }
  }

  async sendAgentTurn(payload: AgentTurnPayload): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket is not connected')
    }
    if (this.sendInFlight) {
      throw new Error('An agent run is already in flight')
    }
    const normalized: AgentTurnPayload = {
      ...payload,
      last_messages: capLastMessages(payload.last_messages || []),
      mode: 'agent',
    }
    // Track latest client run id, if provided
    if (normalized.client_run_id) {
      this.runIdLatest = normalized.client_run_id
    }
    this.sendInFlight = true
    try {
      const msg = {
        type: 'send_message',
        data: normalized,
      }
      this.ws!.send(JSON.stringify(msg))
    } finally {
      // Do not reset sendInFlight here; complete will release it
    }
  }

  async sendFlowchartTurn(payload: FlowchartTurnPayload): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket is not connected')
    }
    if (this.sendInFlight) {
      throw new Error('An agent run is already in flight')
    }
    // Flowchart runs are serialized by the same in-flight flag for simplicity
    this.sendInFlight = true
    try {
      const msg = {
        type: 'send_message',
        data: payload,
      }
      this.ws!.send(JSON.stringify(msg))
    } finally {
      // Release on completion/error events as with agent turns
    }
  }

  async sendChatTurn(payload: { mode: 'chat'; project_id: string; content: string; last_messages?: { role: 'user' | 'assistant'; content: string }[] }): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket is not connected')
    }
    const normalized = {
      ...payload,
      last_messages: capLastMessages(payload.last_messages || []),
    }
    const msg = {
      type: 'send_message',
      data: normalized,
    }
    this.ws!.send(JSON.stringify(msg))
  }

  isBusy(): boolean {
    return this.sendInFlight
  }

  private releaseSendFlight = () => {
    this.sendInFlight = false
  }

  private getToken(): string | null {
    try {
      const raw = getStoredAccessToken()
      if (!raw) return null
      return String(raw).trim().replace(/^(Bearer|bearer|JWT|jwt)\s+/, '')
    } catch {
      return null
    }
  }

  private buildUrl(chatId: string, token: string | null): string {
    const base = WS_BASE.endsWith('/') ? WS_BASE.slice(0, -1) : WS_BASE
    const qp = new URLSearchParams()
    if (token) qp.set('token', token)
    return `${base}/ws/chats/${encodeURIComponent(chatId)}?${qp.toString()}`
  }

  private handleOnline = () => {
    this.online = true
    if (!this.isConnected()) {
      this.scheduleReconnect(0)
    }
  }

  private handleOffline = () => {
    this.online = false
  }

  private onOpen = () => {
    this.reconnectAttempt = 0
    try {
      this.onConnectedCb?.()
    } catch {}
  }

  private onMessage = (event: MessageEvent) => {
    try { console.debug('[WS RAW]', (event && (event as any).data) ? String((event as any).data).slice(0, 160) : '') } catch {}
    let parsed: AgentWsEvent | null = null
    try {
      parsed = JSON.parse(event.data)
    } catch {
      // Ignore non-JSON messages
      return
    }
    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) return

    // Concurrency guard: if event carries a client_run_id and it doesn't match latest, ignore
    const anyParsed: any = parsed
    const eventRunId: string | undefined = anyParsed?.data?.client_run_id
    if (eventRunId && this.runIdLatest && eventRunId !== this.runIdLatest) {
      return
    }

    switch (parsed.type) {
      case 'stream_start': {
        try { console.debug('[WS EVT] stream_start') } catch {}
        // Start safety timeout in case complete/error never arrives
        if (this.streamTimeoutId) {
          clearTimeout(this.streamTimeoutId)
          this.streamTimeoutId = null
        }
        this.streamTimeoutId = window.setTimeout(() => {
          if (this.sendInFlight) {
            // Release and emit synthetic error to unblock UI
            this.releaseSendFlight()
            const errEvt = { type: 'error', data: { message: 'Timeout waiting for completion', code: 'STREAM_TIMEOUT' } } as any
            this.emit('error', errEvt)
          }
          this.streamTimeoutId = null
        }, 60_000)
        this.emit('stream_start', parsed as StreamStartEvent)
        break
      }
      case 'ai_response_streaming': {
        try { console.debug('[WS EVT] ai_response_streaming') } catch {}
        this.emit('ai_response_streaming', parsed as AiResponseStreamingEvent)
        break
      }
      case 'artifacts_preview': {
        try { console.debug('[WS EVT] artifacts_preview') } catch {}
        this.emit('artifacts_preview', parsed as ArtifactsPreviewEvent)
        break
      }
      case 'message_sent': {
        try { console.debug('[WS EVT] message_sent') } catch {}
        // De-dupe by message_id
        try {
          const ev = parsed as unknown as MessageSentEvent
          const id = (ev as any)?.data?.message_id
          if (id) {
            if (this.seenMessageIds.has(id)) break
            this.seenMessageIds.add(id)
            if (this.seenMessageIds.size > 200) {
              // bounded memory
              const first = this.seenMessageIds.values().next().value
              this.seenMessageIds.delete(first)
            }
          }
        } catch {}
        this.emit('message_sent', parsed as unknown as MessageSentEvent)
        break
      }
      case 'file_indexed': {
        try { console.debug('[WS EVT] file_indexed') } catch {}
        this.emit('file_indexed', parsed as unknown as FileIndexedEvent)
        break
      }
      case 'agent_interrupt_request': {
        try { console.debug('[WS EVT] agent_interrupt_request') } catch {}
        // Allow user to respond while the agent waits for input
        this.releaseSendFlight()
        if (this.streamTimeoutId) {
          clearTimeout(this.streamTimeoutId)
          this.streamTimeoutId = null
        }
        this.emit('agent_interrupt_request', parsed as AgentInterruptRequestEvent)
        break
      }
      case 'agent_interrupt_cleared': {
        try { console.debug('[WS EVT] agent_interrupt_cleared') } catch {}
        this.emit('agent_interrupt_cleared', parsed as AgentInterruptClearedEvent)
        break
      }
      case 'ai_response_complete': {
        try { console.debug('[WS EVT] ai_response_complete') } catch {}
        this.emit('ai_response_complete', parsed as AiResponseCompleteEvent)
        this.releaseSendFlight()
        if (this.streamTimeoutId) {
          clearTimeout(this.streamTimeoutId)
          this.streamTimeoutId = null
        }
        break
      }
      case 'error': {
        try { console.debug('[WS EVT] error') } catch {}
        this.emit('error', parsed as WsErrorEvent)
        this.releaseSendFlight()
        if (this.streamTimeoutId) {
          clearTimeout(this.streamTimeoutId)
          this.streamTimeoutId = null
        }
        break
      }
      default:
        // Unknown event; ignore
        break
    }
  }

  async sendAgentResume(payload: AgentResumePayload): Promise<void> {
    if (!this.isConnected()) throw new Error('WebSocket is not connected')
    const msg = { type: 'agent_resume', data: payload }
    this.ws!.send(JSON.stringify(msg))
  }

  private onClose = () => {
    this.ws = null
    this.releaseSendFlight()
    try {
      this.onDisconnectedCb?.()
    } catch {}
    if (this.closing) return
    if (!this.options.reconnect) return
    if (!this.online) return
    this.scheduleReconnect()
  }

  private onError = () => {
    // Errors will typically be followed by close; rely on onClose for reconnect
  }

  private scheduleReconnect(initialDelayMs?: number) {
    const delay =
      initialDelayMs ?? Math.min(this.options.maxBackoffMs, 500 * Math.pow(2, this.reconnectAttempt))
    this.reconnectAttempt = Math.min(this.reconnectAttempt + 1, 10)
    window.setTimeout(() => {
      // Refresh token for reconnect
      if (!this.closing && this.online) {
        this.connect().catch(() => {
          // Next close will schedule another attempt
        })
      }
    }, delay)
  }

  private emit<T extends AgentWsEvent['type']>(type: T, event: Extract<AgentWsEvent, { type: T }>) {
    const set = (this.listeners as any)[type] as Set<(e: any) => void>
    set.forEach((cb) => {
      try {
        cb(event)
      } catch (e) {
        // Swallow listener errors
        console.error('WS listener error', e)
      }
    })
  }
}

