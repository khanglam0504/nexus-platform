'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, Check, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';

interface Agent {
  id: string;
  name: string;
  avatar: string | null;
  type: string;
  description: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  workspaceId: string;
  onDebateCreated?: (sessionId: string) => void;
}

const ROLE_OPTIONS = [
  { value: 'advocate', label: 'Advocate', description: 'Argues in favor' },
  { value: 'critic', label: 'Critic', description: 'Provides critical analysis' },
  { value: 'moderator', label: 'Moderator', description: 'Synthesizes and guides' },
];

export function TaskModal({ open, onOpenChange, channelId, workspaceId, onDebateCreated }: Props) {
  const [title, setTitle] = useState('');
  const [task, setTask] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [agentRoles, setAgentRoles] = useState<Record<string, string>>({});
  const [maxTurns, setMaxTurns] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: agents, isLoading: agentsLoading } = trpc.agent.list.useQuery(
    { workspaceId },
    { enabled: open }
  );

  const createDebate = trpc.debate.create.useMutation({
    onSuccess: (data: { id: string }) => {
      onOpenChange(false);
      resetForm();
      onDebateCreated?.(data.id);
    },
    onError: (error: unknown) => {
      console.error('Failed to create debate:', error);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const resetForm = () => {
    setTitle('');
    setTask('');
    setSelectedAgents([]);
    setAgentRoles({});
    setMaxTurns(3);
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const setAgentRole = (agentId: string, role: string) => {
    setAgentRoles((prev) => ({ ...prev, [agentId]: role }));
  };

  const handleSubmit = () => {
    if (!title.trim() || !task.trim() || selectedAgents.length < 2) return;

    setIsSubmitting(true);
    createDebate.mutate({
      channelId,
      title: title.trim(),
      task: task.trim(),
      agentIds: selectedAgents,
      maxTurns,
      roles: agentRoles,
    });
  };

  const isValid = title.trim() && task.trim() && selectedAgents.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Start Multi-Agent Debate
          </DialogTitle>
          <DialogDescription>
            Select AI agents to debate a task. They will discuss and provide different perspectives.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Best approach for user authentication"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <Label htmlFor="task">Task / Question</Label>
            <textarea
              id="task"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Describe the task or question for agents to debate..."
              value={task}
              onChange={(e) => setTask(e.target.value)}
            />
          </div>

          {/* Agent Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Select Agents (min 2)
            </Label>
            <ScrollArea className="h-[200px] rounded-md border p-2">
              {agentsLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading agents...
                </div>
              ) : agents?.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No agents available
                </div>
              ) : (
                <div className="space-y-2">
                  {agents?.map((agent) => (
                    <AgentSelectItem
                      key={agent.id}
                      agent={agent}
                      selected={selectedAgents.includes(agent.id)}
                      role={agentRoles[agent.id]}
                      onToggle={() => toggleAgent(agent.id)}
                      onRoleChange={(role) => setAgentRole(agent.id, role)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Max Turns */}
          <div className="space-y-2">
            <Label htmlFor="maxTurns">Turns per Agent</Label>
            <div className="flex items-center gap-2">
              <Input
                id="maxTurns"
                type="number"
                min={1}
                max={10}
                value={maxTurns}
                onChange={(e) => setMaxTurns(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                Total: {maxTurns * selectedAgents.length} turns
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Start Debate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Agent selection item component
interface AgentSelectItemProps {
  agent: Agent;
  selected: boolean;
  role?: string;
  onToggle: () => void;
  onRoleChange: (role: string) => void;
}

function AgentSelectItem({ agent, selected, role, onToggle, onRoleChange }: AgentSelectItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-secondary/50'
      )}
      onClick={onToggle}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={agent.avatar || undefined} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{agent.name}</span>
          <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{agent.type}</span>
        </div>
        {agent.description && (
          <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
        )}
      </div>

      {selected && (
        <div className="flex items-center gap-2">
          <select
            className="text-xs bg-secondary border-none rounded px-2 py-1 focus:ring-1 focus:ring-primary"
            value={role || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onRoleChange(e.target.value)}
          >
            <option value="">No role</option>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Check className="h-4 w-4 text-primary" />
        </div>
      )}
    </div>
  );
}
