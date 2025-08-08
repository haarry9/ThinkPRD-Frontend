import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Plus, Mic, AudioLines } from "lucide-react";
import ClarificationModal, { ClarificationAnswers } from "@/components/ClarificationModal";
import Workspace from "@/components/layout/Workspace";

const MOCK_PRD = `# Product Requirements Document\n\n## Overview\nDescribe your product vision, goals, and context.\n\n## Functional Requirements\n- FR-1: Accept one-liner ideas via chat.\n- FR-2: Generate clarification questions.\n\n## Metrics\n- Activation rate, Time to first PRD.\n\n## GTM\n- Initial reach via PLG and community.\n\n## Risks\n- Scope creep; unclear metrics.\n`;

const MOCK_FLOW = `graph TD\n  A[User] --> B[Frontend UI]\n  B --> C[Clarification Agent]\n  C --> D[PRD Generation]\n  D --> E[Flowchart Agent]\n  B --> F[Chat Manager]\n`;

const MOCK_VERSIONS = [
  { version: "v1.0", timestamp: new Date().toISOString(), changes: "Initial PRD and flowchart generated" },
  { version: "v0.9", timestamp: new Date(Date.now()-86400000).toISOString(), changes: "Added GTM section" },
];

const Index = () => {
  const [idea, setIdea] = useState("");
  const [showClarify, setShowClarify] = useState(false);
  const [workspace, setWorkspace] = useState(false);
  const [lens, setLens] = useState({
    discovery: true,
    user_journey: true,
    metrics: false,
    gtm: true,
    risks: false,
  });

  const start = () => {
    if (!idea.trim()) return;
    setShowClarify(true);
  };

  const handleClarifySubmit = (answers: ClarificationAnswers) => {
    // Mock: mark metrics/risks complete if user wrote anything
    const hasMetrics = (answers.metrics || []).some((a) => a.trim().length > 0);
    const hasRisks = (answers.risks || []).some((a) => a.trim().length > 0);
    setLens((l) => ({ ...l, metrics: hasMetrics || l.metrics, risks: hasRisks || l.risks }));
    setShowClarify(false);
    setWorkspace(true);
  };

  if (workspace) {
    return (
      <>
        <main className="min-h-screen bg-background">
          <Workspace initialPRD={MOCK_PRD} initialFlow={MOCK_FLOW} initialLens={lens} versions={MOCK_VERSIONS} />
        </main>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pt-14">
      {/* Top navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl h-14 px-4 flex items-center justify-between">
          <div className="text-lg font-semibold tracking-tight">ThinkPRD</div>
          <Button variant="secondary" size="sm" className="pressable">Sign In</Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="w-full max-w-3xl mx-auto text-center space-y-8 animate-enter min-h-[calc(100vh-3.5rem)] flex flex-col justify-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">AI PRD Generator — Turn Ideas into PRDs</h1>
        <p className="text-muted-foreground text-lg">Transform one‑liners into complete, consistent PRDs with AI clarification, generation, and iteration.</p>

        {/* Slim, modern chat box */}
        <div className="bg-card/60 border rounded-full px-4 py-2 ambient-spotlight">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
              <Plus className="h-4 w-4" />
            </Button>
            <Input
              className="flex-1 h-14 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground"
              placeholder="Ask anything"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  start();
                }
              }}
            />
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
              <Mic className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 pressable" aria-label="Generate PRD" onClick={start}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Recent section removed per design update */}
      </section>

      <ClarificationModal
        open={showClarify}
        idea={idea}
        onClose={() => setShowClarify(false)}
        onSubmit={handleClarifySubmit}
      />
    </div>
  );
};

export default Index;
