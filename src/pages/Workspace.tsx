import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, GitBranch, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import PRDEditor from '@/components/PRDEditor'
import FlowchartView from '@/components/FlowchartView'
import ChatPanel, { ChatMessage } from '@/components/chat/ChatPanel'
import ModeSegmented from '@/components/sidebar/ModeSegmented'

export default function WorkspacePage() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'prd' | 'flow'>('prd')
  const [mode, setMode] = useState<'chat' | 'agent'>('agent')
  const [chatInput, setChatInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [prdContent, setPrdContent] = useState(`# Sample PRD: AI Task Manager

## Overview
A smart task management application that uses AI to prioritize and organize tasks based on user behavior and deadlines.

## Features
- AI-powered task prioritization
- Smart deadline detection
- Natural language task input
- Collaborative workspaces
- Mobile and web apps

## User Stories
1. As a busy professional, I want AI to prioritize my tasks so I can focus on what matters most
2. As a team lead, I want to see team workload distribution
3. As a project manager, I want automatic deadline tracking

## Success Metrics
- 40% increase in task completion rates
- 60% reduction in missed deadlines
- 4.5+ app store rating`)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your PRD Agent. I can help you refine and improve your Product Requirements Document. What would you like to work on?',
      timestamp: new Date().toISOString()
    }
  ])

  const [mockFlowchart] = useState(`flowchart TD
    A[Product Idea] --> B[Requirements Gathering]
    B --> C[AI Task Analysis]
    C --> D[Priority Algorithm]
    D --> E[User Interface Design]
    E --> F[Development]
    F --> G[Testing]
    G --> H[Launch]`)

  // Mock responses for different chat modes
  const mockResponses = {
    agent: [
      "I'll help you refine that section of the PRD. Let me suggest some improvements based on best practices.",
      "Great question! I've updated the PRD to include more detailed user stories and acceptance criteria.",
      "I've analyzed your requirements and added some missing technical considerations to the document.",
      "Based on your input, I've enhanced the success metrics section with more specific KPIs."
    ],
    chat: [
      "That's an interesting point about the user experience. Here are some considerations...",
      "From a product perspective, you might want to think about these aspects...",
      "I can help clarify that section. Let me break it down for you...",
      "Good observation! This relates to several other parts of your PRD..."
    ]
  }

  const handleSendMessage = () => {
    if (!chatInput.trim()) return
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setChatInput('')
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const responses = mockResponses[mode]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: randomResponse,
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1500)
  }

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
          </div>
          <Separator className="my-2" />
          {!collapsed && (
            <div>
              <div className="text-muted-foreground mb-2">Versions</div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">v1.0 • Sample PRD</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-0 flex flex-col">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 min-h-0 flex flex-col">
          <div className="border-b px-4 shrink-0">
            <div className="h-12 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TabsList className="h-8">
                  <TabsTrigger value="prd">PRD</TabsTrigger>
                  <TabsTrigger value="flow">Flowchart</TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>

          <div className="p-4 flex-1 min-h-0 overflow-auto">
            <TabsContent value="prd" className="mt-0">
              <PRDEditor 
                value={prdContent} 
                onChange={setPrdContent} 
                disabled={false} 
              />
            </TabsContent>
            <TabsContent value="flow" className="mt-0">
              <FlowchartView code={mockFlowchart} />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Right sidebar with chat */}
      <aside className="w-96 border-l bg-sidebar flex flex-col h-full shrink-0">
        <div className="h-12 border-b px-3 flex items-center gap-2 shrink-0">
          <MessageSquare className="h-4 w-4" /> 
          <span className="font-medium">PRD Agent</span>
        </div>
        <div className="flex-1 min-h-0 p-3 flex flex-col gap-3 overflow-auto">
          <div className="flex-1 min-h-0">
            <ChatPanel
              mode={mode}
              messages={messages}
              input={chatInput}
              setInput={setChatInput}
              onSend={handleSendMessage}
              isTyping={isTyping}
              disabled={isTyping}
            />
          </div>
          <div className="shrink-0 space-y-3">
            <ModeSegmented compact value={mode} onChange={setMode} />
            <div className="text-xs text-muted-foreground text-center">
              UI-only demo • No API integrations
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => navigate('/')}
            >
              ← Back to Home
            </Button>
          </div>
        </div>
      </aside>
    </div>
  )
}


