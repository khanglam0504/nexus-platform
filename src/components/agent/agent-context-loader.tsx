'use client';

import { cn } from '@/lib/utils';
import { Loader2, Brain } from 'lucide-react';

interface AgentContextLoaderProps {
  agentName?: string;
  isLoading: boolean;
  className?: string;
  variant?: 'inline' | 'overlay' | 'banner';
}

export function AgentContextLoader({
  agentName,
  isLoading,
  className,
  variant = 'inline',
}: AgentContextLoaderProps) {
  if (!isLoading) return null;

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-muted-foreground text-sm',
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Loading context...</span>
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10 rounded-lg',
          className
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center p-4">
          <div className="relative">
            <Brain className="h-8 w-8 text-primary" />
            <div className="absolute -inset-2 rounded-full border-2 border-primary/30 animate-ping" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Loading Context</p>
            <p className="text-sm text-muted-foreground">
              {agentName ? `${agentName} is initializing...` : 'Initializing agent...'}
            </p>
          </div>
          <div className="w-32 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary/50 to-primary rounded-full animate-context-loading"
              style={{ width: '100%', backgroundSize: '200% 100%' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Banner variant
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg',
        className
      )}
    >
      <div className="relative flex items-center justify-center h-5 w-5">
        <Brain className="h-4 w-4 text-primary" />
        <div className="absolute inset-0 rounded-full border border-primary/40 animate-ping" />
      </div>
      <span className="text-sm text-primary">
        {agentName ? `${agentName} loading context...` : 'Loading context...'}
      </span>
    </div>
  );
}
