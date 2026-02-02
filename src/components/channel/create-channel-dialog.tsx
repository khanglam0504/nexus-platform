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
import { Bot, Loader2, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface Props {
  workspaceId: string;
  workspaceSlug: string;
  trigger?: React.ReactNode;
}

export function CreateChannelDialog({ workspaceId, workspaceSlug, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
      setSelectedAgentIds([]);
      setOpen(false);
      utils.workspace.get.invalidate({ slug: workspaceSlug });
      utils.channel.list.invalidate({ workspaceId });
    },
  });

  const handleCreate = () => {
    if (name.trim()) {
      createChannel.mutate({
        name: name.toLowerCase().replace(/\s+/g, '-'),
        workspaceId,
        description: description || undefined,
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
          <DialogTitle>Tạo Channel mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="new-channel-name">Tên channel</Label>
            <Input
              id="new-channel-name"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="vd: marketing, dev-team"
            />
            <p className="text-xs text-muted-foreground">
              Chỉ dùng chữ thường, số và dấu gạch ngang
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="new-channel-desc">Mô tả (tùy chọn)</Label>
            <Textarea
              id="new-channel-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Channel này dùng để làm gì?"
              rows={2}
            />
          </div>

          {/* Agents */}
          <div className="space-y-2">
            <Label>Thêm AI Agents (tùy chọn)</Label>
            {agents.length === 0 ? (
              <div className="flex items-center gap-2 p-3 border rounded-md text-muted-foreground">
                <Bot className="h-5 w-5" />
                <span className="text-sm">Chưa có agent nào trong workspace</span>
              </div>
            ) : (
              <ScrollArea className="h-[150px] border rounded-md p-2">
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
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={agent.avatar || undefined} />
                        <AvatarFallback>
                          <Bot className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || createChannel.isPending}
          >
            {createChannel.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Tạo Channel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
