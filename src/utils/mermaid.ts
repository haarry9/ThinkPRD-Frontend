import mermaid from 'mermaid'

/** Initialize Mermaid with a given theme. Safe to call multiple times. */
export function initializeMermaid(theme: 'default' | 'dark' = 'default'): void {
  try {
    const darkTheme = {
      startOnLoad: false,
      theme: 'dark' as const,
      securityLevel: 'loose' as const,
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
        edgeLabelBackground: '#00000000',
        fontFamily: 'Inter, ui-sans-serif, system-ui',
        fontSize: '12px',
      },
      themeCSS: `
        .label, .edgeLabel, .nodeLabel { fill: #111111; }
        .edgePath .path { stroke: #1f2937; }
        .marker { fill: #1f2937; }
        .node rect, .node circle, .node ellipse, .node polygon { fill: #f5f5f5; stroke: #1f2937; }
        .cluster rect { fill: #ffffff; stroke: #e5e7eb; }
        .edgeLabel rect { fill: transparent; }
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
  // Strip hard-coded colors from style/classDef/linkStyle to enforce app theme
  const lines = s.split(/\n/)
  const cleaned = lines.map((line) => {
    const trimmed = line.trimStart()
    if (/^(classDef|style|linkStyle)\b/.test(trimmed)) {
      // Remove color assignments like fill:#fff, stroke:#abc, color:#123, background-color:..., stop-color:...
      return trimmed
        .replace(/fill:\s*#?[0-9a-fA-F]{3,8}\b/gi, '')
        .replace(/stroke:\s*#?[0-9a-fA-F]{3,8}\b/gi, '')
        .replace(/color:\s*#?[0-9a-fA-F]{3,8}\b/gi, '')
        .replace(/background-color:\s*#?[0-9a-fA-F]{3,8}\b/gi, '')
        .replace(/stop-color:\s*#?[0-9a-fA-F]{3,8}\b/gi, '')
        .replace(/;{2,}/g, ';')
        .replace(/[ ,;]+$/g, '')
    }
    return line
  })
  return cleaned.join('\n').trim()
}

export { mermaid }


