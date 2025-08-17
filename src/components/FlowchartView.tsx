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
  X,
  Download
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

  // Get diagram types from service
  const { flowcharts, erDiagrams } = diagramService.getAvailableDiagramTypes();

  // Get current diagrams for selected type
  const currentDiagrams = state.diagrams[selectedDiagram] || [];
  const selectedDiagramData = state.selectedDiagrams[selectedDiagram] 
    ? currentDiagrams.find(d => d.id === state.selectedDiagrams[selectedDiagram])
    : currentDiagrams[0];

  useEffect(() => {
    initializeMermaid('dark');
  }, []);

  const handleGenerateDiagram = async (type: DiagramType) => {
    if (!state.sessionId || state.diagramsLoading[type]) return;
    await actions.generateDiagram(type);
  };

  const handleSaveDiagram = (diagramId: string) => {
    actions.saveDiagram(selectedDiagram, diagramId);
  };

  const handleDeleteDiagram = (diagramId: string) => {
    if (confirm('Are you sure you want to delete this diagram?')) {
      actions.deleteDiagram(selectedDiagram, diagramId);
    }
  };

  const handleSelectDiagram = (diagramId: string) => {
    actions.selectDiagram(selectedDiagram, diagramId);
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
      actions.updateDiagram(selectedDiagram, editingDiagram, {
        name: editForm.name,
        description: editForm.description,
        updatedAt: new Date().toISOString()
      });
      setEditingDiagram(null);
      setEditForm({ name: '', description: '' });
    }
  };

  const handleCancelEdit = () => {
    setEditingDiagram(null);
    setEditForm({ name: '', description: '' });
  };

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
    <div className="w-full space-y-4">
      {/* Header with Export Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Diagram Manager</h3>
        <Button onClick={handleExportToPDF} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export to PDF
        </Button>
      </div>

      {/* Diagram Type Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Diagram Generator</h4>
          {state.sessionId && (
            <Badge variant="outline" className="text-xs">
              Session Active
            </Badge>
          )}
        </div>

        {/* Diagram Category Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="flowcharts">Flowcharts</TabsTrigger>
            <TabsTrigger value="diagrams">ER Diagrams</TabsTrigger>
          </TabsList>

          <TabsContent value="flowcharts" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {flowcharts.map((flowchart) => (
                <Button
                  key={flowchart.type}
                  variant={selectedDiagram === flowchart.type ? "default" : "outline"}
                  size="sm"
                  className="justify-start h-auto p-3"
                  disabled={!state.sessionId}
                  onClick={() => {
                    setSelectedDiagram(flowchart.type);
                    if (!state.diagrams[flowchart.type] || state.diagrams[flowchart.type].length === 0) {
                      handleGenerateDiagram(flowchart.type);
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    {state.diagramsLoading[flowchart.type] ? (
                      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0 mt-0.5" />
                    ) : (
                      getDiagramIcon(flowchart.type)
                    )}
                    <div className="text-left">
                      <div className="font-medium text-xs">{flowchart.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {flowchart.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="diagrams" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {erDiagrams.map((diagram) => (
                <Button
                  key={diagram.type}
                  variant={selectedDiagram === diagram.type ? "default" : "outline"}
                  size="sm"
                  className="justify-start h-auto p-3"
                  disabled={!state.sessionId}
                  onClick={() => {
                    setSelectedDiagram(diagram.type);
                    if (!state.diagrams[diagram.type] || state.diagrams[diagram.type].length === 0) {
                      handleGenerateDiagram(diagram.type);
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    {state.diagramsLoading[diagram.type] ? (
                      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0 mt-0.5" />
                    ) : (
                      getDiagramIcon(diagram.type)
                    )}
                    <div className="text-left">
                      <div className="font-medium text-xs">{diagram.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
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
            size="sm"
            onClick={() => handleGenerateDiagram(selectedDiagram)}
            disabled={state.diagramsLoading[selectedDiagram]}
            className="w-full"
          >
            {state.diagramsLoading[selectedDiagram] ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Generate New {diagramService.isFlowchartType(selectedDiagram) ? 'Flowchart' : 'Diagram'}
          </Button>
        )}
      </div>

      {/* Diagram List and Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Diagram List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Generated Diagrams</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {currentDiagrams.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No diagrams generated yet
              </div>
            ) : (
              currentDiagrams.map((diagram) => (
                <Card 
                  key={diagram.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedDiagramData?.id === diagram.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectDiagram(diagram.id)}
                >
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="truncate">{diagram.name}</span>
                      <div className="flex items-center gap-1">
                        {!diagram.isSaved && (
                          <Badge variant="secondary" className="text-xs">Unsaved</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDiagram(diagram);
                          }}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDiagram(diagram.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xs text-muted-foreground">
                      {diagram.description || 'No description'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(diagram.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Diagram Viewer */}
        <div className="lg:col-span-2">
          {selectedDiagramData ? (
            <div className="space-y-3">
              {/* Diagram Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getDiagramIcon(selectedDiagramData.type)}
                  <span className="text-sm font-medium">
                    {selectedDiagramData.name}
                  </span>
                  {!selectedDiagramData.isSaved && (
                    <Badge variant="secondary" className="text-xs">Unsaved</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!selectedDiagramData.isSaved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveDiagram(selectedDiagramData.id)}
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

              {/* Diagram Renderer */}
              <DiagramRenderer
                code={selectedDiagramData.mermaidCode}
                diagramType={selectedDiagramData.type}
                isGenerating={state.diagramsLoading[selectedDiagram] || false}
                hasSession={!!state.sessionId}
                onRenderResult={onRenderResult}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Select a diagram to view
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
