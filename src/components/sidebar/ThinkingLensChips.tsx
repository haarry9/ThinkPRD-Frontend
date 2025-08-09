import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Compass, Route, BarChart3, Megaphone, AlertTriangle } from "lucide-react";

export type LensKey = "discovery" | "user_journey" | "metrics" | "gtm" | "risks";

const ICONS: Record<LensKey, React.ComponentType<any>> = {
  discovery: Compass,
  user_journey: Route,
  metrics: BarChart3,
  gtm: Megaphone,
  risks: AlertTriangle,
};

const DESCRIPTIONS: Record<LensKey, string> = {
  discovery: "Problem, audience, and value props",
  user_journey: "End-to-end steps and touchpoints",
  metrics: "KPIs and success measures",
  gtm: "Launch plan and channels",
  risks: "Assumptions and mitigations",
};

interface ThinkingLensChipsProps {
  value: Record<LensKey, boolean>;
  onToggle: (key: LensKey, next: boolean) => void;
}

export default function ThinkingLensChips({ value, onToggle }: ThinkingLensChipsProps) {
  const entries = Object.entries(value) as [LensKey, boolean][];
  const complete = entries.filter(([, v]) => v).length;

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Thinking Lens · {complete}/{entries.length} complete
      </div>
      <ToggleGroup type="multiple" className="flex flex-wrap gap-2">
        <TooltipProvider>
          {entries.map(([key, checked]) => {
            const Icon = ICONS[key];
            return (
              <Tooltip key={key} delayDuration={200}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={key}
                    pressed={checked}
                    onPressedChange={(p) => onToggle(key, p)}
                    className="data-[state=on]:text-primary data-[state=on]:bg-primary/10 ring-1 ring-border rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-2"
                    aria-label={key.replace("_", " ")}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="capitalize">{key.replace("_", " ")}</span>
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {DESCRIPTIONS[key]}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </ToggleGroup>
    </div>
  );
}


