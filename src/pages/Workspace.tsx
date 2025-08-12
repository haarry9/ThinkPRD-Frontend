import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, GitBranch, Link2, History, Save, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import PRDEditor from '@/components/PRDEditor'
import FlowchartView from '@/components/FlowchartView'
import SchemaView from './SchemaView'
import ModeSegmented from '@/components/sidebar/ModeSegmented'
import ChatPanel from '@/components/chat/ChatPanel'
import { useAgentSessionContext } from '@/context/AgentSessionContext'
import { uploadProjectFiles, listProjectFiles } from '@/api/projects'
import { ENABLE_FLOWCHART_BUTTON } from '@/api/config'
/* no longer using inline HITL input banner */

export default function WorkspacePage() {
  const { projectId, chatId } = useParams()
  const navigate = useNavigate()
  const session = useAgentSessionContext()
  const [collapsed, setCollapsed] = useState(false)
  const [mode, setMode] = useState<'chat' | 'agent'>('agent')
  const [activeTab, setActiveTab] = useState<'prd' | 'flow' | 'schema'>('prd')
  const [chatInput, setChatInput] = useState('')
  const initialRunSentRef = useRef(false)
  const wsReadyRef = useRef(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; filename: string; url?: string }>>([])

  // Connect/disconnect lifecycle
  useEffect(() => {
    if (projectId && chatId) {
      // Ensure provider state has IDs for deep links or refresh
      if (session.state.projectId !== projectId || session.state.chatId !== chatId) {
        session.setIds(projectId, chatId)
      }
      session.connect().then(() => {
        wsReadyRef.current = true
      }).catch(() => {})
      return () => {
        // Keep WS connection alive across route changes (e.g., SchemaView)
        wsReadyRef.current = false
      }
    }
  }, [projectId, chatId])
  // Fetch once when project changes
  useEffect(() => {
    const pid = session.state.projectId
    if (!pid) return
    listProjectFiles(pid)
      .then((res) => setUploadedFiles(res.files || []))
      .catch(() => {})
  }, [session.state.projectId])

  // Refresh file list when an attachment finishes indexing
  useEffect(() => {
    const pid = session.state.projectId
    if (!pid) return
    if (session.state.attachmentStatus === 'ready') {
      listProjectFiles(pid)
        .then((res) => setUploadedFiles(res.files || []))
        .catch(() => {})
    }
  }, [session.state.attachmentStatus, session.state.projectId])

  async function onUploadFiles(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const pid = session.state.projectId
      if (!pid) throw new Error('projectId is not set')
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return
      await uploadProjectFiles(pid, files)
      const res = await listProjectFiles(pid)
      setUploadedFiles(res.files || [])
      toast({ title: 'Uploaded', description: `${files.length} file(s) added and indexed` })
      // Trigger lastUpdated bump to refresh UI
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Unknown error' })
    } finally {
      e.currentTarget.value = ''
    }
  }

  // Auto-send initial agent run once (only if PRD is empty - not for restored projects)
  useEffect(() => {
    if (initialRunSentRef.current) return
    if (!session.state.projectId || !session.state.chatId) return
    if (!session.state.wsConnected && !wsReadyRef.current) return
    
    // Skip initial generation if PRD already has content (restored from previous session)
    if (session.state.prdMarkdown && session.state.prdMarkdown.trim()) {
      initialRunSentRef.current = true // Mark as sent to prevent future runs
      return
    }
    
    initialRunSentRef.current = true
    const content = session.state.initialIdea
      ? `Generate a PRD outline only using the shared template. No commentary.`
      : `Generate a PRD outline only using the shared template. No commentary.`
    session.sendAgentMessage(content, { silent: true }).catch(() => {
      initialRunSentRef.current = false
    })
  }, [session.state.projectId, session.state.chatId, session.state.wsConnected, session.state.prdMarkdown])

  const versions = useMemo(() => session.state.versions.map(v => ({
    version: v.version,
    timestamp: v.timestamp,
    changes: v.changes || ''
  })), [session.state.versions])

  const messages = session.state.messages
  const isStreaming = session.state.isStreaming
  const isFlowStreaming = !!session.state.isFlowchartStreaming
  const wsConnected = session.state.wsConnected
  const lastUpdated = session.state.lastUpdated
  // Thinking lens UI removed from sidebar; we still keep state internally in session

  const onSend = () => {
    if (!chatInput.trim()) return
    if (mode === 'agent') {
      // If a question is pending, treat this as the answer to resume the agent
      if (session.state.pendingQuestion) {
        session.answerPendingQuestion(chatInput.trim())
          .then(() => setChatInput(''))
          .catch((e: any) => toast({ title: 'Failed to send answer', description: e?.message || 'Unknown error' }))
        return
      }
      if (isStreaming || session.isBusy()) {
        const msg = 'Generation in progress. Please wait for the current run to finish.'
        toast({ title: 'Agent busy', description: msg })
        return
      }
      // Immediately show local typing indicator for responsiveness
      session.sendAgentMessage(chatInput.trim()).catch((e: any) => {
        const msg = e?.message || 'Failed to send message'
        toast({ title: 'Send failed', description: msg })
      })
      setChatInput('')
    } else {
      // Chat mode: immediate thinking indicator is set in hook
      session.sendChatMessage(chatInput.trim()).catch((e: any) => {
        const msg = e?.message || 'Failed to send message'
        toast({ title: 'Send failed', description: msg })
      })
      setChatInput('')
    }
  }

  const prdValue = session.state.prdMarkdown
  const onPrdChange = (v: string) => {
    if (isStreaming) return
    session.setPrdMarkdown(v)
  }

  const [mermaidOk, setMermaidOk] = useState(true)
  const flowCode = session.state.mermaid || session.state.lastGoodMermaid
  // HITL banner removed; Q/A happens in chat

  return (
    <div className="h-screen overflow-hidden flex w-full ambient-spotlight" onMouseMove={(e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      e.currentTarget.style.setProperty('--x', x + '%');
      e.currentTarget.style.setProperty('--y', y + '%');
    }}>
      {/* Left panel */}
      <aside className={`border-r bg-sidebar ${collapsed ? 'w-16' : 'w-64'} transition-all h-full shrink-0 overflow-hidden`}> 
        <div className="h-12 flex items-center justify-between px-3 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {!collapsed && <span className="font-medium">Project</span>}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight className="h-4 w-4"/> : <ChevronLeft className="h-4 w-4"/>}
          </Button>
        </div>
        <div className="p-3 space-y-2 text-sm">
          <div className="text-muted-foreground">Files</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 hover:bg-muted/50 rounded px-2 py-1">
              <FileText className="h-4 w-4" /> {!collapsed && <span>PRD.md</span>}
            </div>
            <div className="flex items-center gap-2 hover:bg-muted/50 rounded px-2 py-1">
              <GitBranch className="h-4 w-4" /> {!collapsed && <span>Flowchart.mmd</span>}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 px-2 py-1">
                <Link2 className="h-4 w-4" /> {!collapsed && <span>Sources</span>}
              </div>
              {/* Upload moved to chat input (single PDF). Left panel upload control removed. */}
            </div>
            {!collapsed && (
              <div className="pl-8 space-y-1 text-xs text-muted-foreground">
                {uploadedFiles.map((f) => (
                  <div key={f.id} className="truncate">{f.filename}</div>
                ))}
                {uploadedFiles.length === 0 && (
                  <div className="text-muted-foreground/70">No sources yet</div>
                )}
              </div>
            )}
          </div>
          <Separator className="my-2" />
          {!collapsed && (
            <div>
              <div className="text-muted-foreground mb-2">Versions</div>
              <div className="space-y-2">
                {versions.map((v) => (
                  <Card key={v.version} className="bg-card/60">
                    <CardHeader className="py-2">
                      <CardTitle className="text-sm">{v.version} <span className="text-xs text-muted-foreground">• {new Date(v.timestamp).toLocaleString()}</span></CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      {v.changes}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-0 flex flex-col">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 min-h-0 flex flex-col">
          <div className="h-12 border-b flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <TabsList className="h-8">
                <TabsTrigger value="prd">PRD</TabsTrigger>
                <TabsTrigger value="flow">Flowchart</TabsTrigger>
                <TabsTrigger value="schema" onClick={() => {
                  const prd = (session.state.prdMarkdown || '').trim()
                  if (!prd) {
                    toast({ title: 'Schema', description: 'Please generate or edit your PRD before generating a schema.' })
                    return
                  }
                  // Stay embedded; offer a link in the embedded view to open full page
                }}>Schema</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => session.fetchVersions().catch(() => {})}
              >
                <History className="h-4 w-4 mr-1"/>History
              </Button>
              {ENABLE_FLOWCHART_BUTTON && (
              <Button
                size="sm"
                variant="secondary"
                disabled={!session.state.projectId || isStreaming || isFlowStreaming}
                onClick={async () => {
                  try {
                    await session.generateFlowchart()
                    setActiveTab('flow')
                  } catch (e: any) {
                    toast({ title: 'Flowchart', description: e?.message || 'Failed to start flowchart run' })
                  }
                }}
                title={isFlowStreaming ? 'Flowchart run in progress' : ''}
              >
                {session.state.mermaid ? 'Update Flowchart' : 'Generate Flowchart'}
              </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                disabled={!session.state.projectId || session.isBusy()}
                onClick={async () => {
                  const prd = (session.state.prdMarkdown || '').trim()
                  if (!prd) {
                    toast({ title: 'Schema', description: 'Please generate or edit your PRD before generating a schema.' })
                    return
                  }
                  // Auto-generate schema, then show embedded schema view
                  try {
                    await session.generateSchema()
                  } catch (e: any) {
                    toast({ title: 'Schema', description: e?.message || 'Failed to generate schema' })
                    return
                  }
                  setActiveTab('schema')
                }}
                title={session.isBusy() ? 'Disabled while another generation is in progress' : ''}
              >
                {session.state.schemaEverGenerated ? 'Update Schema' : 'Generate Schema'}
              </Button>
              <Button
                size="sm"
                disabled={session.state.isStreaming || !session.state.unsavedChanges}
                onClick={async () => {
                  try {
                    const res = await session.save()
                    toast({ title: 'Saved', description: `Version ${res.version}` })
                  } catch (e: any) {
                    if (e?.status === 409) {
                      // ETag conflict — simple resolution: force save (optimistic choice)
                      toast({ title: 'Conflict detected', description: 'Retrying with latest version...' })
                      try {
                        const res2 = await session.saveForce()
                        toast({ title: 'Saved after refresh', description: `Version ${res2.version}` })
                      } catch (ee: any) {
                        toast({ title: 'Save failed', description: ee?.message || 'Unknown error' })
                      }
                    } else {
                      toast({ title: 'Save failed', description: e?.message || 'Unknown error' })
                    }
                  }
                }}
                title={session.state.isStreaming ? 'Disabled while streaming' : (session.state.unsavedChanges ? '' : 'No changes')}
              >
                <Save className="h-4 w-4 mr-1"/>Save
              </Button>
            </div>
          </div>

          <div className="p-4 flex-1 min-h-0 overflow-auto">
            <TabsContent value="prd" className="mt-0">
              {!wsConnected && (
                <div className="mb-2 flex items-center gap-2 rounded-md border border-border/50 bg-muted/40 text-muted-foreground px-3 py-2 text-xs">
                  <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-primary" />
                  <span>Loading your workspace… restoring previous session.</span>
                </div>
              )}
              {session.state.isStreaming && (
                <div className="mb-2 flex items-center gap-2 rounded-md border border-border/50 bg-muted/40 text-muted-foreground px-3 py-2 text-xs">
                  <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-primary" />
                  <span>
                    {session.state.lastPendingSection
                      ? `Incorporating your answer into “${session.state.lastPendingSection}”…`
                      : 'Building your workspace… streaming PRD. Editing is temporarily disabled.'}
                  </span>
                </div>
              )}
              <PRDEditor value={prdValue} onChange={onPrdChange} disabled={session.state.isStreaming} />
            </TabsContent>
            <TabsContent value="flow" className="mt-0">
              {isFlowStreaming && (
                <div className="mb-2 flex items-center gap-2 rounded-md border border-border/50 bg-muted/40 text-muted-foreground px-3 py-2 text-xs">
                  <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-primary" />
                  <span>{session.state.mermaid ? 'Updating flowchart…' : 'Generating flowchart…'}</span>
                </div>
              )}
            
              <FlowchartView code={flowCode} onRenderResult={(ok) => {
                setMermaidOk(ok)
                session.markMermaidRendered(ok)
              }} />
            </TabsContent>
            <TabsContent value="schema" className="mt-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">Embedded schema preview</div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (session.state.projectId && session.state.chatId) {
                      navigate(`/workspace/${encodeURIComponent(session.state.projectId)}/${encodeURIComponent(session.state.chatId)}/schema`)
                    }
                  }}
                >
                  Open full page
                </Button>
              </div>
              <SchemaView embedded />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Right sidebar */}
      <aside className="w-96 border-l bg-sidebar flex flex-col h-full shrink-0">
        <div className="h-12 border-b px-3 flex items-center gap-2 shrink-0">
          <MessageSquare className="h-4 w-4" /> <span>PRD Agent</span>
        </div>
        <div className="flex-1 min-h-0 p-3 flex flex-col gap-3 overflow-auto">
          <div className="flex-1 min-h-0">
            <ChatPanel
              mode={mode}
              messages={messages}
              input={chatInput}
              setInput={setChatInput}
              onSend={onSend}
              isTyping={isStreaming}
              lastUpdated={lastUpdated}
              disabled={isStreaming || session.isBusy()}
              streamingAssistantContent={session.state.streamingAssistantContent}
              onUploadPdf={async (f) => {
                try {
                  await session.uploadChatAttachment(f)
                } catch (e: any) {
                  toast({ title: 'Upload failed', description: e?.message || 'Unknown error' })
                }
              }}
              attachmentStatus={session.state.attachmentStatus}
            />
          </div>
          <div className="shrink-0">
            <ModeSegmented compact value={mode} onChange={setMode} />
          </div>
        </div>
      </aside>
    </div>
  )
}


