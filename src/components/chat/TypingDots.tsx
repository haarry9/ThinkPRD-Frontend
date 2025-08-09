export default function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 rounded-full bg-muted text-muted-foreground">
      <span className="sr-only">Assistant is typing</span>
      <div className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.2s]" />
      <div className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
      <div className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
    </div>
  );
}


