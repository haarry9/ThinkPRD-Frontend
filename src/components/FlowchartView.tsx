import { useEffect, useMemo, useRef } from "react";
import mermaid from "mermaid";

interface Props {
  code: string;
  onRenderResult?: (ok: boolean) => void;
}

export default function FlowchartView({ code, onRenderResult }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = `mmd-${Math.random().toString(36).slice(2)}`;
        const sanitized = sanitize(code);
        if (!sanitized) {
          if (containerRef.current) {
            containerRef.current.innerHTML = `<pre class="text-muted-foreground">No flowchart generated yet.</pre>`;
          }
          onRenderResult?.(false);
          return;
        }
        // Pre-parse to avoid Mermaid adding its global error overlay
        await mermaid.parse(sanitized);
        const { svg } = await mermaid.render(id, sanitized);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          onRenderResult?.(true);
        }
      } catch (e) {
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre class="text-destructive">Mermaid render error. Check syntax.</pre>`;
        }
        onRenderResult?.(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div className="w-full overflow-auto rounded-md border bg-card p-4" ref={containerRef} />
  );
}

function sanitize(input?: string): string {
  const raw = (input || "").trim();
  if (!raw) return "";
  // Strip code fences if present
  let s = raw;
  if (s.startsWith("```")) {
    s = s.replace(/^```(mermaid)?/i, "").replace(/```$/i, "").trim();
  }
  // If it starts with the word "mermaid" after stripping, drop that label
  if (/^mermaid\s*/i.test(s)) {
    s = s.replace(/^mermaid\s*/i, "");
  }
  return s.trim();
}
