import { Brain, Bot } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Mode = "think" | "agent";

interface ModeSegmentedProps {
  value: Mode;
  onChange: (value: Mode) => void;
  compact?: boolean;
}

export default function ModeSegmented({ value, onChange, compact }: ModeSegmentedProps) {
  const groupClasses = compact
    ? "w-full justify-center gap-2"
    : "w-full rounded-full bg-muted/60 p-1 ring-1 ring-border";
  const itemClasses = compact
    ? "rounded-full px-2 py-1 ring-1 ring-border data-[state=on]:bg-background data-[state=on]:shadow-sm transition-colors"
    : "flex-1 rounded-full px-3 py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm transition-colors";
  const iconSize = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = compact ? "text-[11px]" : "text-xs";
  return (
    <div className="w-full">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as Mode)}
        className={groupClasses}
      >
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value="think"
                className={itemClasses}
                aria-label="Think mode"
              >
                <div className={`flex items-center justify-center gap-2 ${textSize}`}>
                  <Brain className={iconSize} />
                  <span>Think</span>
                </div>
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[220px]">
              Brainstorm without changing the PRD.
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value="agent"
                className={itemClasses}
                aria-label="Agent mode"
              >
                <div className={`flex items-center justify-center gap-2 ${textSize}`}>
                  <Bot className={iconSize} />
                  <span>Agent</span>
                </div>
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[220px]">
              Apply changes directly to the PRD.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ToggleGroup>
    </div>
  );
}


