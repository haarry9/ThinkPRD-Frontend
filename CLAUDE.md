# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI PRD Generator application that transforms one-liner product ideas into comprehensive Product Requirements Documents (PRDs) through AI-powered clarification, analysis, and iterative refinement. The application is built as a React TypeScript frontend using Vite, shadcn/ui components, and Tailwind CSS.

**Current State**: This is a frontend-only prototype with mock data. The backend API is not implemented yet.

## Development Commands

### Core Development Commands
- `npm run dev` - Start development server (runs on port 8080)
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Installation
- `npm install` - Install dependencies (uses package-lock.json)

## Technology Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: react-router-dom v6
- **State Management**: Local React state (TanStack Query configured but not used)
- **Icons**: lucide-react
- **Markdown**: react-markdown + remark-gfm
- **Diagrams**: mermaid (flowcharts)
- **Build Tool**: Vite with SWC
- **Development**: ESLint + TypeScript

## Architecture

### File Structure
```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── ClarificationModal.tsx # AI clarification questions modal
│   ├── FlowchartView.tsx     # Mermaid diagram renderer
│   ├── PRDEditor.tsx         # Markdown PRD editor
│   └── layout/
│       └── Workspace.tsx     # Main tri-pane workspace
├── hooks/                     # React hooks
├── lib/
│   └── utils.ts              # Utility functions (cn, etc.)
├── pages/
│   ├── Index.tsx            # Homepage with idea input
│   └── NotFound.tsx         # 404 page
├── App.tsx                  # Root component with routing
└── main.tsx                 # Vite entry point
```

### Key Components

1. **Index.tsx** - Homepage with idea input, shows recent items, launches clarification modal
2. **ClarificationModal.tsx** - Displays AI-generated questions across 5 thinking lens criteria
3. **Workspace.tsx** - Cursor-like tri-pane layout (file tree, main content, sidebar)
4. **PRDEditor.tsx** - Markdown editor for PRD content
5. **FlowchartView.tsx** - Mermaid flowchart renderer

### Design System

**Theme**: Dark-only theme (forced in App.tsx) with Cursor IDE-inspired design
- Uses CSS variables for colors defined in `src/index.css`
- Color tokens: `--background`, `--foreground`, `--primary`, `--secondary`, etc.
- Always use semantic color classes: `bg-background`, `text-foreground`, `bg-card`

**Fonts**: Inter (sans) and JetBrains Mono (mono) loaded from Google Fonts

**Spacing**: Standard Tailwind spacing with container max-width of 1400px

## Data Flow (Current Mock Implementation)

1. User enters idea on homepage
2. ClarificationModal shows mock questions for 5 thinking lens criteria:
   - Discovery, User Journey, Metrics, GTM, Risks
3. User answers questions and submits
4. Workspace opens with mock PRD and flowchart content
5. User can toggle between PRD and Flowchart views
6. Right sidebar shows thinking lens completion status and chat interface
7. Chat has "Think" (brainstorming) and "Agent" (PRD modification) modes

## Configuration Files

- **vite.config.ts**: Dev server on port 8080, path aliases (`@/` → `src/`)
- **tsconfig.json**: Relaxed TypeScript settings (noImplicitAny: false, etc.)
- **eslint.config.js**: React + TypeScript linting with some rules disabled
- **tailwind.config.ts**: Extended with custom colors, fonts, animations
- **components.json**: shadcn/ui configuration

## Future Backend Integration

The app is designed for future API integration:
- TanStack Query is configured but not actively used
- Mock data exists for: projects, PRD content, flowcharts, versions, chat messages
- API endpoints are defined in backend PRD document
- WebSocket support planned for real-time updates

## Development Notes

- **Hot Reload**: Vite dev server with SWC for fast builds
- **TypeScript**: Configured for rapid prototyping (strict mode disabled)
- **ESLint**: Relaxed rules to avoid blocking development
- **Mock Data**: All functionality currently uses static mock data
- **Responsive**: Mobile-responsive design with Tailwind breakpoints

## Important Patterns

1. **Color Usage**: Always use CSS variable-based colors (`bg-background` not `bg-gray-900`)
2. **Component Structure**: Follow shadcn/ui patterns for new components
3. **State Management**: Use local React state; TanStack Query ready for API calls
4. **File Organization**: Keep components focused and co-locate related files
5. **Styling**: Prefer Tailwind utility classes over custom CSS

## Thinking Lens Framework

The application is built around a 5-criteria framework for PRD completeness:
1. **Discovery** - Understanding users, market, and problems
2. **User Journey** - Mapping user flows and interactions  
3. **Metrics** - Defining success metrics and KPIs
4. **GTM** - Go-to-market strategy and launch plans
5. **Risks** - Identifying and mitigating potential issues

This framework drives the clarification questions and PRD structure validation throughout the application.