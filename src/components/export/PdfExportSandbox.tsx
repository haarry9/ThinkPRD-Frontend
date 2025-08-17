import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { mermaid, initializeMermaid, sanitizeMermaid, renderMermaidSafe } from '@/utils/mermaid'

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
          try {
            const svg = await renderMermaidSafe(`mmd-export-${Math.random().toString(36).slice(2)}`, sanitized)
            if (!cancelled) {
              flowRef.current.innerHTML = svg
            }

            // Ensure text elements are visible in PDF export by applying high contrast styles
            const svgElement = flowRef.current.querySelector('svg')
            if (svgElement) {
              // Inline critical computed styles so svg2pdf doesn't miss CSS variables
              const inlineSvgStyles = (root: Element) => {
                const importantProps = [
                  'fill', 'stroke', 'stroke-width', 'font-size', 'font-family', 'font-weight', 'opacity', 'color', 'text-anchor',
                ]
                const all = root.querySelectorAll('*')
                all.forEach((el) => {
                  const cs = window.getComputedStyle(el as Element)
                  importantProps.forEach((prop) => {
                    const val = cs.getPropertyValue(prop)
                    if (val) (el as HTMLElement).style.setProperty(prop, val)
                  })
                })
              }

              inlineSvgStyles(svgElement)
              // Force dark text colors for all text elements (target text and tspans explicitly)
              const textElements = svgElement.querySelectorAll('text, tspan, .nodeLabel, .edgeLabel, .label')
              textElements.forEach((el: any) => {
                el.style.fill = '#000'
                el.style.color = '#000'
                el.style.stroke = 'none'
              })
              
              // Ensure stroke colors are visible
              const pathElements = svgElement.querySelectorAll('.edgePath .path, .flowchart-link')
              pathElements.forEach((el: any) => {
                el.style.stroke = '#1f2937'
              })
              
              // Ensure node backgrounds are light with dark borders
              const nodeElements = svgElement.querySelectorAll('.node rect, .node circle, .node ellipse, .node polygon')
              nodeElements.forEach((el: any) => {
                el.style.fill = '#f5f5f5'
                el.style.stroke = '#1f2937'
                el.style.strokeWidth = '1px'
              })

              // Edge label backgrounds to white to guarantee contrast in PDF
              const edgeLabelRects = svgElement.querySelectorAll('.edgeLabel rect')
              edgeLabelRects.forEach((el: any) => {
                el.style.fill = '#ffffff'
                el.style.stroke = '#e5e7eb'
              })
            }
            
            // Add a small delay to ensure DOM is fully updated before PDF generation
            await new Promise(resolve => setTimeout(resolve, 120))
          } catch (error) {
            console.error('Mermaid rendering error for PDF export (safe):', error)
            // If rendering fails, keep a visible message so the user knows where it failed
            if (flowRef.current) {
              flowRef.current.innerHTML = '<pre style="color:#b91c1c;">Mermaid render error. Check syntax.</pre>'
            }
          }
        }
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
        <section id="export-flowchart" style={{ pageBreakBefore: 'always' as any, background: '#ffffff' }}>
          <h2>Flowchart</h2>
          <div ref={flowRef} />
        </section>
      )}

      {Boolean((schemaMarkdown || '').trim()) && (
        <section id="export-schema" style={{ pageBreakBefore: 'always' as any, background: '#ffffff' }}>
          <h2>Schema</h2>
          <div className="prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{schemaMarkdown || ''}</ReactMarkdown>
          </div>
        </section>
      )}
    </div>
  )
}
