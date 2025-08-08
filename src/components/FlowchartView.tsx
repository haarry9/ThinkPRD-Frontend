import { useEffect, useMemo, useRef } from "react";
import mermaid from "mermaid";

interface Props {
  code: string;
}

export default function FlowchartView({ code }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = `mmd-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre class="text-destructive">Mermaid render error. Check syntax.</pre>`;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div className="w-full overflow-auto rounded-md border bg-card p-4" ref={containerRef} />
  );
}
