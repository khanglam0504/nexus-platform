'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  Send,
  Loader2,
  Crown,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  workspaceId: string;
  workspaceSlug: string;
}

export function MasterAgentPanel({ workspaceId, workspaceSlug }: Props) {
  const [command, setCommand] = useState('');

  const utils = trpc.useUtils();

  const { data: masterAgent, isLoading: loadingAgent } = trpc.workspace.getMasterAgent.useQuery({
    workspaceId,
  });

  const { data: commands, isLoading: loadingCommands } = trpc.command.list.useQuery({
    workspaceId,
    limit: 10,
  });

  const sendCommand = trpc.command.send.useMutation({
    onSuccess: () => {
      setCommand('');
      utils.command.list.invalidate({ workspaceId });
    },
  });

  const handleSend = () => {
    if (!command.trim() || !masterAgent) return;
    sendCommand.mutate({ workspaceId, content: command.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'PROCESSING':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (loadingAgent) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No master agent configured
  if (!masterAgent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Crown className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No Master Agent</h3>
        <p className="text-muted-foreground text-sm mb-4 max-w-sm">
          Configure a Master Agent to manage this workspace and delegate tasks to sub-agents.
        </p>
        <Button variant="outline" asChild>
          <a href={`/workspace/${workspaceSlug}/settings`}>
            <Settings className="h-4 w-4 mr-2" />
            Configure in Settings
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Master Agent Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div
              className={cn(
                'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card',
                masterAgent.heartbeatStatus === 'online'
                  ? 'bg-emerald-500'
                  : masterAgent.heartbeatStatus === 'stale'
                  ? 'bg-yellow-500'
                  : 'bg-gray-400'
              )}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{masterAgent.name}</h3>
              <span className="text-xs bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded">
                MASTER
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {masterAgent.description || 'Workspace Manager'}
            </p>
          </div>
        </div>
      </div>

      {/* Command History */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {loadingCommands ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : commands && commands.length > 0 ? (
            commands.map((cmd) => (
              <div
                key={cmd.id}
                className="p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium">{cmd.content}</p>
                  {getStatusIcon(cmd.status)}
                </div>
                {cmd.response && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {cmd.response}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(cmd.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No commands yet</p>
              <p className="text-xs">Send your first command to the Master Agent</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Command Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Give a command to the Master Agent..."
            className="min-h-[80px] resize-none"
            disabled={sendCommand.isPending}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Enter</kbd> to send
          </p>
          <Button
            onClick={handleSend}
            disabled={!command.trim() || sendCommand.isPending}
            size="sm"
          >
            {sendCommand.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Command
          </Button>
        </div>
      </div>
    </div>
  );
}
