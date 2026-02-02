'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Bot, Loader2, Plus, Sparkles, Link2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface Props {
  workspaceId: string;
  workspaceSlug: string;
  groupId?: string;
  trigger?: React.ReactNode;
}

export function CreateChannelDialog({ workspaceId, workspaceSlug, groupId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  const utils = trpc.useUtils();

  // Fetch all agents in workspace
  const { data: agents = [] } = trpc.agent.list.useQuery(
    { workspaceId },
    { enabled: open }
  );

  const createChannel = trpc.channel.create.useMutation({
    onSuccess: () => {
      setName('');
      setDescription('');
      setSessionName('');
      setAiEnabled(false);
      setSelectedAgentIds([]);
      setOpen(false);
      utils.workspace.get.invalidate({ slug: workspaceSlug });
      utils.channel.list.invalidate({ workspaceId });
      utils.channelGroup.list.invalidate({ workspaceId });
    },
  });

  const handleCreate = () => {
    if (name.trim()) {
      createChannel.mutate({
        name: name.toLowerCase().replace(/\s+/g, '-'),
        workspaceId,
        description: description || undefined,
        sessionName: sessionName || undefined,
        aiEnabled,
        groupId,
        agentIds: selectedAgentIds.length > 0 ? selectedAgentIds : undefined,
      });
    }
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  // Get first selected agent for AI toggle display
  const primaryAgent = agents.find((a) => selectedAgentIds.includes(a.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="channel-item w-full text-left">
            <Plus className="h-4 w-4" />
            <span>Add channel</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create channel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="new-channel-name">Channel name</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                #
              </span>
              <Input
                id="new-channel-name"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="new-channel"
                className="pl-7"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="new-channel-desc">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="new-channel-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              rows={2}
            />
          </div>

          {/* Session Name */}
          <div className="space-y-2">
            <Label htmlFor="session-name" className="flex items-center gap-1.5">
              <Link2 className="h-4 w-4" />
              Session name <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="session-name"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="e.g., my-project, dev-chat"
            />
            <p className="text-xs text-muted-foreground">
              Custom session identifier for AI conversations. If empty, uses channel ID.
            </p>
          </div>

          {/* AI Assistant Toggle */}
          {agents.length > 0 && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">AI Assistant</p>
                  <p className="text-xs text-muted-foreground">
                    {primaryAgent
                      ? `${primaryAgent.name} will respond in this channel`
                      : 'AI will respond in this channel'}
                  </p>
                </div>
              </div>
              <Switch
                checked={aiEnabled}
                onCheckedChange={setAiEnabled}
              />
            </div>
          )}

          {/* Agents Selection */}
          {agents.length > 0 && (
            <div className="space-y-2">
              <Label>AI Agents</Label>
              <ScrollArea className="h-[120px] border rounded-md p-2">
                <div className="space-y-1">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors',
                        selectedAgentIds.includes(agent.id) && 'bg-muted'
                      )}
                      onClick={() => toggleAgent(agent.id)}
                    >
                      <Checkbox
                        checked={selectedAgentIds.includes(agent.id)}
                        onCheckedChange={() => toggleAgent(agent.id)}
                      />
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={agent.avatar || undefined} />
                        <AvatarFallback>
                          <Bot className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {agents.length === 0 && (
            <div className="flex items-center gap-2 p-3 border rounded-md text-muted-foreground">
              <Bot className="h-5 w-5" />
              <span className="text-sm">No agents in workspace yet</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || createChannel.isPending}
          >
            {createChannel.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
