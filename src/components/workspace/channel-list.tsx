'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Hash,
  Plus,
  ChevronDown,
  ChevronRight,
  Settings,
  Bot,
  FolderOpen,
  MessageCircle,
  Code,
  LineChart,
  Briefcase,
  Users,
  Star,
  Heart,
  Flag,
  Bookmark,
  Tag,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { AgentCard, CreateAgentDialog } from '@/components/agent';
import {
  ChannelSettingsDialog,
  CreateChannelDialog,
  CreateGroupDialog,
  EditGroupDialog,
} from '@/components/channel';
import type { Channel, ChannelGroup, Workspace, Agent, AgentContext, ChannelAgent } from '@prisma/client';

type HeartbeatStatus = 'online' | 'stale' | 'offline';

type AgentWithContext = Agent & { context: AgentContext | null };

interface AgentWithLifecycle extends AgentWithContext {
  heartbeatStatus: HeartbeatStatus;
}

type ChannelWithAgents = Channel & {
  channelAgents: (ChannelAgent & { agent: Agent })[];
};

type ChannelGroupWithChannels = ChannelGroup & {
  channels: ChannelWithAgents[];
};

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'folder-open': FolderOpen,
  'briefcase': Briefcase,
  'message-circle': MessageCircle,
  'code': Code,
  'chart': LineChart,
  'users': Users,
  'star': Star,
  'heart': Heart,
  'flag': Flag,
  'bookmark': Bookmark,
  'tag': Tag,
  'zap': Zap,
};

interface Props {
  workspace: Workspace;
  channelGroups: ChannelGroupWithChannels[];
  ungroupedChannels: ChannelWithAgents[];
  agents: AgentWithLifecycle[];
  onChannelSelect?: () => void;
}

export function ChannelList({
  workspace,
  channelGroups,
  ungroupedChannels,
  agents,
  onChannelSelect,
}: Props) {
  const params = useParams();
  const currentChannelId = params.channelId as string;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(channelGroups.map((g) => g.id))
  );
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [settingsChannel, setSettingsChannel] = useState<ChannelWithAgents | null>(null);
  const [editingGroup, setEditingGroup] = useState<ChannelGroupWithChannels | null>(null);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const renderChannel = (channel: ChannelWithAgents) => (
    <div key={channel.id} className="group relative flex items-center">
      <Link
        href={`/workspace/${workspace.slug}/${channel.id}`}
        className={cn(
          'channel-item flex-1',
          currentChannelId === channel.id && 'active'
        )}
        onClick={() => onChannelSelect?.()}
      >
        <Hash className="h-4 w-4 shrink-0" />
        <span className="truncate">{channel.name}</span>

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
  );

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Workspace Header */}
      <div className="p-4 flex items-center justify-between">
        <h2 className="font-semibold truncate">{workspace.name}</h2>
        <Link href={`/workspace/${workspace.slug}/settings`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <Separator className="mx-4" />

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Groups Header */}
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Groups
            </span>
            <CreateGroupDialog workspaceId={workspace.id} />
          </div>

          {/* Channel Groups */}
          {channelGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            const GroupIcon = ICON_MAP[group.icon || 'folder-open'] || FolderOpen;

            return (
              <div key={group.id} className="mb-2">
                <div className="group/header flex items-center mb-1 relative">
                  <button
                    className="flex items-center gap-1.5 px-2 py-1.5 w-full text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
                    onClick={() => toggleGroup(group.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0" />
                    )}
                    <GroupIcon
                      className="h-4 w-4 shrink-0"
                      style={{ color: group.color || undefined }}
                    />
                    <span className="truncate">{group.name}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover/header:opacity-100 transition-opacity absolute right-1"
                    onClick={(e) => {
                      e.preventDefault();
                      setEditingGroup(group);
                    }}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>

                {isExpanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
                    {group.channels.map(renderChannel)}
                    <CreateChannelDialog
                      workspaceId={workspace.id}
                      workspaceSlug={workspace.slug}
                      groupId={group.id}
                      trigger={
                        <button className="channel-item w-full text-left text-muted-foreground hover:text-foreground">
                          <Plus className="h-4 w-4" />
                          <span className="text-xs">Add channel</span>
                        </button>
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}





          {/* Agents Section */}
          <div className="mt-4 pt-4 border-t border-border">
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
              <span className="ml-auto text-xs">{agents.length}</span>
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
          workspaceSlug={workspace.slug}
          open={!!settingsChannel}
          onOpenChange={(open) => !open && setSettingsChannel(null)}
        />
      )}

      {/* Edit Group Dialog */}
      {editingGroup && (
        <EditGroupDialog
          group={editingGroup}
          workspaceId={workspace.id}
          open={!!editingGroup}
          onOpenChange={(open) => !open && setEditingGroup(null)}
        />
      )}
    </div>
  );
}
