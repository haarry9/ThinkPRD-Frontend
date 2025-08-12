import { useEffect, useMemo, useRef } from "react";
import { mermaid, initializeMermaid, sanitizeMermaid } from "@/utils/mermaid";

interface Props {
  code: string;
  onRenderResult?: (ok: boolean) => void;
}

export default function FlowchartView({ code, onRenderResult }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeMermaid('dark')
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = `mmd-${Math.random().toString(36).slice(2)}`;
        const sanitized = sanitizeMermaid(code);
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

// sanitize moved to utils/mermaid
