'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bot,
  Play,
  StopCircle,
  FastForward,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { getSocket } from '@/lib/socket';
type DebateStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface DebateTurn {
  id: string;
  turnNumber: number;
  content: string;
  createdAt: Date;
  debateAgent: {
    agent: {
      id: string;
      name: string;
      avatar: string | null;
      type: string;
    };
    role: string | null;
  };
}

interface DebateAgent {
  id: string;
  agent: {
    id: string;
    name: string;
    avatar: string | null;
    type: string;
  };
  role: string | null;
}

interface Props {
  sessionId: string;
  channelId: string;
  onClose?: () => void;
}

const STATUS_CONFIG: Record<DebateStatus, { icon: typeof Clock; label: string; color: string; animate?: boolean }> = {
  PENDING: { icon: Clock, label: 'Pending', color: 'text-muted-foreground' },
  IN_PROGRESS: { icon: Loader2, label: 'In Progress', color: 'text-primary', animate: true },
  COMPLETED: { icon: CheckCircle2, label: 'Completed', color: 'text-green-500' },
  CANCELLED: { icon: XCircle, label: 'Cancelled', color: 'text-destructive' },
};

export function DebateView({ sessionId, channelId, onClose }: Props) {
  const [autoScroll, setAutoScroll] = useState(true);

  const utils = trpc.useUtils();

  const { data: session, isLoading } = trpc.debate.getById.useQuery(
    { sessionId },
    { refetchInterval: false }
  );

  const startDebate = trpc.debate.start.useMutation({
    onSuccess: () => void utils.debate.getById.invalidate({ sessionId }),
  });

  const nextTurn = trpc.debate.nextTurn.useMutation({
    onSuccess: () => void utils.debate.getById.invalidate({ sessionId }),
  });

  const runFull = trpc.debate.runFull.useMutation({
    onSuccess: () => void utils.debate.getById.invalidate({ sessionId }),
  });

  const cancelDebate = trpc.debate.cancel.useMutation({
    onSuccess: () => void utils.debate.getById.invalidate({ sessionId }),
  });

  const summarize = trpc.debate.summarize.useMutation({
    onSuccess: () => void utils.debate.getById.invalidate({ sessionId }),
  });

  // Subscribe to socket events for real-time updates
  useEffect(() => {
    if (!session) return;

    const socket = getSocket();

    // Join channel for debate updates (debates emit to channel rooms)
    socket.emit('channel:join', channelId);

    const handleTurn = () => {
      void utils.debate.getById.invalidate({ sessionId });
    };

    const handleStatus = () => {
      void utils.debate.getById.invalidate({ sessionId });
    };

    // Use 'any' cast since these are custom events not in the base type
    (socket as unknown as { on: (event: string, handler: () => void) => void }).on('debate:turn', handleTurn);
    (socket as unknown as { on: (event: string, handler: () => void) => void }).on('debate:status', handleStatus);

    return () => {
      (socket as unknown as { off: (event: string, handler: () => void) => void }).off('debate:turn', handleTurn);
      (socket as unknown as { off: (event: string, handler: () => void) => void }).off('debate:status', handleStatus);
    };
  }, [sessionId, session, utils, channelId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Debate session not found
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[session.status as DebateStatus];
  const StatusIcon = statusConfig.icon;
  const totalTurns = session.maxTurns * session.agents.length;
  const progress = (session.currentTurn / totalTurns) * 100;

  const canStart = session.status === 'PENDING';
  const canAdvance = session.status === 'IN_PROGRESS' && session.currentTurn < totalTurns;
  const canCancel = session.status === 'PENDING' || session.status === 'IN_PROGRESS';
  const canSummarize = session.status === 'COMPLETED' && !session.summary;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{session.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusIcon
                className={cn('h-4 w-4', statusConfig.color, statusConfig.animate && 'animate-spin')}
              />
              <span className={cn('text-sm', statusConfig.color)}>{statusConfig.label}</span>
              <span className="text-xs text-muted-foreground">
                Turn {session.currentTurn}/{totalTurns}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {canStart && (
              <Button
                size="sm"
                onClick={() => startDebate.mutate({ sessionId })}
                disabled={startDebate.isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}

            {canAdvance && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => nextTurn.mutate({ sessionId })}
                  disabled={nextTurn.isPending}
                >
                  {nextTurn.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  Next Turn
                </Button>

                <Button
                  size="sm"
                  onClick={() => runFull.mutate({ sessionId })}
                  disabled={runFull.isPending}
                >
                  {runFull.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <FastForward className="h-4 w-4 mr-1" />
                  )}
                  Run All
                </Button>
              </>
            )}

            {canCancel && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => cancelDebate.mutate({ sessionId })}
                disabled={cancelDebate.isPending}
              >
                <StopCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}

            {canSummarize && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => summarize.mutate({ sessionId })}
                disabled={summarize.isPending}
              >
                {summarize.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1" />
                )}
                Summarize
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Task description */}
        <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
          <p className="text-sm font-medium mb-1">Task:</p>
          <p className="text-sm text-muted-foreground">{session.task}</p>
        </div>

        {/* Participants */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Participants:</span>
          <div className="flex -space-x-2">
            {session.agents.map((da: DebateAgent) => (
              <Avatar key={da.id} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={da.agent.avatar || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  <Bot className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {session.agents.map((da: DebateAgent) => da.agent.name).join(', ')}
          </span>
        </div>
      </div>

      {/* Turns */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {session.turns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bot className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No turns yet. Start the debate to begin.</p>
            </div>
          ) : (
            session.turns.map((turn: DebateTurn, index: number) => (
              <TurnItem key={turn.id} turn={turn} isLast={index === session.turns.length - 1} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Summary */}
      {session.summary && (
        <>
          <Separator />
          <div className="p-4 bg-secondary/30">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Summary</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{session.summary}</p>
          </div>
        </>
      )}
    </div>
  );
}

// Individual turn component
interface TurnItemProps {
  turn: DebateTurn;
  isLast: boolean;
}

function TurnItem({ turn, isLast }: TurnItemProps) {
  const agent = turn.debateAgent.agent;
  const role = turn.debateAgent.role;

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg',
        isLast ? 'bg-primary/5 border border-primary/20' : 'bg-secondary/30'
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={agent.avatar || undefined} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{agent.name}</span>
          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">{agent.type}</span>
          {role && (
            <span className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded capitalize">
              {role}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            Turn {turn.turnNumber}
          </span>
        </div>

        <p className="text-sm whitespace-pre-wrap">{turn.content}</p>

        <span className="text-xs text-muted-foreground mt-2 block">
          {formatDate(new Date(turn.createdAt))}
        </span>
      </div>
    </div>
  );
}
