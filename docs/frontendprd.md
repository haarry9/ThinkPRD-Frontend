---
alwaysApply: true
---
# Front-End Architecture & UI Guide (front-end.md)

This document describes the front-end architecture, design system, components, data flow, and integration points for the AI PRD Generator. Note: The current build uses mock data only; no live API calls are performed.

## Tech Stack Overview
- Framework: React 18 + TypeScript (Vite)
- Styling: Tailwind CSS with a custom design system using CSS variables (HSL) and shadcn/ui components (Radix primitives)
- Routing: react-router-dom v6
- State & Data: Local React state for UI, TanStack Query (react-query) pre-wired for future APIs (no live calls yet)
- Markdown: react-markdown + remark-gfm
- Diagrams: mermaid (flowcharts)
- Icons: lucide-react
- Notifications: shadcn toaster + sonner

## Design System
All colors are defined as HSL tokens in src/index.css and consumed via tailwind.config.ts. Use semantic tokens (bg-background, text-foreground, etc.)—never hard-coded colors in components.

### 1) Colors (Dark Theme Only)
The app forces dark mode (see src/App.tsx) and uses an Onlook-like palette.

- Background: #181818 → hsl(0 0% 9%) → var(--background)
- Secondary/Card: #282828 → hsl(0 0% 16%) → var(--secondary), var(--card)
- Foreground (primary text): #E0E0E0 → hsl(0 0% 88%) → var(--foreground)
- Muted text: #A0A0A0 → hsl(0 0% 63%) → var(--muted-foreground)
- Primary (CTA Blue): #93B8F8 → hsl(218 88% 77%) → var(--primary)
- Accent (Lime): #B2F64C → hsl(84 90% 63%) → var(--accent)
- Border/Input: #424242 → hsl(0 0% 26%) → var(--border), var(--input)
- Ring: hsl(var(--primary))

Snippet (already in src/index.css, .dark block):
```css
.dark {
  --background: 0 0% 9%;
  --foreground: 0 0% 88%;
  --card: 0 0% 16%;
  --card-foreground: 0 0% 88%;
  --popover: 0 0% 16%;
  --popover-foreground: 0 0% 88%;
  --primary: 218 88% 77%;
  --primary-foreground: 0 0% 9%;
  --secondary: 0 0% 16%;
  --secondary-foreground: 0 0% 88%;
  --muted: 0 0% 16%;
  --muted-foreground: 0 0% 63%;
  --accent: 84 90% 63%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 67% 55%;
  --destructive-foreground: 0 0% 88%;
  --border: 0 0% 26%;
  --input: 0 0% 26%;
  --ring: 218 88% 77%;
}
```
Usage examples:
- Background: className="bg-background"
- Text: className="text-foreground"
- Cards: className="bg-card border"
- Primary button: variant="default" (powered by tokenized colors)

### 2) Typography
- Font family: Inter (primary) and JetBrains Mono (code), loaded in index.html.
- Weights: 400 (body), 600 (headings), 700 (emphasis)
- Suggested sizes (approximate alignment with Onlook):
  - Hero H1: 40–56px (responsive clamped)
  - Section headers: 24–28px
  - Card titles: 16–18px
  - Body: 14–16px
  - Secondary/meta: 12–14px

Tailwind classes
- Headings: text-4xl md:text-5xl font-semibold
- Body: text-sm md:text-base text-muted-foreground

### 3) Spacing System
- Tailwind default spacing scale (4px base)
- Container: centered with padding 2rem; 2xl breakpoint at 1400px (tailwind.config.ts)
- Common gaps: 2, 3, 4, 6, 8 for horizontal/vertical rhythm
- Cards: p-4 to p-6; sections: py-10 to py-16

### Microinteractions (Utilities)
Defined in src/index.css:
- .hover-scale: slight scale on hover
- .pressable: active:scale-95 (click feedback)
- .hover-elevate: subtle bg lift on hover (cards/panels)
- .ambient-spotlight: radial highlight that follows cursor on panels
Inputs/buttons use focus-visible:ring-ring with ring-offset to ensure accessible focus.

## UI Patterns & Components

### Reusable (shadcn/ui)
- Button: variants default, secondary, ghost, outline, destructive; sizes sm, default, lg, icon. Includes active scale (.pressable) and tokenized colors.
- Input: tokenized bg/border, focus ring = primary.
- Card: bg-card + border, title/description/content slots.
- Carousel: embla-based with keyboard navigation and prev/next buttons.
- Dialog/Sheet/Drawer, Tabs, Tooltip, Sidebar, Select, Checkbox, etc. available under src/components/ui.

### App-Specific Components
- ClarificationModal (src/components/ClarificationModal.tsx)
  - Props: open, idea, onClose, onSubmit(answers)
  - Displays AI-like clarification questions (mock), freeform text answers
- PRDEditor (src/components/PRDEditor.tsx)
  - Displays and edits markdown; uses react-markdown for preview
- FlowchartView (src/components/FlowchartView.tsx)
  - Renders Mermaid diagrams from text definitions
- Workspace (src/components/layout/Workspace.tsx)
  - Cursor-like tri-pane layout: left project tree, main content (PRD/Flowchart toggle), right sidebar (chat/lens status)

### Pages
- Home (src/pages/Index.tsx):
  - Hero with inspiration input, attachments button, CTA
  - “Recent” section with card grid (mock)
  - Launches ClarificationModal → Workspace with mock PRD/flow
- NotFound (src/pages/NotFound.tsx)

## Data Fetching & State Management
- Current state uses mock data with local React state in pages/Index.tsx (idea string, modal visibility, lens coverage, workspace entry).
- TanStack Query is configured in src/App.tsx (QueryClientProvider) for future API integration; no queries are executed yet.

Recommended pattern for future APIs:
```ts
import { useQuery, useMutation } from "@tanstack/react-query";

const fetchProjects = async () => {
  const res = await fetch("/api/v1/projects");
  if (!res.ok) throw new Error("Failed");
  return res.json();
};

export const useProjects = () => useQuery({ queryKey: ["projects"], queryFn: fetchProjects });
```

## Functional Areas & Views
1) Idea Input & Clarification (Home + ClarificationModal)
2) Workspace: PRD view (markdown), Flowchart view (Mermaid)
3) Versions/history (mocked in Workspace props)
4) Right sidebar lens checklist and chat entry (mock)

## Folder Structure (key paths)
```
src/
  components/
    ClarificationModal.tsx
    FlowchartView.tsx
    PRDEditor.tsx
    layout/Workspace.tsx
    ui/  # shadcn components (button, input, card, carousel, dialog, etc.)
  hooks/
    use-toast.ts
  lib/
    utils.ts
  pages/
    Index.tsx
    NotFound.tsx
  App.tsx
  index.css  # tokens & utilities
  main.tsx
```

## Fonts & Icons
- Fonts: Inter (sans), JetBrains Mono (mono) loaded via Google Fonts in index.html
- Tailwind mapping: theme.extend.fontFamily.sans/mono configured (Inter, JetBrains)
- Icons: lucide-react
  - Import icons explicitly (tree-shakable):
    ```tsx
    import { Sparkles, Paperclip } from "lucide-react";
    <Sparkles className="h-4 w-4" />
    ```
  - You can also use dynamic imports if you ever need name-based icon loading.

## APIs (Planned) & Integration Strategy
- The app currently uses mock data.
- The backend PRD specifies REST endpoints under /api/v1 for auth, projects, clarifications, iterations, files, chats, versions, and websockets for real-time updates.
- Integration approach:
  1. Create typed client modules per resource (e.g., api/projects.ts) with fetch wrappers.
  2. Add TanStack Query hooks (useProjects, useProject, useGenerate, etc.).
  3. Replace mock props in Workspace and Index with data from hooks.
  4. Add optimistic updates and error toasts (use-toast).
  5. For streaming/real-time, connect WS endpoints and update state accordingly.

Example types & hook shell:
```ts
// types/projects.ts
export type ThinkingLensStatus = {
  discovery: boolean; user_journey: boolean; metrics: boolean; gtm: boolean; risks: boolean;
};

export interface Project {
  id: string;
  project_name: string;
  initial_idea: string;
  status: "active" | "archived" | "deleted";
  current_version: string;
  created_at: string; updated_at: string;
  thinking_lens_status: ThinkingLensStatus;
}

// api/projects.ts
export async function listProjects() { /* fetch('/api/v1/projects') */ }

// hooks/use-projects.ts
export function useProjects() { /* return useQuery({ queryKey: ['projects'], queryFn: listProjects }) */ }
```

## Accessibility & SEO
- A11y: Focus-visible rings, aria-labels on icon buttons, keyboard nav in carousel.
- SEO: index.html includes title, meta description, canonical, OpenGraph/Twitter tags. Pages should use one H1 and semantic layout tags.

## Testing & QA Notes
- Visual: Verify dark palette contrast (AA+ for body text), hover/focus/active states, and responsive layout.
- Interaction: Keyboard access for carousel and dialogs; toasts for important events.

## Mock Data Disclaimer
This project currently simulates all functionality with mock data. Replace mock inputs/props and local state with real API calls using the hooks pattern above when backend endpoints are ready.
