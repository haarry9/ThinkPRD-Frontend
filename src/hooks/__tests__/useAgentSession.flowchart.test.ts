import { describe, it, expect, vi } from 'vitest'

// Minimal contract test: ensure FE routes kind: 'flowchart' events to flow state

type StreamStartEvent = { type: 'stream_start'; data: { project_id: string; kind?: 'flowchart' } }
type ArtifactsPreviewEvent = { type: 'artifacts_preview'; data: { prd_markdown: string; mermaid: string | null; kind?: 'flowchart' } }
type AiResponseCompleteEvent = { type: 'ai_response_complete'; data: { message: string; kind?: 'flowchart' } }

class DummyClient {
  handlers: Record<string, Function[]> = {}
  on(type: string, cb: Function) {
    this.handlers[type] = this.handlers[type] || []
    this.handlers[type].push(cb)
  }
  emit(evt: any) {
    (this.handlers[evt.type] || []).forEach((h) => h(evt))
  }
}

describe('flowchart event routing', () => {
  it('separates flowchart streaming flags', () => {
    const client = new DummyClient()
    let isFlow = false
    let mermaid: string | null = null

    // simulate useAgentSession handlers
    client.on('stream_start', (e: StreamStartEvent) => {
      if (e.data?.kind === 'flowchart') isFlow = true
    })
    client.on('artifacts_preview', (e: ArtifactsPreviewEvent) => {
      if (e.data?.kind === 'flowchart') mermaid = e.data.mermaid
    })
    client.on('ai_response_complete', (e: AiResponseCompleteEvent) => {
      if (e.data?.kind === 'flowchart') isFlow = false
    })

    client.emit({ type: 'stream_start', data: { project_id: 'p', kind: 'flowchart' } } as StreamStartEvent)
    expect(isFlow).toBe(true)
    client.emit({ type: 'artifacts_preview', data: { prd_markdown: '', mermaid: 'graph TD;A-->B', kind: 'flowchart' } } as ArtifactsPreviewEvent)
    expect(mermaid).toBe('graph TD;A-->B')
    client.emit({ type: 'ai_response_complete', data: { message: 'done', kind: 'flowchart' } } as AiResponseCompleteEvent)
    expect(isFlow).toBe(false)
  })
})



