import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, FileText, GitBranch, Link2, Save, History, Send, ChevronLeft, ChevronRight } from "lucide-react";
import PRDEditor from "@/components/PRDEditor";
import FlowchartView from "@/components/FlowchartView";
import ModeSegmented from "@/components/sidebar/ModeSegmented";
import ChatPanel from "@/components/chat/ChatPanel";

export interface VersionInfo {
  version: string;
  timestamp: string;
  changes: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Props {
  initialPRD: string;
  initialFlow: string;
  initialLens: Record<string, boolean>;
  versions: VersionInfo[];
}

export default function Workspace({ initialPRD, initialFlow, initialLens: _initialLens, versions }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [prd, setPrd] = useState(initialPRD);
  const [flow, setFlow] = useState(initialFlow);
  const [mode, setMode] = useState<"think" | "agent">("agent");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", role: "assistant", content: "Welcome! Ask me to refine any PRD section.", timestamp: new Date().toISOString() }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { id: Math.random().toString(), role: "user", content: chatInput, timestamp: new Date().toISOString() };
    const botMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "assistant",
      content: mode === "agent" ? "Applied your request to the PRD (mock)." : "Brainstorming thoughts without changing the PRD (mock).",
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setChatInput("");
    setIsTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, botMsg]);
      setIsTyping(false);
      setLastUpdated(new Date().toLocaleTimeString());
    }, 700);
  };

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
            <div className="flex items-center gap-2 hover:bg-muted/50 rounded px-2 py-1">
              <Link2 className="h-4 w-4" /> {!collapsed && <span>Assets</span>}
            </div>
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
        {/* Wrap header + content in the same Tabs so the list can live in the header */}
        <Tabs defaultValue="prd" className="flex-1 min-h-0 flex flex-col">
          <div className="h-12 border-b flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <TabsList className="h-8">
                <TabsTrigger value="prd">PRD</TabsTrigger>
                <TabsTrigger value="flow">Flowchart</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm"><History className="h-4 w-4 mr-1"/>History</Button>
              <Button size="sm"><Save className="h-4 w-4 mr-1"/>Save</Button>
            </div>
          </div>

          <div className="p-4 flex-1 min-h-0 overflow-auto">
            <TabsContent value="prd" className="mt-0">
              <PRDEditor value={prd} onChange={setPrd} />
            </TabsContent>
            <TabsContent value="flow" className="mt-0">
              <FlowchartView code={flow} />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Right sidebar */
      }
      <aside className="w-96 border-l bg-sidebar flex flex-col h-full shrink-0 overflow-hidden">
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
              onSend={sendMessage}
              isTyping={isTyping}
              lastUpdated={lastUpdated}
            />
          </div>
          <div className="shrink-0">
            <ModeSegmented compact value={mode} onChange={setMode} />
          </div>
        </div>
      </aside>
    </div>
  );
}
