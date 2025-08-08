import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

export type LensKey = "discovery" | "user_journey" | "metrics" | "gtm" | "risks";

const LENS_LABELS: Record<LensKey, string> = {
  discovery: "Discovery",
  user_journey: "User Journey",
  metrics: "Metrics",
  gtm: "GTM",
  risks: "Risks",
};

const LENS_DESCRIPTIONS: Record<LensKey, string> = {
  discovery: "Clarify who you’re building for, their pain, and current alternatives.",
  user_journey: "Map the steps a user takes, entry points, and important edge cases.",
  metrics: "Define success KPIs, guardrails, and the timeframe to see impact.",
  gtm: "Outline buyer, channels, and initial pricing/packaging for launch.",
  risks: "List top risks, dependencies, and how you’ll mitigate them.",
};

const DEFAULT_QUESTIONS: Record<LensKey, string[]> = {
  discovery: [
    "Who is your primary target user?",
    "What core problem are we solving?",
    "Which alternatives do users have now?",
  ],
  user_journey: [
    "What's the main user action or happy path?",
    "What are the entry points into the product?",
    "What are key edge cases to consider?",
  ],
  metrics: [
    "What are the primary success metrics?",
    "What are guardrail metrics to watch?",
    "What is the timeframe for measuring impact?",
  ],
  gtm: [
    "Who is the buyer and decision maker?",
    "What channels will we use to reach users?",
    "What is the initial pricing/packaging?",
  ],
  risks: [
    "What are the top 3 risks or unknowns?",
    "What dependencies could block progress?",
    "What is the mitigation plan for key risks?",
  ],
};

export interface ClarificationAnswers {
  [lens: string]: string[];
}

interface Props {
  open: boolean;
  idea: string;
  onClose: () => void;
  onSubmit: (answers: ClarificationAnswers) => void;
}

export default function ClarificationModal({ open, idea, onClose, onSubmit }: Props) {
  const [answers, setAnswers] = useState<ClarificationAnswers>(() => {
    const init: ClarificationAnswers = {};
    (Object.keys(DEFAULT_QUESTIONS) as LensKey[]).forEach((k) => {
      init[k] = DEFAULT_QUESTIONS[k].map(() => "");
    });
    return init;
  });

  const [active, setActive] = useState<LensKey>("discovery");

  const handleChange = (lens: LensKey, idx: number, val: string) => {
    setAnswers((prev) => {
      const copy = { ...prev } as ClarificationAnswers;
      const arr = [...(copy[lens] || [])];
      arr[idx] = val;
      copy[lens] = arr;
      return copy;
    });
  };

  const submit = () => onSubmit(answers);

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        className="max-w-4xl w-[92vw] sm:w-full bg-card/80 backdrop-blur-md border border-border/60 shadow-2xl rounded-2xl animate-enter max-h-[85vh] overflow-hidden grid grid-rows-[auto,minmax(0,1fr),auto]"
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Help us understand your idea better</DialogTitle>
          <p className="text-sm text-muted-foreground">Idea: {idea}</p>
        </DialogHeader>

        {/* Scrollable middle content to keep header/footer visible */}
        <ScrollArea className="mt-2 h-full pr-2">
          <Tabs value={active} onValueChange={(v) => setActive(v as LensKey)} className="">
            <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full sticky top-0 z-10 bg-card/80 backdrop-blur-md rounded-lg">
              {(Object.keys(LENS_LABELS) as LensKey[]).map((k) => (
                <TabsTrigger key={k} value={k} title={LENS_DESCRIPTIONS[k]}>
                  {LENS_LABELS[k]}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="sticky top-10 z-10 mt-2 rounded-md border border-border/50 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {LENS_DESCRIPTIONS[active]}
            </div>

            {(Object.keys(DEFAULT_QUESTIONS) as LensKey[]).map((lens) => (
              <TabsContent key={lens} value={lens} className="space-y-6 mt-4">
                {DEFAULT_QUESTIONS[lens].map((q, idx) => (
                  <div key={idx} className="space-y-2">
                    <p className="text-sm text-muted-foreground">Q{idx + 1}: {q}</p>
                    <Textarea
                      className="min-h-24 resize-y bg-background/60"
                      placeholder="Type your response..."
                      value={answers[lens]?.[idx] || ""}
                      onChange={(e) => handleChange(lens, idx, e.target.value)}
                    />
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={submit}>Submit</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
