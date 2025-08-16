import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Bot } from 'lucide-react';

interface ModeSegmentedProps {
  value: 'chat' | 'agent';
  onChange: (value: 'chat' | 'agent') => void;
  compact?: boolean;
}

export default function ModeSegmented({ value, onChange, compact = false }: ModeSegmentedProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
      <Button
        variant={value === 'chat' ? 'secondary' : 'ghost'}
        size={compact ? 'sm' : 'default'}
        className={`flex-1 gap-2 ${value === 'chat' ? 'shadow-sm' : ''}`}
        onClick={() => onChange('chat')}
      >
        <MessageSquare className="h-4 w-4" />
        {!compact && 'Think'}
      </Button>
      <Button
        variant={value === 'agent' ? 'secondary' : 'ghost'}
        size={compact ? 'sm' : 'default'}
        className={`flex-1 gap-2 ${value === 'agent' ? 'shadow-sm' : ''}`}
        onClick={() => onChange('agent')}
      >
        <Bot className="h-4 w-4" />
        {!compact && 'Agent'}
      </Button>
    </div>
  );
}