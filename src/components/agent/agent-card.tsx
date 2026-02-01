'use client';

import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';
import { HeartbeatIndicator, type HeartbeatStatus } from './heartbeat-indicator';
import { AutonomyLevelBadge, type AutonomyLevel } from './autonomy-level-badge';
import { AgentContextLoader } from './agent-context-loader';
import { AgentWorkingStatePanel } from './agent-working-state-panel';
import type { Agent, AgentContext } from '@prisma/client';

type AgentWithContext = Agent & { context: AgentContext | null };

interface AgentWithLifecycle extends AgentWithContext {
  heartbeatStatus: HeartbeatStatus;
}

interface AgentCardProps {
  agent: AgentWithLifecycle;
  className?: string;
  compact?: boolean;
  onClick?: () => void;
}

export function AgentCard({ agent, className, compact = false, onClick }: AgentCardProps) {
  const isLoading = agent.context?.isLoading;

  if (compact) {
    return (
      <AgentWorkingStatePanel
        agent={agent}
        trigger={
          <div
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer',
              'hover:bg-muted/50 transition-colors group',
              className
            )}
            onClick={onClick}
          >
            <div className="relative flex-shrink-0">
              <Bot className="h-4 w-4 text-primary" />
              <div className="absolute -bottom-0.5 -right-0.5">
                <HeartbeatIndicator status={agent.heartbeatStatus} size="sm" />
              </div>
            </div>
            <span className="truncate flex-1 text-sm">{agent.name}</span>
            <AutonomyLevelBadge level={agent.autonomyLevel} size="sm" showLabel={false} />
          </div>
        }
      />
    );
  }

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border border-border bg-card',
        'hover:border-primary/50 transition-all cursor-pointer group',
        className
      )}
    >
      {isLoading && <AgentContextLoader agentName={agent.name} isLoading variant="overlay" />}

      <AgentWorkingStatePanel
        agent={agent}
        trigger={
          <div className="flex items-start gap-3 w-full">
            <div className="relative flex-shrink-0">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1">
                <HeartbeatIndicator
                  status={agent.heartbeatStatus}
                  lastHeartbeat={agent.lastHeartbeat}
                  size="md"
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{agent.name}</h3>
                <AutonomyLevelBadge level={agent.autonomyLevel} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{agent.type}</p>
              {agent.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {agent.description}
                </p>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}
