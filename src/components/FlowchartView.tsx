import { useEffect, useMemo, useRef, useState } from "react";
import { mermaid, initializeMermaid, sanitizeMermaid, renderMermaidSafe } from "@/utils/mermaid";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePRDSession } from "@/contexts/PRDSessionContext";
import { diagramService, pdfExportService } from "@/services";
import type { DiagramType, FlowchartType, ERDiagramType, DiagramData } from "@/types/prd";
import { 
  Loader2, 
  RefreshCw, 
  FileText, 
  Database, 
  Users, 
  Code, 
  Workflow, 
  Share, 
  Server, 
  Building,
  Plus,
  Save,
  Trash2,
  Edit3,
  Check,
  X
} from "lucide-react";

interface Props {
  code?: string;
  onRenderResult?: (ok: boolean) => void;
}

// Diagram type icons mapping
const getDiagramIcon = (type: DiagramType) => {
  switch (type) {
    case 'system_architecture':
      return <Server className="h-4 w-4" />;
    case 'user_flow':
      return <Users className="h-4 w-4" />;
    case 'data_flow':
      return <Workflow className="h-4 w-4" />;
    case 'deployment':
      return <Building className="h-4 w-4" />;
    case 'database_schema':
      return <Database className="h-4 w-4" />;
    case 'data_model':
      return <FileText className="h-4 w-4" />;
    case 'user_data_structure':
      return <Users className="h-4 w-4" />;
    case 'api_schema':
      return <Code className="h-4 w-4" />;
    default:
      return <Share className="h-4 w-4" />;
  }
};

export default function FlowchartView({ code: propCode, onRenderResult }: Props) {
  const { state, actions } = usePRDSession();
  const [activeTab, setActiveTab] = useState<'flowcharts' | 'diagrams'>('flowcharts');
  const [selectedDiagram, setSelectedDiagram] = useState<DiagramType>('system_architecture');
  const [editingDiagram, setEditingDiagram] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [diagramKey, setDiagramKey] = useState(0); // Add this for forcing re-render

  // Get diagram types from service
  const { flowcharts, erDiagrams } = diagramService.getAvailableDiagramTypes();

  // Get ALL diagrams for display (not just selected type)
  const allDiagrams = Object.values(state.diagrams).flat();
  
  // Get current diagrams for selected type (for generation)
  const currentDiagrams = state.diagrams[selectedDiagram] || [];
  const selectedDiagramData = state.selectedDiagrams[selectedDiagram] 
    ? currentDiagrams.find(d => d.id === state.selectedDiagrams[selectedDiagram])
    : currentDiagrams[0];

  useEffect(() => {
    initializeMermaid('dark');
    
    // Add custom scrollbar styles
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-thin::-webkit-scrollbar {
        width: 6px;
      }
      .scrollbar-thin::-webkit-scrollbar-track {
        background: transparent;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb {
        background: hsl(var(--muted-foreground) / 0.2);
        border-radius: 3px;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb:hover {
        background: hsl(var(--muted-foreground) / 0.4);
      }
      .scrollbar-thin {
        scrollbar-width: thin;
        scrollbar-color: hsl(var(--muted-foreground) / 0.2) transparent;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleGenerateDiagram = async (type: DiagramType) => {
    if (!state.sessionId || state.diagramsLoading[type]) return;
    
    // Force diagram viewer to re-render by updating key
    setDiagramKey(prev => prev + 1);
    
    await actions.generateDiagram(type);
  };

  const handleSaveDiagram = (diagramId: string) => {
    // Find the diagram to get its type
    const diagramToSave = allDiagrams.find(d => d.id === diagramId);
    if (diagramToSave) {
      actions.saveDiagram(diagramToSave.type, diagramId);
    }
  };

  const handleDeleteDiagram = (diagramId: string) => {
    if (confirm('Are you sure you want to delete this diagram?')) {
      // Find the diagram to get its type
      const diagramToDelete = allDiagrams.find(d => d.id === diagramId);
      if (diagramToDelete) {
        actions.deleteDiagram(diagramToDelete.type, diagramId);
      }
    }
  };

  const handleSelectDiagram = (diagramId: string) => {
    // Find the diagram to get its type
    const diagramToSelect = allDiagrams.find(d => d.id === diagramId);
    if (diagramToSelect) {
      actions.selectDiagram(diagramToSelect.type, diagramId);
    }
  };

  const handleEditDiagram = (diagram: DiagramData) => {
    setEditingDiagram(diagram.id);
    setEditForm({
      name: diagram.name,
      description: diagram.description || ''
    });
  };

  const handleSaveEdit = () => {
    if (editingDiagram) {
      // Find the diagram to get its type
      const diagramToUpdate = allDiagrams.find(d => d.id === editingDiagram);
      if (diagramToUpdate) {
        actions.updateDiagram(diagramToUpdate.type, editingDiagram, {
          name: editForm.name,
          description: editForm.description,
          updatedAt: new Date().toISOString()
        });
      }
      setEditingDiagram(null);
      setEditForm({ name: '', description: '' });
    }
  };

  const handleCancelEdit = () => {
    setEditingDiagram(null);
    setEditForm({ name: '', description: '' });
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold"></h3>
      </div>

      {/* Diagram Type Selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-foreground">Diagram Generator</h4>
          {state.sessionId && (
            <Badge variant="outline" className="text-xs px-3 py-1 bg-green-50 text-green-700 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Session Active
            </Badge>
          )}
        </div>

        {/* Diagram Category Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
            <TabsTrigger 
              value="flowcharts" 
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Workflow className="w-4 h-4 mr-2" />
              Flowcharts
            </TabsTrigger>
            <TabsTrigger 
              value="diagrams" 
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Database className="w-4 h-4 mr-2" />
              ER Diagrams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flowcharts" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {flowcharts.map((flowchart) => (
                <Button
                  key={flowchart.type}
                  variant={selectedDiagram === flowchart.type ? "default" : "outline"}
                  size="sm"
                  className={`justify-start h-auto p-4 transition-all duration-200 ${
                    selectedDiagram === flowchart.type 
                      ? 'shadow-md scale-[1.02]' 
                      : 'hover:shadow-sm hover:scale-[1.01]'
                  }`}
                  disabled={!state.sessionId}
                  onClick={() => {
                    setSelectedDiagram(flowchart.type);
                    // Don't auto-generate when switching types - let user choose
                  }}
                >
                  <div className="flex items-start gap-3 w-full">
                    {state.diagramsLoading[flowchart.type] ? (
                      <Loader2 className="h-5 w-5 animate-spin flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {getDiagramIcon(flowchart.type)}
                      </div>
                    )}
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground">{flowchart.label}</div>
                      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {flowchart.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="diagrams" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {erDiagrams.map((diagram) => (
                <Button
                  key={diagram.type}
                  variant={selectedDiagram === diagram.type ? "default" : "outline"}
                  size="sm"
                  className={`justify-start h-auto p-4 transition-all duration-200 ${
                    selectedDiagram === diagram.type 
                      ? 'shadow-md scale-[1.02]' 
                      : 'hover:shadow-sm hover:scale-[1.01]'
                  }`}
                  disabled={!state.sessionId}
                  onClick={() => {
                    setSelectedDiagram(diagram.type);
                    // Don't auto-generate when switching types - let user choose
                  }}
                >
                  <div className="flex items-start gap-3 w-full">
                    {state.diagramsLoading[diagram.type] ? (
                      <Loader2 className="h-5 w-5 animate-spin flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {getDiagramIcon(diagram.type)}
                      </div>
                    )}
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground">{diagram.label}</div>
                      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {diagram.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Generate New Diagram Button */}
        {state.sessionId && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleGenerateDiagram(selectedDiagram)}
            disabled={state.diagramsLoading[selectedDiagram]}
            className="w-full h-12 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 hover:shadow-md"
          >
            {state.diagramsLoading[selectedDiagram] ? (
              <Loader2 className="h-5 w-5 animate-spin mr-3" />
            ) : (
              <Plus className="h-5 w-5 mr-3" />
            )}
            Generate New Diagram
          </Button>
        )}
      </div>

      {/* Diagram List and Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Diagram List - Show ALL diagrams */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-foreground">Generated Diagrams</h4>
            <Badge variant="secondary" className="text-xs px-2 py-1">
              {allDiagrams.length} total
            </Badge>
          </div>
          
          <div className="space-y-3">
            {allDiagrams.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">No diagrams generated yet</p>
                <p className="text-xs text-muted-foreground">Generate your first diagram to get started</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40">
                {allDiagrams.map((diagram) => (
                  <Card 
                    key={diagram.id} 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border-muted/50 hover:border-muted-foreground/30 ${
                      selectedDiagramData?.id === diagram.id 
                        ? 'ring-2 ring-primary shadow-lg scale-[1.02] border-primary/50' 
                        : 'hover:bg-muted/30'
                    }`}
                    onClick={() => {
                      // Set the diagram type and select the diagram
                      setSelectedDiagram(diagram.type);
                      handleSelectDiagram(diagram.id);
                    }}
                  >
                    <CardHeader className="p-4 pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            {getDiagramIcon(diagram.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-foreground truncate block">{diagram.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs px-2 py-0.5">
                                {diagram.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                              {diagram.isSaved ? (
                                <Badge variant="default" className="text-xs px-2 py-0.5 bg-green-600/90 text-white">
                                  <Check className="h-3 w-3 mr-1" />
                                  Saved
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                  Unsaved
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-muted-foreground/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDiagram(diagram);
                            }}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDiagram(diagram.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {diagram.description || 'No description provided'}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Created {new Date(diagram.createdAt).toLocaleDateString()}</span>
                          {diagram.mermaidCode && (
                            <span className="px-2 py-1 bg-muted/50 rounded text-xs">
                              {diagram.mermaidCode.length} chars
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Diagram Viewer */}
        <div className="lg:col-span-2">
          {selectedDiagramData ? (
            <div className="space-y-4">
              {/* Diagram Header */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {getDiagramIcon(selectedDiagramData.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {selectedDiagramData.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {selectedDiagramData.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                      {selectedDiagramData.isSaved ? (
                        <Badge variant="default" className="text-xs bg-green-600/90 text-white">
                          <Check className="h-3 w-3 mr-1" />
                          Saved
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Unsaved</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedDiagramData.isSaved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveDiagram(selectedDiagramData.id)}
                      className="hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateDiagram(selectedDiagram)}
                    disabled={state.diagramsLoading[selectedDiagram]}
                    className="hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {state.diagramsLoading[selectedDiagram] ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Regenerate
                  </Button>
                </div>
              </div>

              {/* Diagram Renderer - Add key for forced re-render */}
              <DiagramRenderer
                key={`${selectedDiagramData.id}_${diagramKey}`}
                code={selectedDiagramData.mermaidCode}
                diagramType={selectedDiagramData.type}
                isGenerating={state.diagramsLoading[selectedDiagram] || false}
                hasSession={!!state.sessionId}
                onRenderResult={onRenderResult}
              />
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Select a diagram to view</h3>
              <p className="text-sm text-muted-foreground">Choose a diagram from the left panel to see it rendered here</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Diagram Modal */}
      {editingDiagram && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="text-lg">Edit Diagram</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diagram-name">Name</Label>
                <Input
                  id="diagram-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Enter diagram name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagram-description">Description</Label>
                <Textarea
                  id="diagram-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Enter diagram description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Separate component for rendering individual diagrams
interface DiagramRendererProps {
  code: string;
  diagramType: DiagramType;
  isGenerating: boolean;
  hasSession: boolean;
  onRenderResult?: (ok: boolean) => void;
}

function DiagramRenderer({ code, diagramType, isGenerating, hasSession, onRenderResult }: DiagramRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCodeRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;
    
    (async () => {
      // Only re-render if code actually changed
      if (code === lastCodeRef.current && !isGenerating) {
        return;
      }
      
      lastCodeRef.current = code || '';

      if (!code && !isGenerating) {
        if (containerRef.current) {
          const message = hasSession
            ? `Click to generate ${diagramService.isFlowchartType(diagramType) ? 'flowchart' : 'diagram'}`
            : 'Create a session to generate diagrams';
          containerRef.current.innerHTML = `<div class="flex items-center justify-center h-40 text-muted-foreground text-center"><p>${message}</p></div>`;
        }
        onRenderResult?.(false);
        return;
      }

      if (isGenerating) {
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div class="flex items-center justify-center h-40 text-muted-foreground"><div class="text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div><p>Generating diagram...</p></div></div>`;
        }
        return;
      }

      try {
        const id = `mmd-${Math.random().toString(36).slice(2)}`;
        const sanitized = sanitizeMermaid(code);
        if (!sanitized) {
          if (containerRef.current) {
            containerRef.current.innerHTML = `<div class="flex items-center justify-center h-40 text-muted-foreground"><p>No diagram data available</p></div>`;
          }
          onRenderResult?.(false);
          return;
        }

        try {
          const svg = await renderMermaidSafe(id, sanitized)
          if (!cancelled && containerRef.current) {
            containerRef.current.innerHTML = svg;
            onRenderResult?.(true);
          }
        } catch (err: any) {
          if (containerRef.current) {
            containerRef.current.innerHTML = `<div class="flex items-center justify-center h-40 text-destructive text-center"><p>Diagram render error. Check syntax.</p></div>`;
          }
          console.error('Mermaid render failed (safe):', err)
          onRenderResult?.(false);
        }
      } catch (e) {
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div class="flex items-center justify-center h-40 text-destructive"><p>Diagram render error. Check syntax.</p></div>`;
        }
        onRenderResult?.(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code, diagramType, isGenerating, hasSession]);

  return (
    <div className="w-full">
      <div 
        className="w-full overflow-auto rounded-md border bg-card p-4 min-h-[400px]" 
        ref={containerRef} 
      />
    </div>
  );
}
