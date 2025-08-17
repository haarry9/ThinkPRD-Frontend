import React, { useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Paperclip, MessageSquare, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TypingDots from "./TypingDots";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatPanelProps {
  mode: "chat" | "agent";
  onModeChange: (mode: "chat" | "agent") => void;
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  isTyping?: boolean;
  lastUpdated?: string | null;
  disabled?: boolean;
  streamingAssistantContent?: string;
  onUploadPdf?: (file: File) => Promise<void>;
  attachmentStatus?: 'idle' | 'uploading' | 'indexing' | 'ready' | 'error';
}

export default function ChatPanel({ 
  mode, 
  onModeChange,
  messages, 
  input, 
  setInput, 
  onSend, 
  isTyping, 
  lastUpdated, 
  disabled, 
  streamingAssistantContent, 
  onUploadPdf, 
  attachmentStatus 
}: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  return (
    <div className="chat-panel-container flex min-h-0 h-full flex-col space-y-3 overflow-hidden w-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="text-sm font-medium">PRD Agent</div>
        <Badge variant="secondary" className="text-xs capitalize">{mode}</Badge>
      </div>
      <Separator className="shrink-0" />

      <div className="flex-1 min-h-[200px] rounded-md border bg-card overflow-hidden w-full">
        <ScrollArea className="chat-scroll-area h-full p-3 w-full">
          <div className="space-y-3 max-w-full w-full">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {!!streamingAssistantContent && (
              <MessageBubble
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingAssistantContent,
                  timestamp: new Date().toISOString(),
                }}
              />
            )}
            {isTyping && (
              <div className="flex items-start gap-2">
                <Avatar className="h-6 w-6 ring-2 ring-primary/40">
                  <AvatarFallback className="text-[10px]">AI</AvatarFallback>
                </Avatar>
                <TypingDots />
              </div>
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || disabled) return;
          onSend();
        }}
        className="flex items-end gap-2 shrink-0"
      >
        {onUploadPdf && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try { 
                  await onUploadPdf(f); 
                } finally { 
                  if (fileInputRef.current) fileInputRef.current.value = ''; 
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title={attachmentStatus === 'indexing' ? 'Indexing…' : 'Attach PDF'}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </>
        )}
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === "agent" ? "Ask to update PRD..." : "Ask about your PRD & uploaded docs..."}
          className="min-h-[44px] max-h-40 resize-y"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() && !disabled) onSend();
            }
          }}
          disabled={disabled}
        />
        <Button 
          type="submit" 
          disabled={!input.trim() || !!disabled} 
          title={disabled ? 'Disabled while streaming' : undefined}
          onClick={(e) => {
            if (!input.trim() || disabled) return;
            onSend();
          }}
          className="h-[58px]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Mode Toggle - moved below the input form */}
      <div className="flex items-center gap-1 shrink-0">
        <Select onValueChange={onModeChange} value={mode}>
          <SelectTrigger className="w-[80px] h-6 text-[10px] px-2">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent className="w-[80px]">
            <SelectItem value="chat" className="h-6 text-[10px] px-2 [&>svg]:hidden [&>span[data-state='checked']]:hidden">Think</SelectItem>
            <SelectItem value="agent" className="h-6 text-[10px] px-2 [&>svg]:hidden [&>span[data-state='checked']]:hidden">Ask</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {attachmentStatus && attachmentStatus !== 'idle' && (
        <div className="text-xs text-muted-foreground shrink-0">
          {attachmentStatus === 'uploading' && 'Uploading PDF…'}
          {attachmentStatus === 'indexing' && 'Indexing PDF… You can still ask; I will answer from PRD until ready.'}
          {attachmentStatus === 'ready' && 'Document ready. It will be used for your next message.'}
          {attachmentStatus === 'error' && 'Attachment failed.'}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";
  return (
    <div className={`flex items-start gap-2 ${isAssistant ? "" : "flex-row-reverse"}`}>
      <Avatar className="h-7 w-7">
        <AvatarFallback className="text-[10px]">{isAssistant ? "AI" : "U"}</AvatarFallback>
      </Avatar>
      <div className={`chat-message-bubble max-w-[80%] rounded-2xl px-3 py-2 text-sm overflow-hidden ${isAssistant ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`} style={{ minWidth: 0 }}>
        {isAssistant ? (
          <div className="prose prose-invert prose-p:my-2 prose-ul:my-2 prose-pre:my-2 max-w-none break-words overflow-hidden" style={{ minWidth: 0 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="break-words">{message.content}</div>
        )}
      </div>
    </div>
  );
}