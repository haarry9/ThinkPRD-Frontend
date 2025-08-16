import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Plus, Mic, Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [idea, setIdea] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  
  const ambientRef = useRef<HTMLDivElement | null>(null);

  const start = async () => {
    if (!idea.trim() || isBootstrapping) return;
    setIsBootstrapping(true);
    try {
      // Navigate to mock workspace
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
      navigate('/workspace');
      setIdea("");
    } catch (e) {
      console.error('Navigation failed', e);
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleNewProject = () => {
    const input = document.querySelector('input[placeholder="Ask anything"]') as HTMLInputElement;
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Clarification submit flow removed (HITL incremental questioning replaces it)

  // Previously rendered local Workspace here; now we always stay on Home and navigate to /workspace on submit

  // Animate ambient spotlight on the chat surface
  const updateAmbientFromMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    ambientRef.current?.style.setProperty('--x', `${xPct}%`)
    ambientRef.current?.style.setProperty('--y', `${yPct}%`)
  }

  return (
    <div className="min-h-screen bg-background px-4 pt-14">
      {/* Enhanced top navigation with gradient effects */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/20 bg-card/30 backdrop-blur-xl supports-[backdrop-filter]:bg-card/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.08),0_8px_32px_-8px_hsl(var(--primary)/0.2),0_0_16px_-4px_hsl(var(--accent)/0.1)]">
        <div className="mx-auto max-w-6xl h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* PRD Generator Logo */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 p-1.5 shadow-sm">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* AI Brain/Document hybrid icon */}
                <path 
                  d="M9 2C7.89543 2 7 2.89543 7 4V6H5C3.89543 6 3 6.89543 3 8V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V8C21 6.89543 20.1046 6 19 6H17V4C17 2.89543 16.1046 2 15 2H9Z" 
                  fill="hsl(var(--primary))" 
                  fillOpacity="0.8"
                />
                {/* Document lines representing structured PRD */}
                <path 
                  d="M7 10H17M7 12H15M7 14H13" 
                  stroke="hsl(var(--background))" 
                  strokeWidth="1.2" 
                  strokeLinecap="round"
                />
                {/* AI spark/idea indicator */}
                <circle 
                  cx="18" 
                  cy="5" 
                  r="2" 
                  fill="hsl(var(--accent))" 
                  className="animate-pulse"
                />
              </svg>
            </div>
            <div className="text-lg font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              ThinkPRD
            </div>
          </div>
        </div>
      </nav>

      <div className="space-y-8 animate-enter">
          {/* Modern gradient backdrop with animated elements */}
          <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            {/* Base gradient mesh */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />
            
            {/* Primary gradient orbs */}
            <div className="absolute top-20 left-[10%] w-96 h-96 bg-gradient-radial from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-gradient-radial from-accent/15 via-accent/8 to-transparent rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
            
            {/* Secondary accent elements */}
            <div className="absolute top-1/3 right-[20%] w-64 h-64 bg-gradient-radial from-primary/15 via-primary/5 to-transparent rounded-full blur-2xl animate-bounce" style={{animationDuration: '6s'}} />
            <div className="absolute bottom-1/3 left-[25%] w-48 h-48 bg-gradient-radial from-accent/20 via-accent/10 to-transparent rounded-full blur-2xl animate-bounce" style={{animationDuration: '8s', animationDelay: '1s'}} />
            
            {/* Subtle mesh overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.03),transparent_50%),radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.04),transparent_50%),radial-gradient(circle_at_20%_80%,hsl(var(--primary)/0.02),transparent_50%)]" />
            

          </div>

          {/* Hero section with centered chat box */}
          <section className="w-full max-w-3xl mx-auto text-center space-y-8 min-h-[calc(100vh-3.5rem)] flex flex-col justify-center relative">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">
                AI PRD Generator — Turn Ideas into PRDs
              </h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                Transform one‑liners into complete, consistent PRDs with AI clarification, generation, and iteration.
              </p>
            </div>

            {/* Enhanced chat box with better depth */}
            <div
              ref={ambientRef}
              onMouseMove={updateAmbientFromMouse}
              className="relative bg-card/40 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2 ambient-spotlight shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_20px_60px_-10px_hsl(var(--primary)/0.3),0_0_40px_-10px_hsl(var(--accent)/0.15)] hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.2),0_25px_80px_-10px_hsl(var(--primary)/0.4),0_0_60px_-10px_hsl(var(--accent)/0.2)] transition-shadow duration-300">
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

          </section>
      </div>

      {isBootstrapping && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Creating your workspace…</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
