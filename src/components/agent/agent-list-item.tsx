'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AvatarDisplay } from './avatar-display';
import { HeartbeatIndicator, type HeartbeatStatus } from './heartbeat-indicator';
import { AutonomyLevelBadge } from './autonomy-level-badge';
import { trpc } from '@/lib/trpc';
import { Bot, MoreVertical, Pencil, Trash2, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import type { Agent, AgentContext, AutonomyLevel } from '@prisma/client';

type AgentWithContext = Agent & { context: AgentContext | null };

interface AgentWithLifecycle extends AgentWithContext {
  heartbeatStatus: HeartbeatStatus;
}

interface AgentListItemProps {
  agent: AgentWithLifecycle;
  workspaceId: string;
  onEdit?: (agent: AgentWithLifecycle) => void;
}

export function AgentListItem({ agent, workspaceId, onEdit }: AgentListItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const utils = trpc.useUtils();

  const updateAgent = trpc.agent.update.useMutation({
    onSuccess: () => {
      utils.agent.list.invalidate({ workspaceId });
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to update agent');
    },
  });

  const toggleActive = () => {
    updateAgent.mutate({
      agentId: agent.id,
      isActive: !agent.isActive,
    });
    toast.success(agent.isActive ? 'Agent deactivated' : 'Agent activated');
  };

  const handleDelete = () => {
    updateAgent.mutate({
      agentId: agent.id,
      isActive: false,
    });
    toast.success(`Agent "${agent.name}" removed`);
    setShowDeleteDialog(false);
  };

  const config = agent.config as Record<string, unknown> | null;
  const openclawConfig = config?.openclaw as Record<string, unknown> | undefined;
  const hasOpenClawConnection = !!(openclawConfig?.gatewayUrl || openclawConfig?.token);

  return (
    <>
      <div className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <AvatarDisplay
            name={agent.name}
            avatarUrl={(config?.avatar as string) || agent.avatar}
            className="h-10 w-10"
          />
          <div className="absolute -bottom-0.5 -right-0.5">
            <HeartbeatIndicator status={agent.heartbeatStatus} size="sm" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{agent.name}</p>
            <AutonomyLevelBadge level={agent.autonomyLevel as AutonomyLevel} size="sm" />
            {hasOpenClawConnection && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                OpenClaw
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{agent.type}</span>
            {agent.description && (
              <>
                <span>•</span>
                <span className="truncate">{agent.description}</span>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {!agent.isActive && (
            <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
              Inactive
            </span>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(agent)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleActive}>
              {agent.isActive ? (
                <>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{agent.name}"? This will deactivate the agent
              and remove it from all channels.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
