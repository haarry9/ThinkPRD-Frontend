import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { sessionService, prdService, diagramService } from '@/services';

import type { 
  PRDSessionState, 
  PRDSessionContextType,
  SessionStage,
  PRDSection,
  DiagramType,
  PRDDraftResponse,
  DiagramData
} from '@/types/prd';

// Initial state
const initialState: PRDSessionState = {
  sessionId: null,
  status: 'idle',
  stage: null,
  currentSection: null,
  needsInput: false,
  lastMessage: null,
  progress: null,
  sections: [],
  sectionsCompleted: {},
  sectionsInProgress: {},
  prdContent: '',
  diagrams: {} as Record<DiagramType, DiagramData[]>,
  diagramsLoading: {} as Record<DiagramType, boolean>,
  selectedDiagrams: {} as Record<DiagramType, string | null>,
  errors: [],
  lastUpdated: null,
};

// Action types
type PRDSessionAction =
  | { type: 'SET_LOADING' }
  | { type: 'SET_SESSION'; payload: { sessionId: string; stage: SessionStage; needsInput: boolean; message?: string } }
  | { type: 'UPDATE_MESSAGE'; payload: { stage: SessionStage; needsInput: boolean; currentSection?: string; message?: string } }
  | { type: 'UPDATE_PRD_DATA'; payload: { sectionsCompleted: Record<string, PRDSection>; sectionsInProgress: Record<string, PRDSection>; prdContent: string; progress?: string } }
  | { type: 'UPDATE_PRD_CONTENT'; payload: { prdContent: string } }
  | { type: 'SET_DIAGRAM_LOADING'; payload: { type: DiagramType; loading: boolean } }
  | { type: 'ADD_DIAGRAM'; payload: { type: DiagramType; diagram: DiagramData } }
  | { type: 'UPDATE_DIAGRAM'; payload: { type: DiagramType; diagramId: string; updates: Partial<DiagramData> } }
  | { type: 'DELETE_DIAGRAM'; payload: { type: DiagramType; diagramId: string } }
  | { type: 'SELECT_DIAGRAM'; payload: { type: DiagramType; diagramId: string | null } }
  | { type: 'SAVE_DIAGRAM'; payload: { type: DiagramType; diagramId: string } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_SESSION' }


// Reducer function
function prdSessionReducer(state: PRDSessionState, action: PRDSessionAction): PRDSessionState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        status: 'loading',
        errors: [],
      };

    case 'SET_SESSION':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        stage: action.payload.stage,
        needsInput: action.payload.needsInput,
        lastMessage: action.payload.message || null,
        status: 'active',
        errors: [],
        lastUpdated: new Date(),
      };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        stage: action.payload.stage,
        needsInput: action.payload.needsInput,
        currentSection: action.payload.currentSection || state.currentSection,
        lastMessage: action.payload.message || state.lastMessage,
        status: action.payload.needsInput ? 'active' : state.status, // Reset to active when needs input
        lastUpdated: new Date(),
      };

    case 'UPDATE_PRD_DATA':
      return {
        ...state,
        sectionsCompleted: action.payload.sectionsCompleted,
        sectionsInProgress: action.payload.sectionsInProgress,
        prdContent: action.payload.prdContent,
        progress: action.payload.progress || state.progress,
        sections: [
          ...Object.values(action.payload.sectionsCompleted),
          ...Object.values(action.payload.sectionsInProgress)
        ],
        status: state.needsInput ? 'active' : state.status, // Keep active if needs input
        lastUpdated: new Date(),
      };

    case 'UPDATE_PRD_CONTENT':
      return {
        ...state,
        prdContent: action.payload.prdContent,
        lastUpdated: new Date(),
      };

    case 'SET_DIAGRAM_LOADING':
      return {
        ...state,
        diagramsLoading: {
          ...state.diagramsLoading,
          [action.payload.type]: action.payload.loading,
        },
      };

    case 'ADD_DIAGRAM':
      return {
        ...state,
        diagrams: {
          ...state.diagrams,
          [action.payload.type]: [...(state.diagrams[action.payload.type] || []), action.payload.diagram],
        },
        diagramsLoading: {
          ...state.diagramsLoading,
          [action.payload.type]: false,
        },
        lastUpdated: new Date(),
      };

         case 'UPDATE_DIAGRAM':
       return {
         ...state,
         diagrams: {
           ...state.diagrams,
           [action.payload.type]: (state.diagrams[action.payload.type] || []).map(
             (diagram) => (diagram.id === action.payload.diagramId ? { ...diagram, ...action.payload.updates } : diagram)
           ),
         },
         lastUpdated: new Date(),
       };

         case 'DELETE_DIAGRAM':
       return {
         ...state,
         diagrams: {
           ...state.diagrams,
           [action.payload.type]: (state.diagrams[action.payload.type] || []).filter(
             (diagram) => diagram.id !== action.payload.diagramId
             ),
         },
         lastUpdated: new Date(),
       };

    case 'SELECT_DIAGRAM':
      return {
        ...state,
        selectedDiagrams: {
          ...state.selectedDiagrams,
          [action.payload.type]: action.payload.diagramId,
        },
        lastUpdated: new Date(),
      };

              case 'SAVE_DIAGRAM':
        return {
          ...state,
          diagrams: {
            ...state.diagrams,
            [action.payload.type]: (state.diagrams[action.payload.type] || []).map(
              (diagram) => (diagram.id === action.payload.diagramId ? { ...diagram, isSaved: true } : diagram)
            ),
          },
          lastUpdated: new Date(),
        };

    case 'SET_ERROR':
      return {
        ...state,
        status: 'error',
        errors: [...state.errors, action.payload],
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        errors: [],
        status: state.sessionId ? 'active' : 'idle',
      };

    case 'CLEAR_SESSION':
      return {
        ...initialState,
      };



    default:
      return state;
  }
}

// Context
const PRDSessionContext = createContext<PRDSessionContextType | null>(null);

// Provider component
interface PRDSessionProviderProps {
  children: React.ReactNode;
}

export function PRDSessionProvider({ children }: PRDSessionProviderProps) {
  const [state, dispatch] = useReducer(prdSessionReducer, initialState);
  const currentPRDRef = useRef<PRDDraftResponse | null>(null);



  // Fetch PRD data and detect changes
  const fetchAndUpdatePRD = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      const newPRD = await prdService.getPRDDraft(state.sessionId);
      const changes = prdService.detectChanges(currentPRDRef.current, newPRD);

      if (changes.hasChanges) {
        // TODO: Show diff modal here if there are significant changes
        console.log('PRD changes detected:', changes);
      }

      // Update state with new PRD data
      dispatch({
        type: 'UPDATE_PRD_DATA',
        payload: {
          sectionsCompleted: newPRD.sections_completed,
          sectionsInProgress: newPRD.sections_in_progress,
          prdContent: newPRD.prd_snapshot,
          progress: newPRD.progress,
        },
      });

      currentPRDRef.current = newPRD;
    } catch (error) {
      console.error('Failed to fetch PRD:', error);
      // Don't show error for failed PRD fetches as this might be normal during processing
      // Only log to console for debugging
    }
  }, [state.sessionId]);

  // Actions with real API calls
  const actions: PRDSessionContextType['actions'] = {
    createSession: async (userId: string, idea: string) => {
      dispatch({ type: 'SET_LOADING' });
      try {
        const response = await sessionService.createSession(userId, idea);
        
        dispatch({
          type: 'SET_SESSION',
          payload: {
            sessionId: response.session_id,
            stage: response.stage,
            needsInput: response.needs_input,
            message: response.message,
          },
        });

        // Fetch initial PRD data
        await fetchAndUpdatePRD();
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    },

    sendMessage: async (message: string, files?: File[]) => {
      if (!state.sessionId) return;
      
      dispatch({ type: 'SET_LOADING' });
      try {
        let response;
        
        if (files && files.length > 0) {
          response = await sessionService.sendMessageWithFiles(state.sessionId, message, files);
        } else {
          response = await sessionService.sendMessage(state.sessionId, message);
        }

        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            stage: response.stage,
            needsInput: response.needs_input,
            currentSection: response.current_section,
            message: response.message,
          },
        });

        // Fetch updated PRD after a delay
        setTimeout(fetchAndUpdatePRD, 1000);
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    },

    askQuestion: async (message: string) => {
      if (!state.sessionId) return;
      
      try {
        const response = await sessionService.askQuestion(state.sessionId, message);
        return response;
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `Failed to ask question: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        throw error;
      }
    },

    uploadFiles: async (files: File[]) => {
      if (!state.sessionId) return;
      
      try {
        const response = await sessionService.uploadFiles(state.sessionId, files);
        return response;
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        throw error;
      }
    },

    generateDiagram: async (type: DiagramType) => {
      if (!state.sessionId) return;
      
      dispatch({ type: 'SET_DIAGRAM_LOADING', payload: { type, loading: true } });
      try {
        const response = await diagramService.generateDiagram(state.sessionId, type);
        
        // Create diagram data from API response
        const diagramData: DiagramData = {
          id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          type,
          name: `${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} ${new Date().toLocaleDateString()}`,
          description: `Generated ${type.replace(/_/g, ' ')} diagram`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          isSaved: false,
          mermaidCode: response.mermaid_code,
          prdSectionsUsed: response.prd_sections_used || [],
        };
        
        dispatch({
          type: 'ADD_DIAGRAM',
          payload: {
            type,
            diagram: diagramData,
          },
        });
        
        // Auto-select the newly created diagram
        dispatch({
          type: 'SELECT_DIAGRAM',
          payload: { type, diagramId: diagramData.id },
        });
      } catch (error) {
        dispatch({ type: 'SET_DIAGRAM_LOADING', payload: { type, loading: false } });
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `Failed to generate diagram: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    },

    saveSession: async () => {
      if (!state.sessionId) return;
      
      dispatch({ type: 'SET_LOADING' });
      try {
        await sessionService.saveSession(state.sessionId);
        // Success feedback could be added here
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `Failed to save session: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    },

    exportPRD: async () => {
      if (!state.sessionId) return;
      
      dispatch({ type: 'SET_LOADING' });
      try {
        const response = await sessionService.exportPRD(state.sessionId);
        
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            stage: response.stage,
            needsInput: response.needs_input,
            currentSection: response.current_section,
            message: response.message,
          },
        });
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `Failed to export PRD: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    },

    refinePRD: async () => {
      if (!state.sessionId) return;
      
      dispatch({ type: 'SET_LOADING' });
      try {
        const response = await sessionService.refinePRD(state.sessionId);
        


        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            stage: response.stage,
            needsInput: response.needs_input,
            currentSection: response.current_section,
            message: response.message,
          },
        });

        // Fetch updated PRD after refinement
        setTimeout(fetchAndUpdatePRD, 1000);
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `Failed to refine PRD: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    },

    clearSession: () => {
      currentPRDRef.current = null;
      dispatch({ type: 'CLEAR_SESSION' });
    },

    // Diagram management actions
    updateDiagram: (type: DiagramType, diagramId: string, updates: Partial<DiagramData>) => {
      dispatch({ type: 'UPDATE_DIAGRAM', payload: { type, diagramId, updates } });
    },

    deleteDiagram: (type: DiagramType, diagramId: string) => {
      dispatch({ type: 'DELETE_DIAGRAM', payload: { type, diagramId } });
      // If we deleted the selected diagram, clear the selection
      if (state.selectedDiagrams[type] === diagramId) {
        dispatch({ type: 'SELECT_DIAGRAM', payload: { type, diagramId: null } });
      }
    },

    selectDiagram: (type: DiagramType, diagramId: string | null) => {
      dispatch({ type: 'SELECT_DIAGRAM', payload: { type, diagramId } });
    },

    saveDiagram: (type: DiagramType, diagramId: string) => {
      dispatch({ type: 'SAVE_DIAGRAM', payload: { type, diagramId } });
    },

    setError: (error: string) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    },

    clearError: () => {
      dispatch({ type: 'CLEAR_ERROR' });
    },

    updatePRDContent: (content: string) => {
      dispatch({ type: 'UPDATE_PRD_CONTENT', payload: { prdContent: content } });
    },
  };

  const contextValue: PRDSessionContextType = {
    state,
    actions,
  };

  return (
    <PRDSessionContext.Provider value={contextValue}>
      {children}
    </PRDSessionContext.Provider>
  );
}

// Hook to use the context
export function usePRDSession() {
  const context = useContext(PRDSessionContext);
  if (!context) {
    throw new Error('usePRDSession must be used within a PRDSessionProvider');
  }
  return context;
}

