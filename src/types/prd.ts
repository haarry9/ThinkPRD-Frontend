/**
 * TypeScript types for PRD Builder API integration
 */

// Base API response types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
}

// Session management types
export type SessionStage = 'init' | 'plan' | 'build' | 'assemble' | 'review' | 'export';
export type SectionStatus = 'pending' | 'in_progress' | 'completed' | 'stale';

export interface SessionCreateRequest {
  user_id: string;
  idea: string;
}

export interface SessionCreateResponse extends ApiResponse {
  session_id: string;
  stage: SessionStage;
  needs_input: boolean;
}

export interface MessageRequest {
  message: string;
}

export interface MessageResponse extends ApiResponse {
  session_id: string;
  stage: SessionStage;
  needs_input: boolean;
  current_section?: string;
}

// PRD Section types
export interface PRDSection {
  key: string;
  title: string;
  content: string;
  status: SectionStatus;
  completion_score: number;
  last_updated: string;
  dependencies?: string[];
  checklist_items?: string[];
}

export interface PRDDraftResponse extends ApiResponse {
  session_id: string;
  normalized_idea: string;
  professional_title: string; // Added missing field from API docs
  current_stage: SessionStage;
  current_section?: string;
  sections_completed: Record<string, PRDSection>;
  sections_in_progress: Record<string, PRDSection>;
  prd_snapshot: string;
  issues: string[];
  progress: string;
}

// Diagram types
export type FlowchartType = 'system_architecture' | 'user_flow' | 'data_flow' | 'deployment';
export type ERDiagramType = 'database_schema' | 'data_model' | 'user_data_structure' | 'api_schema';
export type DiagramType = FlowchartType | ERDiagramType;

// Enhanced diagram interfaces for multiple diagrams
export interface DiagramMetadata {
  id: string;
  type: DiagramType;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isSaved: boolean;
  tags?: string[];
}

export interface DiagramData extends DiagramMetadata {
  mermaidCode: string;
  prdSectionsUsed: string[];
  thumbnail?: string; // Base64 encoded thumbnail
}

export interface FlowchartRequest {
  flowchart_type?: FlowchartType;
}

export interface FlowchartResponse extends ApiResponse {
  session_id: string;
  flowchart_type: FlowchartType;
  mermaid_code: string;
  prd_sections_used: string[];
  generated_at: string;
  cached: boolean;
}

export interface ERDiagramRequest {
  diagram_type?: ERDiagramType;
}

export interface ERDiagramResponse extends ApiResponse {
  session_id: string;
  diagram_type: ERDiagramType;
  mermaid_code: string;
  prd_sections_used: string[];
  generated_at: string;
}

// File upload types
export interface FileUploadRequest extends MessageRequest {
  files?: File[];
}

// Session persistence types
export interface SessionSaveResponse extends ApiResponse {
  session_id: string;
  prd_id: string;
  saved_at: string;
}

export interface SessionVersion {
  version_id: string;
  created_at: string;
  description: string;
  data?: any;
}

export interface SessionVersionsResponse extends ApiResponse {
  session_id: string;
  versions: SessionVersion[];
}

export interface SessionVersionResponse extends ApiResponse {
  session_id: string;
  version: SessionVersion;
}

// Server-Sent Events types
export interface SSEMessage {
  stage?: SessionStage;
  current_section?: string;
  needs_input?: boolean;
  last_message?: string;
  progress?: string;
  error?: string;
}

// Client-side state types
export interface PRDSessionState {
  sessionId: string | null;
  status: 'idle' | 'loading' | 'active' | 'error' | 'completed';
  stage: SessionStage | null;
  currentSection: string | null;
  needsInput: boolean;
  lastMessage: string | null;
  progress: string | null;
  sections: PRDSection[];
  sectionsCompleted: Record<string, PRDSection>;
  sectionsInProgress: Record<string, PRDSection>;
  prdContent: string;
  // Updated diagrams structure to support multiple diagrams per type
  diagrams: Record<DiagramType, DiagramData[]>;
  diagramsLoading: Record<DiagramType, boolean>;
  selectedDiagrams: Record<DiagramType, string | null>; // Currently selected diagram ID for each type
  errors: string[];
  lastUpdated: Date | null;
}

export interface PRDSessionContextType {
  state: PRDSessionState;
  actions: {
    createSession: (userId: string, idea: string) => Promise<void>;
    sendMessage: (message: string, files?: File[]) => Promise<void>;
    generateDiagram: (type: DiagramType) => Promise<void>;
    saveSession: () => Promise<void>;
    exportPRD: () => Promise<void>;
    refinePRD: () => Promise<void>;
    clearSession: () => void;
    // Diagram management actions
    updateDiagram: (type: DiagramType, diagramId: string, updates: Partial<DiagramData>) => void;
    deleteDiagram: (type: DiagramType, diagramId: string) => void;
    selectDiagram: (type: DiagramType, diagramId: string | null) => void;
    saveDiagram: (type: DiagramType, diagramId: string) => void;
    setError: (error: string) => void;
    clearError: () => void;
    updatePRDContent: (content: string) => void;
  };
}

// All available PRD section keys - Updated to match API docs exactly
export const PRD_SECTIONS = [
  'problem_statement',
  'goals', 
  'success_metrics',
  'user_personas',
  'core_features',
  'user_flows',
  'technical_architecture',
  'constraints',
  'risks',
  'timeline',
  'open_questions',
  'out_of_scope',
  'future_ideas'
] as const;

export type PRDSectionKey = typeof PRD_SECTIONS[number];

// Diagram type configurations
export const FLOWCHART_TYPES: Record<FlowchartType, string> = {
  system_architecture: 'System Architecture',
  user_flow: 'User Flow',
  data_flow: 'Data Flow',
  deployment: 'Deployment'
};

export const ER_DIAGRAM_TYPES: Record<ERDiagramType, string> = {
  database_schema: 'Database Schema',
  data_model: 'Data Model',
  user_data_structure: 'User Data Structure',
  api_schema: 'API Schema'
};