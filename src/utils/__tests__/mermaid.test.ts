import { describe, it, expect, vi } from 'vitest'
import { sanitizeMermaid, renderMermaidSafe } from '../mermaid'
import { mermaid } from '../mermaid'

describe('sanitizeMermaid', () => {
  it('removes fences and leading mermaid label', () => {
    const input = '```mermaid\nflowchart TD; A-->B\n```'
    const out = sanitizeMermaid(input)
    expect(out).toContain('flowchart')
    expect(out).not.toContain('```')
    expect(out).not.toMatch(/^mermaid/i)
  })

  it('normalizes line endings and removes trailing commas', () => {
    const input = 'erDiagram\r\nUser {\r\n id int PK,\r\n}\r\n\r\n\r\n'
    const out = sanitizeMermaid(input)
    expect(out).toContain('erDiagram')
    expect(out).not.toContain('\r')
    expect(out).not.toMatch(/,\s*$/m)
  })

  it('should fix double curly braces in ER diagram relationships', () => {
    const input = `erDiagram
    User ||--o{{ HRManager : manage
    User {
      id string
      name string
    }`
    
    const result = sanitizeMermaid(input)
    
    expect(result).toContain('User ||--o{ HRManager : manage')
    expect(result).not.toContain('||--o{{')
  })

  it('should fix various malformed ER diagram syntax', () => {
    const input = `erDiagram
    User ||--o{{ HRManager : manage
    Department ||--|{{ Employee : employs
    Project ||--*{{ Task : contains`
    
    const result = sanitizeMermaid(input)
    
    expect(result).toContain('User ||--o{ HRManager : manage')
    expect(result).toContain('Department ||--|{ Employee : employs')
    expect(result).toContain('Project ||--*{ Task : contains')
    expect(result).not.toMatch(/\|\|--[o|*]\{\{/)
  })
})

// Note: renderMermaidSafe uses mermaid runtime to parse/render which is heavy and requires the DOM.
// We'll only run a minimal smoke test to ensure it throws for empty input.

describe('renderMermaidSafe', () => {
  it('throws on empty input', () => {
    expect(() => renderMermaidSafe('test', '')).rejects.toThrow('Empty mermaid input')
  })

  it('should fix and render ER diagram with malformed syntax', async () => {
    const malformedInput = `erDiagram
    User ||--o{{ HRManager : manage
    User {
      id string
      name string
    }
    HRManager {
      id string
      title string
    }`
    
    // Mock mermaid.parse and mermaid.render to simulate success after fixing
    const mockParse = vi.fn()
    const mockRender = vi.fn().mockResolvedValue({ svg: '<svg>test</svg>' })
    
    // Store original methods
    const originalParse = mermaid.parse
    const originalRender = mermaid.render
    
    try {
      mermaid.parse = mockParse
      mermaid.render = mockRender
      
      const result = await renderMermaidSafe('test-id', malformedInput)
      
      expect(result).toBe('<svg>test</svg>')
      expect(mockParse).toHaveBeenCalled()
      
      // Check that the fixed code was passed to parse
      const parseCall = mockParse.mock.calls[0][0]
      expect(parseCall).toContain('User ||--o{ HRManager : manage')
      expect(parseCall).not.toContain('||--o{{')
    } finally {
      // Restore original methods
      mermaid.parse = originalParse
      mermaid.render = originalRender
    }
  })
})
