import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export default function PRDEditor({ value, onChange, disabled }: Props) {
  return (
    <div className="w-full">
      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
        </TabsList>
        <TabsContent value="edit" className="mt-2">
          <Textarea
            className="min-h-[420px] font-mono text-sm"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="# Product Requirements Document\n..."
            disabled={disabled}
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-2">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
