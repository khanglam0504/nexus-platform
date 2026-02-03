'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Crown, Bot, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface Props {
  workspaceId: string;
  currentRole: string;
}

export function MasterAgentSettings({ workspaceId, currentRole }: Props) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const utils = trpc.useUtils();

  const { data: masterAgent, isLoading: loadingMaster } = trpc.workspace.getMasterAgent.useQuery({
    workspaceId,
  });

  const { data: agents, isLoading: loadingAgents } = trpc.agent.list.useQuery({
    workspaceId,
  });

  const setMasterAgent = trpc.workspace.setMasterAgent.useMutation({
    onSuccess: () => {
      utils.workspace.getMasterAgent.invalidate({ workspaceId });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const isOwner = currentRole === 'OWNER';
  const isLoading = loadingMaster || loadingAgents;

  const handleSave = () => {
    if (!isOwner) return;
    setMasterAgent.mutate({
      workspaceId,
      agentId: selectedAgentId,
    });
  };

  const currentMasterAgentId = masterAgent?.id || null;
  const effectiveSelectedId = selectedAgentId ?? currentMasterAgentId;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Master Agent</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          The Master Agent manages this workspace, receives commands, and delegates tasks to sub-agents.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current Master Agent Display */}
          {masterAgent && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{masterAgent.name}</p>
                    <span className="text-xs bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded">
                      CURRENT
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {masterAgent.description || masterAgent.type}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Agent Selection */}
          {isOwner && (
            <div className="space-y-3">
              <label className="text-sm font-medium">
                {masterAgent ? 'Change Master Agent' : 'Select Master Agent'}
              </label>
              <Select
                value={effectiveSelectedId || 'none'}
                onValueChange={(value) => setSelectedAgentId(value === 'none' ? null : value)}
                disabled={setMasterAgent.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No Master Agent</span>
                  </SelectItem>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <span>{agent.name}</span>
                        <span className="text-xs text-muted-foreground">({agent.type})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {agents?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No agents available. Create an agent first.
                </p>
              )}

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSave}
                  disabled={
                    setMasterAgent.isPending ||
                    effectiveSelectedId === currentMasterAgentId
                  }
                >
                  {setMasterAgent.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>

                {saveSuccess && (
                  <div className="flex items-center gap-1 text-sm text-emerald-500">
                    <CheckCircle className="h-4 w-4" />
                    Saved!
                  </div>
                )}

                {setMasterAgent.isError && (
                  <div className="flex items-center gap-1 text-sm text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    {setMasterAgent.error.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isOwner && (
            <p className="text-sm text-muted-foreground italic">
              Only the workspace owner can change the Master Agent.
            </p>
          )}

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <h4 className="font-medium mb-2">About Master Agents</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Receives commands from the Command Center on the dashboard</li>
              <li>• Can delegate tasks to sub-agents in channels</li>
              <li>• Uses @mentions to route work to specific agents</li>
              <li>• Must have OpenClaw connection configured to function</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
