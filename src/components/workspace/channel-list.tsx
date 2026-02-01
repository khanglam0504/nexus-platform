'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Hash, Plus, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { AgentCard } from '@/components/agent';
import type { Channel, Workspace, Agent, AgentContext } from '@prisma/client';

type HeartbeatStatus = 'online' | 'stale' | 'offline';

type AgentWithContext = Agent & { context: AgentContext | null };

interface AgentWithLifecycle extends AgentWithContext {
  heartbeatStatus: HeartbeatStatus;
}

interface Props {
  workspace: Workspace;
  channels: Channel[];
  agents: AgentWithLifecycle[];
  onChannelSelect?: () => void;
}

export function ChannelList({ workspace, channels, agents, onChannelSelect }: Props) {
  const params = useParams();
  const currentChannelId = params.channelId as string;
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [newChannelName, setNewChannelName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  const createChannel = trpc.channel.create.useMutation({
    onSuccess: () => {
      setNewChannelName('');
      setDialogOpen(false);
      utils.workspace.get.invalidate({ slug: workspace.slug });
    },
  });

  const handleCreateChannel = () => {
    if (newChannelName.trim()) {
      createChannel.mutate({
        name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
        workspaceId: workspace.id,
      });
    }
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Workspace Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold truncate">{workspace.name}</h2>
        <Link href={`/workspace/${workspace.slug}/settings`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Channels Section */}
          <div className="mb-4">
            <button
              className="flex items-center gap-1 px-2 py-1 w-full text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setChannelsExpanded(!channelsExpanded)}
            >
              {channelsExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Channels
            </button>

            {channelsExpanded && (
              <div className="mt-1 space-y-0.5">
                {channels.map((channel) => (
                  <Link
                    key={channel.id}
                    href={`/workspace/${workspace.slug}/${channel.id}`}
                    className={cn(
                      'channel-item',
                      currentChannelId === channel.id && 'active'
                    )}
                    onClick={() => onChannelSelect?.()}
                  >
                    <Hash className="h-4 w-4" />
                    <span className="truncate">{channel.name}</span>
                  </Link>
                ))}

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="channel-item w-full text-left">
                      <Plus className="h-4 w-4" />
                      <span>Add channel</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Channel</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="channel-name">Channel name</Label>
                        <Input
                          id="channel-name"
                          placeholder="e.g. marketing"
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleCreateChannel}
                        disabled={!newChannelName.trim() || createChannel.isPending}
                        className="w-full"
                      >
                        Create Channel
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* Agents Section */}
          <div>
            <button
              className="flex items-center gap-1 px-2 py-1 w-full text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setAgentsExpanded(!agentsExpanded)}
            >
              {agentsExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              AI Agents
            </button>

            {agentsExpanded && (
              <div className="mt-1 space-y-0.5">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} compact />
                ))}

                {agents.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-1">
                    No agents configured
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
