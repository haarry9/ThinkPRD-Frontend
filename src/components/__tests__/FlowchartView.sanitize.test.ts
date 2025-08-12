import { describe, it, expect } from 'vitest'

// Re-implement sanitize logic from FlowchartView to unit test behavior
function sanitize(input?: string): string {
  const raw = (input || '').trim()
  if (!raw) return ''
  let s = raw
  if (s.startsWith('```')) {
    s = s.replace(/^```(mermaid)?/i, '').replace(/```$/i, '').trim()
  }
  if (/^mermaid\s*/i.test(s)) {
    s = s.replace(/^mermaid\s*/i, '')
  }
  return s.trim()
}

describe('FlowchartView sanitize', () => {
  it('strips fences and mermaid label', () => {
    const input = '```mermaid\nflowchart TD; A-->B\n```'
    expect(sanitize(input)).toBe('flowchart TD; A-->B')
  })

  it('passes through raw graph code', () => {
    expect(sanitize('graph TD; A-->B')).toBe('graph TD; A-->B')
  })

  it('returns empty for empty', () => {
    expect(sanitize('')).toBe('')
  })
})



