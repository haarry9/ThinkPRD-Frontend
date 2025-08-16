# PRD Builder API Integration Plan

## Overview
This document outlines the comprehensive plan for integrating the ThinkingLens PRD Builder backend API into the existing React frontend project. The integration will transform the current mock-based system into a fully functional, real-time PRD building application.

## Current State Analysis

### ✅ What's Already Implemented
- React + TypeScript + shadcn/ui setup
- Basic workspace layout with PRD editor and flowchart viewer
- Chat panel with mode switching (chat/agent)
- Mermaid.js integration for diagrams
- File upload capability in chat panel
- Mock data and simulated AI responses

### ❌ What Needs to Be Implemented
- API integration with backend endpoints
- State management for PRD sessions
- Real-time updates via Server-Sent Events
- Session persistence and management
- Diagram type management (8 types total)
- Progress tracking and section management

## Integration Phases

### Phase 1: Environment & Configuration Setup
**Estimated Time: 1-2 hours**

#### 1.1 Environment Variables
- Create `.env.local` for development
- Add `VITE_API_BASE_URL=http://localhost:8000`
- Add `.env.example` for team reference
- Configure Vite to use environment variables

#### 1.2 API Configuration
- Create `src/lib/api.ts` for centralized API calls
- Add request/response interceptors
- Handle environment-based URL switching
- Implement error handling and retry logic

**Files to Create:**
- `.env.local`
- `.env.example`
- `src/lib/api.ts`

---

### Phase 2: State Management & Context
**Estimated Time: 3-4 hours**

#### 2.1 PRD Session Context
- Create `src/contexts/PRDSessionContext.tsx`
- Manage session state, PRD data, and real-time updates
- Handle Server-Sent Events for streaming
- Implement session lifecycle management

#### 2.2 State Structure
```typescript
interface PRDSession {
  sessionId: string | null;
  status: 'idle' | 'loading' | 'active' | 'error';
  stage: 'init' | 'plan' | 'build' | 'assemble' | 'review' | 'export';
  currentSection: string | null;
  needsInput: boolean;
  sections: PRDSection[];
  progress: number;
  lastUpdated: string;
  errors: string[];
}

interface PRDSection {
  key: string;
  title: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'stale';
  completionScore: number;
  lastUpdated: string;
  dependencies: string[];
}
```

**Files to Create:**
- `src/contexts/PRDSessionContext.tsx`
- `src/types/prd.ts`
- `src/hooks/usePRDSession.ts`

---

### Phase 3: API Service Layer
**Estimated Time: 4-5 hours**

#### 3.1 Core API Services
- `src/services/sessionService.ts` - Session management
- `src/services/prdService.ts` - PRD operations
- `src/services/diagramService.ts` - Flowchart/ER diagram generation
- `src/services/fileService.ts` - File uploads and RAG

#### 3.2 API Endpoints Integration
- **Sessions**: Create, manage, and save sessions
- **Messages**: Send messages and receive AI responses
- **File Uploads**: Handle PDF uploads for RAG
- **PRD Data**: Retrieve and update PRD sections
- **Diagrams**: Generate flowcharts and ER diagrams
- **Export**: Trigger PRD export process

**Files to Create:**
- `src/services/sessionService.ts`
- `src/services/prdService.ts`
- `src/services/diagramService.ts`
- `src/services/fileService.ts`
- `src/services/index.ts`

---

### Phase 4: Enhanced Components
**Estimated Time: 6-8 hours**

#### 4.1 PRD Editor Enhancement
- Replace mock data with real API data
- Add section-by-section editing
- Implement progress indicators
- Add section completion status
- Integrate with real-time updates

#### 4.2 Flowchart View Enhancement
- Support 4 flowchart types with type selector
- Support 4 ER diagram types
- Add diagram type switching UI
- Implement diagram caching and management

**Flowchart Types:**
1. **system_architecture** - System components, services, integrations, data flow
2. **user_flow** - User journey, interactions, decision points, error handling
3. **data_flow** - Data sources, processing, storage, validation
4. **deployment** - Development, staging, production, monitoring, backup

**ER Diagram Types:**
1. **database_schema** - Database entities, relationships, keys, cardinality
2. **data_model** - Business entities, data flow, storage, validation rules
3. **user_data_structure** - User profiles, roles, preferences, permissions
4. **api_schema** - API endpoints, data structures, authentication, error handling

#### 4.3 Chat Panel Enhancement
- Integrate with real API endpoints
- Handle file uploads for RAG
- Implement streaming responses
- Add session management controls

**Files to Modify:**
- `src/components/PRDEditor.tsx`
- `src/components/FlowchartView.tsx`
- `src/components/chat/ChatPanel.tsx`

---

### Phase 5: New Components
**Estimated Time: 8-10 hours**

#### 5.1 Session Management
- `src/components/session/SessionStart.tsx` - New session creation
- `src/components/session/SessionProgress.tsx` - Progress tracking
- `src/components/session/SectionStatus.tsx` - Section completion status
- `src/components/session/SessionControls.tsx` - Save, export, refine actions

#### 5.2 Diagram Management
- `src/components/diagrams/DiagramTypeSelector.tsx` - Type selection
- `src/components/diagrams/DiagramGallery.tsx` - Multiple diagram display
- `src/components/diagrams/DiagramControls.tsx` - Generation controls
- `src/components/diagrams/DiagramTypeTabs.tsx` - Tabbed diagram switching

#### 5.3 PRD Sections
- `src/components/prd/PRDSectionEditor.tsx` - Individual section editing
- `src/components/prd/PRDProgress.tsx` - Overall progress visualization
- `src/components/prd/PRDExport.tsx` - Export functionality
- `src/components/prd/SectionDependencies.tsx` - Dependency visualization

**Files to Create:**
- `src/components/session/` (4 files)
- `src/components/diagrams/` (4 files)
- `src/components/prd/` (4 files)

---

### Phase 6: Real-time Features
**Estimated Time: 4-5 hours**

#### 6.1 Server-Sent Events Implementation
- Create `src/hooks/useSSE.ts` hook
- Handle real-time progress updates
- Manage connection state and reconnection
- Stream AI responses

#### 6.2 Progress Tracking
- Real-time section completion updates
- Stage progression indicators
- Input requirement notifications
- Live progress bars and status updates

**Files to Create:**
- `src/hooks/useSSE.ts`
- `src/hooks/useRealTimeUpdates.ts`
- `src/utils/eventSource.ts`

---

### Phase 7: Enhanced User Experience
**Estimated Time: 3-4 hours**

#### 7.1 Session Persistence
- Save session state to backend
- Version control for PRD iterations
- Session recovery and resumption
- Auto-save functionality

#### 7.2 File Management
- PDF upload and processing status
- RAG context integration
- File attachment management
- Upload progress indicators

#### 7.3 Error Handling
- Network error recovery
- API error messages
- User-friendly error states
- Retry mechanisms

**Files to Create:**
- `src/components/ui/ErrorBoundary.tsx`
- `src/components/ui/LoadingStates.tsx`
- `src/utils/errorHandling.ts`

---

## Technical Implementation Details

### Server-Sent Events (SSE) Strategy
```typescript
// Implementation approach
const useSSE = (sessionId: string, message: string) => {
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Handle connection, reconnection, and error recovery
  // Stream real-time updates from backend
  // Manage connection lifecycle
};
```

**Features:**
- Automatic reconnection on connection loss
- Message buffering and state management
- Progress streaming for real-time updates
- Error handling and fallback mechanisms

### State Management Strategy
```typescript
// Using React Context with useReducer
const PRDSessionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(prdSessionReducer, initialState);
  
  // Centralized PRD session state
  // Optimistic updates for better UX
  // Proper state synchronization with backend
  // Real-time state updates via SSE
};
```

### Diagram Type Management
- Unified diagram type selector with tabs
- Type-specific generation parameters
- Cached diagram storage
- Easy switching between diagram types
- Progress indicators for generation

---

## File Structure After Integration

```
src/
├── components/
│   ├── session/
│   │   ├── SessionStart.tsx
│   │   ├── SessionProgress.tsx
│   │   ├── SectionStatus.tsx
│   │   └── SessionControls.tsx
│   ├── diagrams/
│   │   ├── DiagramTypeSelector.tsx
│   │   ├── DiagramGallery.tsx
│   │   ├── DiagramControls.tsx
│   │   └── DiagramTypeTabs.tsx
│   ├── prd/
│   │   ├── PRDSectionEditor.tsx
│   │   ├── PRDProgress.tsx
│   │   ├── PRDExport.tsx
│   │   └── SectionDependencies.tsx
│   └── ui/
│       ├── ErrorBoundary.tsx
│       └── LoadingStates.tsx
├── contexts/
│   └── PRDSessionContext.tsx
├── hooks/
│   ├── usePRDSession.ts
│   ├── useSSE.ts
│   └── useRealTimeUpdates.ts
├── services/
│   ├── sessionService.ts
│   ├── prdService.ts
│   ├── diagramService.ts
│   ├── fileService.ts
│   └── index.ts
├── types/
│   └── prd.ts
├── utils/
│   ├── api.ts
│   ├── eventSource.ts
│   └── errorHandling.ts
└── lib/
    └── api.ts
```

---

## Testing Strategy

### Phase-by-Phase Testing
1. **Unit Tests**: Test individual services and hooks
2. **Integration Tests**: Test API integration
3. **Component Tests**: Test enhanced components
4. **End-to-End Tests**: Test complete user workflows

### Testing Tools
- Jest for unit testing
- React Testing Library for component testing
- MSW for API mocking
- Playwright for E2E testing

---

## Deployment Considerations

### Environment Configuration
- Development: `http://localhost:8000`
- Staging: Environment-specific backend URL
- Production: Production backend URL

### Build Optimization
- Code splitting for better performance
- Lazy loading of diagram components
- Optimized bundle size

---

## Risk Mitigation

### Technical Risks
1. **SSE Connection Issues**: Implement robust reconnection logic
2. **API Rate Limiting**: Add request throttling and queuing
3. **Large File Uploads**: Implement chunked uploads and progress tracking
4. **State Synchronization**: Use optimistic updates with rollback

### User Experience Risks
1. **Network Disconnections**: Clear error messages and recovery options
2. **Long Generation Times**: Progress indicators and estimated completion
3. **Data Loss**: Auto-save and session recovery

---

## Success Metrics

### Technical Metrics
- API response time < 2 seconds
- SSE connection stability > 99%
- File upload success rate > 95%
- Error rate < 1%

### User Experience Metrics
- Session completion rate
- Time to generate first diagram
- User satisfaction with r