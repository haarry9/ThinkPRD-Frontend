import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { useAgentSessionContext } from '@/context/AgentSessionContext'
import { generateSchema } from '@/api/agent'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = { embedded?: boolean }

export default function SchemaView({ embedded }: Props) {
  const { projectId, chatId } = useParams()
  const session = useAgentSessionContext()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [hint, setHint] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const prd = session.state.prdMarkdown || ''

  const canGenerate = useMemo(() => prd.trim().length > 0, [prd])

  useEffect(() => {
    if (!projectId || !chatId) return
    // Do not auto-generate on mount. Only render last content or empty state.
    setLoading(false)
    return () => {
      // Do not disconnect the workspace WS when leaving SchemaView
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [projectId, chatId, canGenerate])

  const body = (
    <div className="p-4 flex-1 min-h-0 overflow-auto">
      {session.state.isSchemaLoading ? (
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Generating schema…</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-primary" />
              <span>Analysing PRD and preparing a structured Markdown schema.</span>
            </div>
            {hint && (
              <div className="mt-3 text-xs">This is taking longer than usual. Still working…</div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="prose dark:prose-invert max-w-3xl mx-auto">
          {session.state.schemaMarkdown ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{session.state.schemaMarkdown}</ReactMarkdown>
          ) : (
            <div className="text-muted-foreground">No schema generated yet. Click “Update Schema” to generate from the current PRD.</div>
          )}
        </div>
      )}
    </div>
  )

  if (embedded) return body

  return (
    <div className="h-screen overflow-hidden flex w-full ambient-spotlight">
      <main className="flex-1 min-h-0 flex flex-col">
        <div className="h-12 border-b flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-medium">Schema</span>
            {!!provider && (
              <span className="text-xs text-muted-foreground">{provider}{model ? ` • ${model}` : ''}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const prdText = (session.state.prdMarkdown || '').trim()
                if (!prdText) {
                  toast({ title: 'Schema', description: 'Please generate or edit your PRD before generating a schema.' })
                  return
                }
                // Trigger generation via session so button text/state can update globally
                setHint(false)
                const timer = window.setTimeout(() => setHint(true), 10_000)
                try {
                  await session.generateSchema()
                } catch (e: any) {
                  toast({ title: 'Schema generation failed', description: e?.message || 'Unknown error' })
                } finally {
                  window.clearTimeout(timer)
                }
              }}
            >
              {session.state.schemaEverGenerated ? 'Update Schema' : 'Update Schema'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/workspace/${encodeURIComponent(projectId || '')}/${encodeURIComponent(chatId || '')}`)}>
              Back to Workspace
            </Button>
          </div>
        </div>
        {body}
      </main>
    </div>
  )
}


