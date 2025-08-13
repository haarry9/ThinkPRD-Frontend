import mermaid from 'mermaid'

/** Initialize Mermaid with a given theme. Safe to call multiple times. */
export function initializeMermaid(theme: 'default' | 'dark' = 'default'): void {
  try {
    const darkTheme = {
      startOnLoad: false,
      theme: 'dark' as const,
      securityLevel: 'loose' as const,
      // Avoid foreignObject labels so PDF export preserves text
      flowchart: {
        htmlLabels: false,
      } as any,
      themeVariables: {
        // Brand-aligned dark palette
        background: 'transparent',
        primaryColor: '#232323',
        primaryTextColor: '#E0E0E0',
        primaryBorderColor: '#424242',
        secondaryColor: '#1f1f1f',
        tertiaryColor: '#1f1f1f',
        textColor: '#E0E0E0',
        lineColor: '#93B8F8', // accent blue for edges
        nodeBorder: '#424242',
        clusterBkg: '#181818',
        clusterBorder: '#424242',
        edgeLabelBackground: '#00000000',
        fontFamily: 'Inter, ui-sans-serif, system-ui',
        fontSize: '12px',
      },
      themeCSS: `
        .label, .edgeLabel, .nodeLabel { fill: #E0E0E0; }
        .edgePath .path { stroke: #93B8F8; }
        .marker { fill: #93B8F8; }
        .node rect, .node circle, .node ellipse, .node polygon { fill: #232323; stroke: #424242; }
        .cluster rect { fill: #181818; stroke: #424242; }
        .flowchart-link { stroke: #93B8F8; }
        .edgeLabel rect { fill: transparent; }
      `,
    }

    const lightTheme = {
      startOnLoad: false,
      theme: 'default' as const,
      securityLevel: 'loose' as const,
      // Avoid foreignObject labels so PDF export preserves text
      flowchart: {
        htmlLabels: false,
      } as any,
      themeVariables: {
        background: '#ffffff',
        primaryColor: '#f5f5f5',
        primaryTextColor: '#111111',
        primaryBorderColor: '#1f2937',
        secondaryColor: '#fafafa',
        tertiaryColor: '#fafafa',
        textColor: '#111111',
        lineColor: '#1f2937',
        nodeBorder: '#1f2937',
        clusterBkg: '#ffffff',
        clusterBorder: '#e5e7eb',
        edgeLabelBackground: '#ffffff',
        fontFamily: 'Inter, ui-sans-serif, system-ui',
        fontSize: '14px',
        // Additional variables for better PDF export
        mainBkg: '#ffffff',
        nodeBkg: '#f5f5f5',
        nodeTextColor: '#111111',
        edgeLabelColor: '#111111',
      },
      themeCSS: `
        .label, .edgeLabel, .nodeLabel { 
          fill: #111111 !important; 
          color: #111111 !important;
          font-weight: 500;
        }
        .edgePath .path { 
          stroke: #1f2937 !important; 
          stroke-width: 2px;
        }
        .marker { 
          fill: #1f2937 !important; 
        }
        .node rect, .node circle, .node ellipse, .node polygon { 
          fill: #f5f5f5 !important; 
          stroke: #1f2937 !important; 
          stroke-width: 2px;
        }
        .cluster rect { 
          fill: #ffffff !important; 
          stroke: #e5e7eb !important; 
        }
        .edgeLabel rect { 
          fill: #ffffff !important; 
          stroke: #e5e7eb;
          stroke-width: 1px;
        }
        .flowchart-link {
          stroke: #1f2937 !important;
          stroke-width: 2px;
        }
        text {
          fill: #111111 !important;
          color: #111111 !important;
        }
      `,
    }

    mermaid.initialize(theme === 'dark' ? darkTheme : lightTheme)
  } catch {
    // no-op; mermaid.initialize can throw in SSR or double init scenarios
  }
}

/**
 * Sanitize Mermaid input. Removes code fences and leading "mermaid" label.
 */
export function sanitizeMermaid(input?: string): string {
  const raw = (input || '').trim()
  if (!raw) return ''
  let s = raw
  if (s.startsWith('```')) {
    s = s.replace(/^```(mermaid)?/i, '').replace(/```$/i, '').trim()
  }
  if (/^mermaid\s*/i.test(s)) {
    s = s.replace(/^mermaid\s*/i, '')
  }
  // Keep author-provided styles intact; we'll override visually via theme/CSS at render/export time to avoid parse breakage
  return s
}

export { mermaid }


