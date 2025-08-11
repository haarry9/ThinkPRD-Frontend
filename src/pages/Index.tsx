import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth'
import { useMemo } from 'react'
import { Input } from "@/components/ui/input";
import { ArrowRight, Plus, Mic, AudioLines, Loader2 } from "lucide-react";
// ClarificationModal flow disabled for HITL incremental questioning
import { useAgentSessionContext } from '@/context/AgentSessionContext'
// Workspace is now a separate route; home page only boots and navigates

// Removed legacy mock workspace constants

function UserMenu() {
  const { user, signout } = useAuth()
  const navigate = useNavigate()
  const initials = useMemo(() => {
    const name = user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`
    return name.trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'U'
  }, [user])
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
        {initials}
      </div>
      <Button size="sm" variant="ghost" onClick={() => navigate('/profile')}>Profile</Button>
      <Button size="sm" variant="secondary" onClick={() => signout()}>Logout</Button>
    </div>
  )
}

function TopRightNav() {
  const { status } = useAuth()
  const navigate = useNavigate()
  if (status === 'authenticated') return <UserMenu />
  return (
    <Button
      variant="secondary"
      size="sm"
      className="pressable"
      onClick={() => navigate('/login')}
    >
      Sign In
    </Button>
  )
}

const Index = () => {
  const navigate = useNavigate();
  const session = useAgentSessionContext()
  const [idea, setIdea] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(false)
  // HITL: skip pre-chat clarifications; questions will be asked incrementally via WS interrupts
  // Lens state is handled within the workspace via streaming; no local state needed here

  const start = async () => {
    if (!idea.trim() || isBootstrapping) return;
    setIsBootstrapping(true)
    try {
      // Bootstrap: ingest idea
      const ingestRes = await session.bootstrapFromIngest(idea)
      // Navigate directly to workspace; incremental HITL questions will be handled there
      const { project_id, chat_id } = ingestRes
      if (project_id && chat_id) {
        navigate(`/workspace/${encodeURIComponent(project_id)}/${encodeURIComponent(chat_id)}`)
      }
    } catch (e) {
      // Best-effort console log; UI simply re-enables input
      try { console.error('Ingest failed', e) } catch {}
    } finally {
      setIsBootstrapping(false)
    }
  };

  // Clarification submit flow removed (HITL incremental questioning replaces it)

  // Previously rendered local Workspace here; now we always stay on Home and navigate to /workspace on submit

  return (
    <div className="min-h-screen bg-background px-4 pt-14">
      {/* Top navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl h-14 px-4 flex items-center justify-between">
          <div className="text-lg font-semibold tracking-tight">ThinkPRD</div>
          <TopRightNav />
        </div>
      </nav>

      {/* Hero */}
      <section className="w-full max-w-3xl mx-auto text-center space-y-8 animate-enter min-h-[calc(100vh-3.5rem)] flex flex-col justify-center relative">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">AI PRD Generator — Turn Ideas into PRDs</h1>
        <p className="text-muted-foreground text-lg">Transform one‑liners into complete, consistent PRDs with AI clarification, generation, and iteration.</p>

        {/* Slim, modern chat box */}
        <div className="bg-card/60 border rounded-full px-4 py-2 ambient-spotlight">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" disabled={isBootstrapping}>
              <Plus className="h-4 w-4" />
            </Button>
            <Input
              className="flex-1 h-14 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground"
              placeholder="Ask anything"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              disabled={isBootstrapping}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  start();
                }
              }}
            />
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" disabled={isBootstrapping}>
              <Mic className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 pressable" aria-label="Generate PRD" onClick={start} disabled={isBootstrapping}>
              {isBootstrapping ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Recent section removed per design update */}
      </section>

      {isBootstrapping && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Creating your workspace…</span>
          </div>
        </div>
      )}

      {/* Clarification modal is intentionally disabled; HITL handles incremental Q/A in workspace */}
    </div>
  );
};

export default Index;
