import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { FileText, GitBranch, ChevronLeft, ChevronRight, MessageSquare, AlertCircle, Download } from 'lucide-react'
import PRDEditor from '@/components/PRDEditor'
import FlowchartView from '@/components/FlowchartView'
import ChatPanel, { ChatMessage } from '@/components/chat/ChatPanel'
import { usePRDSession } from '@/contexts/PRDSessionContext'
import { pdfExportService } from '@/services'

export default function WorkspacePage() {
  const navigate = useNavigate()
  const { state, actions } = usePRDSession()
  const [collapsed, setCollapsed] = useState(true)
  const [activeTab, setActiveTab] = useState<'prd' | 'flow'>('prd')
  const [mode, setMode] = useState<'chat' | 'agent'>('agent')
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your PRD Agent. I can help you refine and improve your Product Requirements Document. What would you like to work on?',
      timestamp: new Date().toISOString()
    }
  ])
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [chatWidth, setChatWidth] = useState(384) // Default width in pixels
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)

  // Redirect if no session
  useEffect(() => {
    if (!state.sessionId && state.status !== 'loading') {
      navigate('/');
    }
  }, [state.sessionId, state.status, navigate]);

  // Add system messages when state changes
  useEffect(() => {
    if (state.lastMessage && state.lastMessage !== messages[messages.length - 1]?.content) {
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: 'assistant',
        content: state.lastMessage,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, systemMessage]);
    }
  }, [state.lastMessage]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage]);
    const messageContent = chatInput;
    setChatInput('');

    // Send message through API
    try {
      await actions.sendMessage(messageContent, uploadFiles.length > 0 ? uploadFiles : undefined);
      setUploadFiles([]); // Clear files after sending
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadFiles(prev => [...prev, file]);
    // For now, just add to the files list. 
    // In a more advanced implementation, we might show file upload status
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return
    
    const newWidth = window.innerWidth - e.clientX
    const minWidth = 300 // Minimum width
    const maxWidth = 800 // Maximum width
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setChatWidth(newWidth)
    }
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing])

  const handleExportToPDF = async () => {
    try {
      const options = {
        title: 'PRD Document',
        prdContent: state.prdContent || 'No PRD content available',
        diagrams: state.diagrams,
        includeDiagrams: true,
        includeMetadata: true
      };

      const pdfBlob = await pdfExportService.exportToPDF(options);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PRD_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  return (
    <div className="h-screen overflow-hidden flex w-full ambient-spotlight relative" onMouseMove={(e) => {
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
          {/* Session Status */}
          {!collapsed && state.sessionId && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Session</span>
                <Badge variant="outline" className="text-xs">
                  {state.stage}
                </Badge>
              </div>
              {state.currentSection && (
                <div className="text-xs text-muted-foreground">
                  Working on: {state.currentSection}
                </div>
              )}
            </div>
          )}

          <div className="text-muted-foreground">Files</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 hover:bg-muted/50 rounded px-2 py-1">
              <FileText className="h-4 w-4" /> 
              {!collapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>PRD.md</span>
                  {Object.keys(state.sectionsCompleted).length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {Object.keys(state.sectionsCompleted).length}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 hover:bg-muted/50 rounded px-2 py-1">
              <GitBranch className="h-4 w-4" /> 
              {!collapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Diagrams</span>
                  {Object.keys(state.diagrams).length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {Object.keys(state.diagrams).length}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <Separator className="my-2" />
          {!collapsed && (
            <div>
              <div className="text-muted-foreground mb-2">Session Info</div>
              <div className="space-y-2">
                {state.sessionId ? (
                  <div className="text-xs text-muted-foreground">
                    ID: {state.sessionId.slice(0, 8)}...
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No active session
                  </div>
                )}
                {state.progress && (
                  <div className="text-xs text-muted-foreground">
                    Progress: {state.progress}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-0 flex flex-col min-w-0">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 min-h-0 flex flex-col">
          <div className="border-b px-4 shrink-0">
            <div className="h-12 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TabsList className="h-8">
                  <TabsTrigger value="prd">PRD</TabsTrigger>
                  <TabsTrigger value="flow">Diagram Manager</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleExportToPDF} 
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                  Export to PDF
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 flex-1 min-h-0 overflow-auto">
            <TabsContent value="prd" className="mt-0">
              <PRDEditor />
            </TabsContent>
            <TabsContent value="flow" className="mt-0">
              <FlowchartView />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Right sidebar with chat */}
      <aside 
        className="border-l bg-sidebar flex flex-col h-full shrink-0 relative min-w-[300px]"
        style={{ width: `${chatWidth}px` }}
      >
        <div className="h-12 border-b px-3 flex items-center justify-between shrink-0 bg-sidebar">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> 
            <span className="font-medium">PRD Agent</span>
          </div>
          {state.needsInput && (
            <Badge variant="secondary" className="text-xs">
              Waiting for input
            </Badge>
          )}
        </div>
        <div className="flex-1 min-h-0 p-3 flex flex-col gap-3 overflow-hidden">
          {/* Error display */}
          {state.errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2 shrink-0">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{state.errors[0]}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2" 
                  onClick={actions.clearError}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatPanel
              mode={mode}
              onModeChange={setMode}
              messages={messages}
              input={chatInput}
              setInput={setChatInput}
              onSend={handleSendMessage}
              isTyping={state.status === 'loading'}
              disabled={state.status === 'loading' || !state.sessionId}
              onUploadPdf={handleFileUpload}
              attachmentStatus={uploadFiles.length > 0 ? 'ready' : 'idle'}
            />
          </div>
        </div>
        
        {/* Resize handle */}
        <div
          ref={resizeRef}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 transition-colors"
          onMouseDown={handleMouseDown}
        />
      </aside>
    </div>
  )
}


