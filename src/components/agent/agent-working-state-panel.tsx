'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { HeartbeatIndicator, type HeartbeatStatus } from './heartbeat-indicator';
import { AutonomyLevelBadge, type AutonomyLevel } from './autonomy-level-badge';
import { AgentContextLoader } from './agent-context-loader';
import {
  Bot,
  ChevronRight,
  Clock,
  Target,
  ListTodo,
  StickyNote,
  History,
  Settings2,
} from 'lucide-react';
import type { Agent, AgentContext as PrismaAgentContext } from '@prisma/client';

interface WorkingState {
  currentTask?: string;
  lastAction?: string;
  lastActionTime?: string;
  lastResponseAt?: string;
  pendingItems?: string[];
}

type AgentWithContext = Agent & { context: PrismaAgentContext | null };

interface AgentWithLifecycle extends AgentWithContext {
  heartbeatStatus: HeartbeatStatus;
}

interface AgentWorkingStatePanelProps {
  agent: AgentWithLifecycle;
  className?: string;
  trigger?: React.ReactNode;
}

export function AgentWorkingStatePanel({
  agent,
  className,
  trigger,
}: AgentWorkingStatePanelProps) {
  const [open, setOpen] = useState(false);
  const context = agent.context;
  const workingState = context?.workingState as WorkingState | null;

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className={cn('gap-1.5 text-muted-foreground hover:text-foreground', className)}
    >
      <Bot className="h-4 w-4" />
      <span className="hidden sm:inline">{agent.name}</span>
      <ChevronRight className="h-3 w-3" />
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-card">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <HeartbeatIndicator status={agent.heartbeatStatus} size="sm" />
                </div>
              </div>
              <div>
                <SheetTitle className="text-lg">{agent.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{agent.type}</p>
              </div>
            </div>
            <AutonomyLevelBadge level={agent.autonomyLevel} size="sm" />
          </div>
        </SheetHeader>

        {context?.isLoading && (
          <div className="mt-4">
            <AgentContextLoader agentName={agent.name} isLoading variant="banner" />
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-180px)] mt-6 -mx-6 px-6">
          <div className="space-y-6">
            {/* Current Task */}
            <section>
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <Target className="h-4 w-4 text-primary" />
                Current Task
              </div>
              <div className="p-3 rounded-lg bg-background border border-border">
                {workingState?.currentTask ? (
                  <p className="text-sm">{workingState.currentTask}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No active task</p>
                )}
              </div>
            </section>

            <Separator />

            {/* Last Action */}
            <section>
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <History className="h-4 w-4 text-primary" />
                Last Action
              </div>
              <div className="p-3 rounded-lg bg-background border border-border">
                {workingState?.lastAction ? (
                  <div className="space-y-1">
                    <p className="text-sm">{workingState.lastAction}</p>
                    {(workingState.lastActionTime || workingState.lastResponseAt) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(workingState.lastActionTime || workingState.lastResponseAt!).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No recent actions</p>
                )}
              </div>
            </section>

            <Separator />

            {/* Pending Items */}
            <section>
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <ListTodo className="h-4 w-4 text-primary" />
                Pending Items
                {workingState?.pendingItems && workingState.pendingItems.length > 0 && (
                  <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                    {workingState.pendingItems.length}
                  </span>
                )}
              </div>
              <div className="p-3 rounded-lg bg-background border border-border">
                {workingState?.pendingItems && workingState.pendingItems.length > 0 ? (
                  <ul className="space-y-2">
                    {workingState.pendingItems.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="text-muted-foreground">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No pending items</p>
                )}
              </div>
            </section>

            <Separator />

            {/* Daily Notes */}
            <section>
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <StickyNote className="h-4 w-4 text-primary" />
                Daily Notes
              </div>
              <div className="p-3 rounded-lg bg-background border border-border min-h-[80px]">
                {context?.dailyNotes ? (
                  <p className="text-sm whitespace-pre-wrap">{context.dailyNotes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No notes for today</p>
                )}
              </div>
            </section>

            <Separator />

            {/* Agent Settings */}
            <section>
              <Button variant="outline" className="w-full gap-2">
                <Settings2 className="h-4 w-4" />
                Configure Agent
              </Button>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
