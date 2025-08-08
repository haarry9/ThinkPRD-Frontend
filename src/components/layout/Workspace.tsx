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

export default function Workspace({ initialPRD, initialFlow, initialLens, versions }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [prd, setPrd] = useState(initialPRD);
  const [flow, setFlow] = useState(initialFlow);
  const [mode, setMode] = useState<"think" | "agent">("agent");
  const [lens, setLens] = useState(initialLens);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", role: "assistant", content: "Welcome! Ask me to refine any PRD section.", timestamp: new Date().toISOString() }
  ]);
  const [chatInput, setChatInput] = useState("");

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { id: Math.random().toString(), role: "user", content: chatInput, timestamp: new Date().toISOString() };
    const botMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "assistant",
      content: mode === "agent" ? "Applied your request to the PRD (mock)." : "Brainstorming thoughts without changing the PRD (mock).",
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg, botMsg]);
    setChatInput("");
  };

  return (
    <div className="min-h-screen flex w-full ambient-spotlight" onMouseMove={(e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      e.currentTarget.style.setProperty('--x', x + '%');
      e.currentTarget.style.setProperty('--y', y + '%');
    }}>
      {/* Left panel */}
      <aside className={`border-r bg-sidebar ${collapsed ? 'w-16' : 'w-64'} transition-all`}>
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
      <main className="flex-1">
        {/* Wrap header + content in the same Tabs so the list can live in the header */}
        <Tabs defaultValue="prd">
          <div className="h-12 border-b flex items-center justify-between px-4">
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

          <div className="p-4">
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
      <aside className="w-80 border-l bg-sidebar">
        <div className="h-12 border-b px-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> <span>PRD Agent</span>
        </div>
        <div className="p-3 space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Mode</div>
            <div className="flex gap-2">
              <Button variant={mode==='think' ? 'default' : 'secondary'} size="sm" onClick={() => setMode('think')}>Think</Button>
              <Button variant={mode==='agent' ? 'default' : 'secondary'} size="sm" onClick={() => setMode('agent')}>Agent</Button>
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-2">Thinking Lens</div>
            <div className="space-y-2">
              {Object.entries(lens).map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={v} onCheckedChange={(c) => setLens((prev) => ({...prev, [k]: !!c}))} />
                  <span className={v ? 'text-foreground' : 'text-muted-foreground'}>{k.replace('_',' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Chat</div>
            <div className="h-64 overflow-auto space-y-3 border rounded p-2 bg-card">
              {messages.map((m) => (
                <div key={m.id} className={`text-sm ${m.role==='assistant' ? 'text-foreground' : 'text-primary'}`}>
                  <span className="font-medium">{m.role === 'assistant' ? 'AI' : 'You'}:</span> {m.content}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder={mode==='agent' ? 'Ask to update PRD...' : 'Brainstorm...'} value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
              <Button onClick={sendMessage}><Send className="h-4 w-4"/></Button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
