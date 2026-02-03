'use client';

import { Bot, Hash, Users, Activity, Crown, MessageSquare, FolderOpen } from 'lucide-react';
import { MasterAgentPanel } from '@/components/command';
import { cn } from '@/lib/utils';
import type { Agent, AgentContext, Channel, ChannelGroup, WorkspaceMember } from '@prisma/client';

type HeartbeatStatus = 'online' | 'stale' | 'offline';

interface AgentWithStatus extends Agent {
  context: AgentContext | null;
  heartbeatStatus: HeartbeatStatus;
}

interface Props {
  workspace: {
    id: string;
    name: string;
    slug: string;
    masterAgentId: string | null;
  };
  agents: AgentWithStatus[];
  channelGroups: (ChannelGroup & { channels: Channel[] })[];
  members: (WorkspaceMember & { user: { id: string; name: string | null; image: string | null } })[];
}

export function WorkspaceDashboard({ workspace, agents, channelGroups, members }: Props) {
  const masterAgent = agents.find((a) => a.id === workspace.masterAgentId);
  const subAgents = agents.filter((a) => a.id !== workspace.masterAgentId);
  const onlineAgents = agents.filter((a) => a.heartbeatStatus === 'online').length;
  const totalChannels = channelGroups.reduce((acc, g) => acc + g.channels.length, 0);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">{workspace.name}</h1>
          <p className="text-muted-foreground">AI Agent Communication Hub Dashboard</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Bot}
            label="Total Agents"
            value={agents.length}
            subtext={`${onlineAgents} online`}
            color="text-primary"
          />
          <StatCard
            icon={FolderOpen}
            label="Groups"
            value={channelGroups.length}
            color="text-blue-500"
          />
          <StatCard
            icon={Hash}
            label="Channels"
            value={totalChannels}
            color="text-emerald-500"
          />
          <StatCard
            icon={Users}
            label="Members"
            value={members.length}
            color="text-purple-500"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Master Agent Panel */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-gradient-to-r from-amber-500/10 to-orange-500/10">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <h2 className="font-semibold">Command Center</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Send commands to the Master Agent
              </p>
            </div>
            <div className="h-[400px]">
              <MasterAgentPanel workspaceId={workspace.id} workspaceSlug={workspace.slug} />
            </div>
          </div>

          {/* Sub-Agents Overview */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Sub-Agents</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Agents working in channels
              </p>
            </div>
            <div className="p-4 space-y-3 max-h-[400px] overflow-auto">
              {subAgents.length > 0 ? (
                subAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card',
                          agent.heartbeatStatus === 'online'
                            ? 'bg-emerald-500'
                            : agent.heartbeatStatus === 'stale'
                            ? 'bg-yellow-500'
                            : 'bg-gray-400'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {agent.type} • {agent.heartbeatStatus}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No sub-agents yet</p>
                  <p className="text-xs">Add agents to channels to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Channel Groups Overview */}
          <div className="bg-card rounded-xl border border-border overflow-hidden lg:col-span-2">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-blue-500" />
                <h2 className="font-semibold">Groups & Channels</h2>
              </div>
            </div>
            <div className="p-4">
              {channelGroups.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {channelGroups.map((group) => (
                    <div
                      key={group.id}
                      className="p-4 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <FolderOpen
                          className="h-4 w-4"
                          style={{ color: group.color || undefined }}
                        />
                        <h3 className="font-medium">{group.name}</h3>
                      </div>
                      <div className="space-y-1">
                        {group.channels.slice(0, 3).map((channel) => (
                          <div
                            key={channel.id}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <Hash className="h-3 w-3" />
                            <span className="truncate">{channel.name}</span>
                          </div>
                        ))}
                        {group.channels.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{group.channels.length - 3} more
                          </p>
                        )}
                        {group.channels.length === 0 && (
                          <p className="text-xs text-muted-foreground">No channels</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No groups yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  subtext?: string;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg bg-muted', color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subtext && <p className="text-xs text-emerald-500">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}
