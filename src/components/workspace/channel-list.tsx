'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Hash, Plus, ChevronDown, ChevronRight, Settings, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentCard, CreateAgentDialog } from '@/components/agent';
import { ChannelSettingsDialog, CreateChannelDialog } from '@/components/channel';
import type { Channel, Workspace, Agent, AgentContext, ChannelAgent } from '@prisma/client';

type HeartbeatStatus = 'online' | 'stale' | 'offline';

type AgentWithContext = Agent & { context: AgentContext | null };

interface AgentWithLifecycle extends AgentWithContext {
  heartbeatStatus: HeartbeatStatus;
}

type ChannelWithAgents = Channel & {
  channelAgents: (ChannelAgent & { agent: Agent })[];
};

interface Props {
  workspace: Workspace;
  channels: ChannelWithAgents[];
  agents: AgentWithLifecycle[];
  onChannelSelect?: () => void;
}

export function ChannelList({ workspace, channels, agents, onChannelSelect }: Props) {
  const params = useParams();
  const currentChannelId = params.channelId as string;
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [settingsChannel, setSettingsChannel] = useState<ChannelWithAgents | null>(null);

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
                  <div key={channel.id} className="group relative flex items-center">
                    <Link
                      href={`/workspace/${workspace.slug}/${channel.id}`}
                      className={cn(
                        'channel-item flex-1',
                        currentChannelId === channel.id && 'active'
                      )}
                      onClick={() => onChannelSelect?.()}
                    >
                      <Hash className="h-4 w-4" />
                      <span className="truncate">{channel.name}</span>
                      {channel.channelAgents?.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="ml-auto flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Bot className="h-3 w-3" />
                              {channel.channelAgents.length}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {channel.channelAgents.map((ca) => ca.agent.name).join(', ')}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1"
                      onClick={(e) => {
                        e.preventDefault();
                        setSettingsChannel(channel);
                      }}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <CreateChannelDialog
                  workspaceId={workspace.id}
                  workspaceSlug={workspace.slug}
                />
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

                <CreateAgentDialog
                  workspaceId={workspace.id}
                  trigger={
                    <button className="channel-item w-full text-left">
                      <Plus className="h-4 w-4" />
                      <span>Add agent</span>
                    </button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Channel Settings Dialog */}
      {settingsChannel && (
        <ChannelSettingsDialog
          channel={settingsChannel}
          workspaceId={workspace.id}
          open={!!settingsChannel}
          onOpenChange={(open) => !open && setSettingsChannel(null)}
        />
      )}
    </div>
  );
}
