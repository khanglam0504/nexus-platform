'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Bot, Loader2, Settings } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { Channel, Agent, ChannelAgent } from '@prisma/client';

type ChannelWithAgents = Channel & {
  channelAgents: (ChannelAgent & { agent: Agent })[];
};

interface Props {
  channel: ChannelWithAgents;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChannelSettingsDialog({ channel, workspaceId, open, onOpenChange }: Props) {
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(
    channel.channelAgents.map((ca) => ca.agentId)
  );

  const utils = trpc.useUtils();

  // Fetch all agents in workspace
  const { data: agents = [] } = trpc.agent.list.useQuery({ workspaceId });

  const updateChannel = trpc.channel.update.useMutation({
    onSuccess: () => {
      utils.workspace.get.invalidate();
      utils.channel.list.invalidate({ workspaceId });
      onOpenChange(false);
    },
  });

  // Reset form when channel changes
  useEffect(() => {
    setName(channel.name);
    setDescription(channel.description || '');
    setSelectedAgentIds(channel.channelAgents.map((ca) => ca.agentId));
  }, [channel]);

  const handleSave = () => {
    updateChannel.mutate({
      id: channel.id,
      name: name !== channel.name ? name : undefined,
      description: description !== channel.description ? description : undefined,
      agentIds: selectedAgentIds,
    });
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Channel Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="channel-name">Tên channel</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="channel-name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="channel-desc">Mô tả</Label>
            <Textarea
              id="channel-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả channel..."
              rows={2}
            />
          </div>

          {/* Agents */}
          <div className="space-y-2">
            <Label>AI Agents trong channel</Label>
            <ScrollArea className="h-[200px] border rounded-md p-2">
              {agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Bot className="h-8 w-8 mb-2" />
                  <p className="text-sm">Chưa có agent nào</p>
                  <p className="text-xs">Tạo agent trong Settings</p>
                </div>
              ) : (
                <div className="space-y-2">
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
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={agent.avatar || undefined} />
                        <AvatarFallback>
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {agent.type} • {agent.autonomyLevel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              Chọn agents sẽ tham gia và respond trong channel này
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={updateChannel.isPending}>
            {updateChannel.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Lưu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
