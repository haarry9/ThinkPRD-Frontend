import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { mermaid, initializeMermaid, sanitizeMermaid } from '@/utils/mermaid'

type Props = {
  prdMarkdown: string
  mermaidCode?: string
  schemaMarkdown?: string
  onReady: (root: HTMLElement) => void
}

/**
 * Offscreen, print-friendly DOM for PDF export. Force light theme.
 */
export default function PdfExportSandbox({ prdMarkdown, mermaidCode, schemaMarkdown, onReady }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const flowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initializeMermaid('default')

    const root = rootRef.current
    if (!root) return

    let cancelled = false
    ;(async () => {
      try {
        const sanitized = sanitizeMermaid(mermaidCode)
        if (sanitized && flowRef.current) {
          // Parse first to avoid overlay errors
          await mermaid.parse(sanitized)
          const { svg } = await mermaid.render(`mmd-export-${Math.random().toString(36).slice(2)}`, sanitized)
          if (!cancelled) flowRef.current.innerHTML = svg
        }
      } catch {
        // If rendering fails, leave flowchart empty; export will skip empty node
        if (flowRef.current) flowRef.current.innerHTML = ''
      } finally {
        if (!cancelled) onReady(root)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [prdMarkdown, mermaidCode, schemaMarkdown, onReady])

  return (
    <div
      ref={rootRef}
      id="pdf-export-root"
      style={{ position: 'fixed', left: '-10000px', top: 0, width: 1050, background: '#ffffff', color: '#000000', padding: 24 }}
      className="print-sandbox"
    >
      <section id="export-prd">
        <div className="prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{prdMarkdown || ''}</ReactMarkdown>
        </div>
      </section>

      {Boolean((mermaidCode || '').trim()) && (
        <section id="export-flowchart" style={{ pageBreakBefore: 'always' as any }}>
          <h2>Flowchart</h2>
          <div ref={flowRef} />
        </section>
      )}

      {Boolean((schemaMarkdown || '').trim()) && (
        <section id="export-schema" style={{ pageBreakBefore: 'always' as any }}>
          <h2>Schema</h2>
          <div className="prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{schemaMarkdown || ''}</ReactMarkdown>
          </div>
        </section>
      )}
    </div>
  )
}


