'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Bot, Loader2, Settings, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Channel, Agent, ChannelAgent } from '@prisma/client';

type ChannelWithAgents = Channel & {
  channelAgents: (ChannelAgent & { agent: Agent })[];
};

interface Props {
  channel: ChannelWithAgents;
  workspaceId: string;
  workspaceSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChannelSettingsDialog({ channel, workspaceId, workspaceSlug, open, onOpenChange }: Props) {
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(
    channel.channelAgents.map((ca) => ca.agentId)
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const utils = trpc.useUtils();
  const router = useRouter();

  // Fetch all agents in workspace
  const { data: agents = [] } = trpc.agent.list.useQuery({ workspaceId });

  const updateChannel = trpc.channel.update.useMutation({
    onSuccess: () => {
      utils.workspace.get.invalidate();
      utils.channel.list.invalidate({ workspaceId });
      toast.success('Channel updated successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update channel');
    },
  });

  const deleteChannel = trpc.channel.delete.useMutation({
    onSuccess: () => {
      utils.workspace.get.invalidate();
      utils.channel.list.invalidate({ workspaceId });
      toast.success(`Channel "${channel.name}" deleted successfully`);
      setShowDeleteDialog(false);
      onOpenChange(false);
      // Redirect to workspace home
      router.push(`/workspace/${workspaceSlug}`);
    },
    onError: (error) => {
      if (error.message.includes('FORBIDDEN')) {
        toast.error('Only workspace owners and admins can delete channels');
      } else {
        toast.error(error.message || 'Failed to delete channel');
      }
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

  const handleDelete = () => {
    deleteChannel.mutate({ id: channel.id });
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

        <div className="flex justify-between gap-2">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleteChannel.isPending || updateChannel.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Xóa
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={updateChannel.isPending || deleteChannel.isPending}>
              {updateChannel.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Lưu
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa channel?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa channel &quot;{channel.name}&quot;? Hành động này không thể hoàn tác
              và sẽ xóa tất cả tin nhắn trong channel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteChannel.isPending}
            >
              {deleteChannel.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Xóa channel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
