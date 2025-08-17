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
        /* Force app theme colors in UI (override any inline Mermaid styles) */
        .label, .edgeLabel, .nodeLabel, text { fill: #E0E0E0 !important; color: #E0E0E0 !important; }
        .edgePath .path { stroke: #93B8F8 !important; stroke-width: 2px; }
        .marker { fill: #93B8F8 !important; }
        .node rect, .node circle, .node ellipse, .node polygon { fill: #232323 !important; stroke: #424242 !important; }
        .cluster rect { fill: #181818 !important; stroke: #424242 !important; }
        .flowchart-link { stroke: #93B8F8 !important; }
        .edgeLabel rect { fill: transparent !important; stroke: transparent !important; }
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
  // Normalize line endings and remove trailing commas which commonly break parsers
  s = s.replace(/\r\n?/g, '\n')
  s = s.replace(/,\s*$/gm, '')
  // Collapse excessive blank lines
  s = s.replace(/\n{3,}/g, '\n\n')
  // Remove control characters except tab/newline/carriage return
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]+/g, '')
  // Remove BOM if present
  s = s.replace(/^\uFEFF/, '')
  
  // Fix common ER diagram syntax errors
  // Fix double curly braces in relationships: ||--o{{ -> ||--o{
  s = s.replace(/\|\|--o\{\{/g, '||--o{')
  s = s.replace(/\|\|--\|\{\{/g, '||--|{')
  s = s.replace(/\|\|--\*\{\{/g, '||--*{')
  s = s.replace(/\|\|--\|\{\{/g, '||--|{')
  
  // Fix other malformed relationship syntax
  s = s.replace(/\|\|--o\{/g, '||--o{')
  s = s.replace(/\|\|--\|/g, '||--|')
  s = s.replace(/\|\|--\*/g, '||--*')
  
  // Fix missing spaces around relationship operators
  s = s.replace(/([A-Za-z_][\w-]*)\|\|--o\{/g, '$1 ||--o{')
  s = s.replace(/([A-Za-z_][\w-]*)\|\|--\|/g, '$1 ||--|')
  s = s.replace(/([A-Za-z_][\w-]*)\|\|--\*/g, '$1 ||--*')
  
  // Fix the specific error pattern: Entity ||--o{{ OtherEntity -> Entity ||--o{ OtherEntity
  s = s.replace(/([A-Za-z_][\w-]*)\s*\|\|--o\{\{\s*([A-Za-z_][\w-]*)/g, '$1 ||--o{ $2')
  s = s.replace(/([A-Za-z_][\w-]*)\s*\|\|--\|\{\{\s*([A-Za-z_][\w-]*)/g, '$1 ||--|{ $2')
  s = s.replace(/([A-Za-z_][\w-]*)\s*\|\|--\*\{\{\s*([A-Za-z_][\w-]*)/g, '$1 ||--*{ $2')
  
  // If multiple erDiagram tokens appear due to concatenation, collapse to a single header
  if (/\berDiagram\b/i.test(s)) {
    // Replace runs of erDiagram tokens with a single 'erDiagram' followed by newline
    s = s.replace(/(\berDiagram\b\s*){2,}/ig, 'erDiagram\n')
    // If erDiagram appears but not at start, move a single header to the top and strip others
    if (!/^\s*erDiagram\b/i.test(s)) {
      // remove all instances, then prepend a single header
      s = s.replace(/\berDiagram\b/ig, '')
      s = 'erDiagram\n' + s.trim()
    }
  }
  // Keep author-provided styles intact; we'll override visually via theme/CSS at render/export time to avoid parse breakage
  return s
}

export { mermaid }


/**
 * Attempt to parse and render Mermaid input with multiple tolerant fallbacks.
 * This helps with ER diagram inputs that may omit the leading `erDiagram` token
 * or include minor syntax that trips the parser.
 *
 * Returns the SVG string on success or throws an Error containing diagnostics.
 */
export async function renderMermaidSafe(id: string, input?: string): Promise<string> {
  const original = sanitizeMermaid(input)
  if (!original) throw new Error('Empty mermaid input')

  const attempts: {name: string; code: string}[] = []

  // baseline
  attempts.push({ name: 'original', code: original })

  // Decide whether to prepend a missing erDiagram header.
  // Only prepend when the input does NOT contain the token anywhere and it looks like ER entity lines.
  const startsWithER = /^\s*erDiagram\b/i.test(original)
  const containsER = /\berDiagram\b/i.test(original)
  if (!containsER) {
    // Heuristic: presence of lines like "EntityName {" suggests an ER diagram body without header
    const entityLineRegex = /^\s*[A-Za-z_][\w-]*\s*\{/m
    if (entityLineRegex.test(original) && !startsWithER) {
      attempts.push({ name: 'prepend-erHeader', code: 'erDiagram\n' + original })
    }
  }

  // Try a version with trailing commas removed (already handled by sanitize, but keep as explicit fallback)
  const noTrailingCommas = original.replace(/,\s*$/gm, '')
  if (noTrailingCommas !== original) attempts.push({ name: 'no-trailing-commas', code: noTrailingCommas })

  // Header + no trailing commas: only add this variant if we actually prepended the header earlier.
  const addedPrepend = attempts.some(a => a.name === 'prepend-erHeader')
  if (addedPrepend) {
    const c = 'erDiagram\n' + noTrailingCommas
    attempts.push({ name: 'erHeader-no-trailing-commas', code: c })
  }

  // Final normalization: collapse repeated spaces and ensure consistent indentation
  const normalized = original.split('\n').map(line => line.replace(/\t/g, '  ').replace(/\s+$/,'')).join('\n')
  if (normalized !== original) attempts.push({ name: 'normalized-whitespace', code: normalized })

  // Additional ER diagram specific fallbacks
  if (/\berDiagram\b/i.test(original) || /^\s*[A-Za-z_][\w-]*\s*\{/m.test(original)) {
    // Fix common ER diagram syntax issues
    const fixedER = original
      .replace(/\|\|--o\{\{/g, '||--o{')
      .replace(/\|\|--\|\{\{/g, '||--|{')
      .replace(/\|\|--\*\{\{/g, '||--*{')
      .replace(/\|\|--\|\{\{/g, '||--|{')
      .replace(/([A-Za-z_][\w-]*)\|\|--o\{/g, '$1 ||--o{')
      .replace(/([A-Za-z_][\w-]*)\|\|--\|/g, '$1 ||--|')
      .replace(/([A-Za-z_][\w-]*)\|\|--\*/g, '$1 ||--*')
    
    if (fixedER !== original) {
      attempts.push({ name: 'fixed-er-syntax', code: fixedER })
    }
    
    // Try with proper spacing around entities and relationships
    const spacedER = fixedER.replace(/([A-Za-z_][\w-]*)\s*\{\s*([^}]*)\s*\}/g, '$1 {\n  $2\n}')
    if (spacedER !== fixedER) {
      attempts.push({ name: 'spaced-er-entities', code: spacedER })
    }
    
    // Final aggressive fix for BLOCK_START errors - ensure proper entity syntax
    const aggressiveFix = spacedER
      .replace(/([A-Za-z_][\w-]*)\s*\{\s*([^}]*)\s*\}/g, '$1 {\n  $2\n}')
      .replace(/\|\|--o\{([^}]*)\}/g, '||--o{ $1 }')
      .replace(/\|\|--\|([^}]*)\}/g, '||--|{ $1 }')
      .replace(/\|\|--\*([^}]*)\}/g, '||--*{ $1 }')
    
    if (aggressiveFix !== spacedER) {
      attempts.push({ name: 'aggressive-er-fix', code: aggressiveFix })
    }
  }

  let lastError: any = null
  for (const attempt of attempts) {
    try {
      // mermaid.parse will throw on syntax errors; parsing first avoids the global overlay
      await mermaid.parse(attempt.code)
      const { svg } = await mermaid.render(id, attempt.code)
      return svg
    } catch (err) {
      lastError = err
      // continue to next attempt
    }
  }

  // If we reached here, all attempts failed. Throw an aggregated error with helpful hints.
  const hint = `Mermaid render failed after ${attempts.length} attempts. Last error: ${lastError?.message || lastError}`
  const e = new Error(hint)
  // @ts-ignore attach diagnostics
  e['diagnostic'] = { attempts: attempts.map(a => a.name), lastError }
  
  // Log detailed diagnostics for debugging
  console.error('Mermaid render failed - all attempts:', attempts.map(a => ({ name: a.name, code: a.code.substring(0, 200) + '...' })))
  console.error('Last error details:', lastError)
  
  throw e
}


