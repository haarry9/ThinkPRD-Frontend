import React, { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePRDSession } from "@/contexts/PRDSessionContext";
import { Clock, CheckCircle, AlertCircle, Circle } from "lucide-react";

interface Props {
  value?: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
}

export default function PRDEditor({ value: propValue, onChange, disabled }: Props) {
  const { state, actions } = usePRDSession();

  // Use PRD content from context if no value prop is provided
  const value = propValue !== undefined ? propValue : state.prdContent;

  // Handle content changes - update context and call external onChange if provided
  const handleContentChange = (newContent: string) => {
    // Update the context state for real-time preview
    actions.updatePRDContent(newContent);

    // Call external onChange if provided (for external control)
    if (onChange) {
      onChange(newContent);
    }
  };

  // Calculate progress
  const completedSections = Object.keys(state.sectionsCompleted).length;
  const totalSections = 13; // As defined in API docs
  const progressPercentage = Math.round((completedSections / totalSections) * 100);

  const getSectionStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'stale':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSectionStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'in_progress':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'stale':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Section Status Overview */}
      {(Object.keys(state.sectionsCompleted).length > 0 || Object.keys(state.sectionsInProgress).length > 0) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Section Status</h4>
          <div className="flex flex-wrap gap-2">
            {Object.values(state.sectionsCompleted).map((section, index) => (
              <Badge
                key={`completed-${section.key || index}`}
                variant="outline"
                className={`text-xs ${getSectionStatusColor(section.status)}`}
              >
                <div className="flex items-center gap-1">
                  {getSectionStatusIcon(section.status)}
                  <span>{section.title}</span>
                </div>
              </Badge>
            ))}
            {Object.values(state.sectionsInProgress).map((section, index) => (
              <Badge
                key={`progress-${section.key || index}`}
                variant="outline"
                className={`text-xs ${getSectionStatusColor(section.status)}`}
              >
                <div className="flex items-center gap-1">
                  {getSectionStatusIcon(section.status)}
                  <span>{section.title}</span>
                </div>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* PRD Editor Tabs */}
      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit" className="mt-2">
          <Textarea
            className="min-h-[420px] font-mono text-sm"
            value={value || ''}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={state.sessionId ? "PRD content will appear here as it's generated..." : "# Product Requirements Document\n\nCreate a session to start building your PRD..."}
            disabled={disabled}
          />
        </TabsContent>
        
        <TabsContent value="preview" className="mt-2">
          <div className="prose prose-invert max-w-none min-h-[420px] px-6">
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                {state.sessionId ? (
                  <div className="text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                    <p>PRD content is being generated...</p>
                    {state.currentSection && (
                      <p className="text-sm mt-1">Currently working on: {state.currentSection}</p>
                    )}
                  </div>
                ) : (
                  <p>No PRD content yet. Start by creating a session.</p>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
