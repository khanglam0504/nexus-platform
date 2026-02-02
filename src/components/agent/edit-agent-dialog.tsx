'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Loader2, Save, Bot } from 'lucide-react';
import { Identicon } from '@/components/ui/identicon';
import { toast } from 'sonner';
import type { Agent } from '@prisma/client';

interface EditAgentDialogProps {
  agent: Agent | null;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AGENT_TYPES = [
  { value: 'ASSISTANT', label: 'Assistant', desc: 'General purpose AI assistant' },
  { value: 'CODER', label: 'Coder', desc: 'Specialized in coding tasks' },
  { value: 'ANALYST', label: 'Analyst', desc: 'Data analysis and insights' },
  { value: 'RESEARCHER', label: 'Researcher', desc: 'Research and information gathering' },
] as const;

const AUTONOMY_LEVELS = [
  { value: 'INTERN', label: 'Intern', desc: 'Needs approval for everything' },
  { value: 'SPECIALIST', label: 'Specialist', desc: 'Can execute within defined scope' },
  { value: 'LEAD', label: 'Lead', desc: 'Can approve other agents\' work' },
  { value: 'AUTONOMOUS', label: 'Autonomous', desc: 'Full autonomy' },
] as const;

export function EditAgentDialog({ agent, workspaceId, open, onOpenChange, onSuccess }: EditAgentDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('ASSISTANT');
  const [autonomyLevel, setAutonomyLevel] = useState<string>('SPECIALIST');

  // OpenClaw connection fields
  const [openclawGatewayUrl, setOpenclawGatewayUrl] = useState('');
  const [openclawToken, setOpenclawToken] = useState('');

  const utils = trpc.useUtils();

  // Pre-fill form when agent changes
  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description || '');
      setType(agent.type);
      setAutonomyLevel(agent.autonomyLevel);

      // Parse config to extract OpenClaw settings
      const config = agent.config ? JSON.parse(agent.config) as Record<string, unknown> : {};
      const openclawConfig = config.openclaw as Record<string, unknown> | undefined;

      setOpenclawGatewayUrl((openclawConfig?.gatewayUrl as string) || '');
      setOpenclawToken((openclawConfig?.token as string) || '');
    }
  }, [agent]);

  const updateAgent = trpc.agent.update.useMutation({
    onSuccess: () => {
      utils.agent.list.invalidate({ workspaceId });
      toast.success(`Agent "${name}" updated successfully!`);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to update agent');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!agent) return;

    if (!name.trim()) {
      toast.error('Agent name is required');
      return;
    }

    const config: Record<string, unknown> = {};

    // Add OpenClaw config if provided
    if (openclawGatewayUrl || openclawToken) {
      config.openclaw = {
        gatewayUrl: openclawGatewayUrl || undefined,
        token: openclawToken || undefined,
      };
    }

    updateAgent.mutate({
      agentId: agent.id,
      name: name.trim(),
      description: description.trim() || undefined,
      type: type as 'ASSISTANT' | 'CODER' | 'ANALYST' | 'RESEARCHER',
      autonomyLevel: autonomyLevel as 'INTERN' | 'SPECIALIST' | 'LEAD' | 'AUTONOMOUS',
      config: Object.keys(config).length > 0 ? config : undefined,
    });
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Edit AI Agent
          </DialogTitle>
          <DialogDescription>
            Update agent configuration and OpenClaw connection settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {name.trim() ? (
                    <Identicon name={name.trim()} size={48} />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Input
                  id="name"
                  placeholder="e.g., Robert, Jason, CodeBot..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Avatar will be auto-generated from name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this agent do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div>
                          <div className="font-medium">{t.label}</div>
                          <div className="text-xs text-muted-foreground">{t.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Autonomy Level</Label>
                <Select value={autonomyLevel} onValueChange={setAutonomyLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTONOMY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div>
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs text-muted-foreground">{level.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>

          {/* OpenClaw Connection */}
          <div className="border-t pt-4 space-y-4">
            <div>
              <h4 className="font-medium text-sm">OpenClaw Connection (Optional)</h4>
              <p className="text-xs text-muted-foreground">
                Connect an existing OpenClaw bot to this agent
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gatewayUrl">Gateway URL</Label>
              <Input
                id="gatewayUrl"
                placeholder="http://localhost:18789 or wss://..."
                value={openclawGatewayUrl}
                onChange={(e) => setOpenclawGatewayUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">API Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="Gateway authentication token"
                value={openclawToken}
                onChange={(e) => setOpenclawToken(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateAgent.isPending}>
              {updateAgent.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
