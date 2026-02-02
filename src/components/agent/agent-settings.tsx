'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CreateAgentDialog } from './create-agent-dialog';
import { AgentListItem } from './agent-list-item';
import { Loader2, Bot, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Agent, AgentContext, AutonomyLevel } from '@prisma/client';

type AgentWithContext = Agent & { context: AgentContext | null };

interface AgentWithLifecycle extends AgentWithContext {
  heartbeatStatus: 'online' | 'stale' | 'offline';
}

interface AgentSettingsProps {
  workspaceId: string;
  currentRole: string;
}

export function AgentSettings({ workspaceId, currentRole }: AgentSettingsProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');

  const { data: agents, isLoading } = trpc.agent.list.useQuery({ workspaceId });

  const canManageAgents = currentRole === 'OWNER' || currentRole === 'ADMIN';

  const activeAgents = agents?.filter((a: AgentWithLifecycle) => a.isActive) || [];
  const allAgents = agents || [];

  const displayedAgents = activeTab === 'active' ? activeAgents : allAgents;

  // Group agents by status
  const onlineAgents = displayedAgents.filter((a: AgentWithLifecycle) => a.heartbeatStatus === 'online');
  const staleAgents = displayedAgents.filter((a: AgentWithLifecycle) => a.heartbeatStatus === 'stale');
  const offlineAgents = displayedAgents.filter((a: AgentWithLifecycle) => a.heartbeatStatus === 'offline');

  const handleEditAgent = (agent: AgentWithLifecycle) => {
    // TODO: Implement edit modal
    console.log('Edit agent:', agent);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Agents
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage AI agents connected to your workspace
          </p>
        </div>

        {canManageAgents && (
          <CreateAgentDialog
            workspaceId={workspaceId}
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Agent
              </Button>
            }
          />
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'all')}>
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeAgents.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({allAgents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayedAgents.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No agents yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add AI agents to help with tasks in your workspace
              </p>
              {canManageAgents && (
                <CreateAgentDialog
                  workspaceId={workspaceId}
                  trigger={
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add your first agent
                    </Button>
                  }
                />
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Online Agents */}
              {onlineAgents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Online ({onlineAgents.length})
                  </h3>
                  <div className="space-y-2">
                    {onlineAgents.map((agent: AgentWithLifecycle) => (
                      <AgentListItem
                        key={agent.id}
                        agent={agent}
                        workspaceId={workspaceId}
                        onEdit={canManageAgents ? handleEditAgent : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Stale Agents */}
              {staleAgents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" />
                    Stale ({staleAgents.length})
                  </h3>
                  <div className="space-y-2">
                    {staleAgents.map((agent: AgentWithLifecycle) => (
                      <AgentListItem
                        key={agent.id}
                        agent={agent}
                        workspaceId={workspaceId}
                        onEdit={canManageAgents ? handleEditAgent : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Offline Agents */}
              {offlineAgents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                    Offline ({offlineAgents.length})
                  </h3>
                  <div className="space-y-2">
                    {offlineAgents.map((agent: AgentWithLifecycle) => (
                      <AgentListItem
                        key={agent.id}
                        agent={agent}
                        workspaceId={workspaceId}
                        onEdit={canManageAgents ? handleEditAgent : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* OpenClaw Info */}
      <div className="border-t pt-6">
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <h4 className="font-medium text-sm mb-2">💡 Connecting OpenClaw Bots</h4>
          <p className="text-sm text-muted-foreground">
            To connect an OpenClaw bot, you'll need the Gateway URL and API Token from your 
            OpenClaw configuration. The bot will receive messages from channels it's added to 
            and can respond in real-time.
          </p>
        </div>
      </div>
    </div>
  );
}
