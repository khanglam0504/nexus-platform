'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Loader2, Plus } from 'lucide-react';
import {
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
  FolderOpen,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const ICONS = [
  { name: 'folder-open', icon: FolderOpen },
  { name: 'briefcase', icon: Briefcase },
  { name: 'message-circle', icon: MessageCircle },
  { name: 'code', icon: Code },
  { name: 'chart', icon: LineChart },
  { name: 'users', icon: Users },
  { name: 'star', icon: Star },
  { name: 'heart', icon: Heart },
  { name: 'flag', icon: Flag },
  { name: 'bookmark', icon: Bookmark },
  { name: 'tag', icon: Tag },
  { name: 'zap', icon: Zap },
];

const COLORS = [
  '#3B82F6', // blue
  '#22C55E', // green
  '#F59E0B', // yellow
  '#EC4899', // pink
  '#EF4444', // red
  '#F97316', // orange
  '#06B6D4', // cyan
  '#8B5CF6', // purple
  '#6366F1', // indigo
];

interface Props {
  workspaceId: string;
  trigger?: React.ReactNode;
}

export function CreateGroupDialog({ workspaceId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder-open');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const utils = trpc.useUtils();

  const createGroup = trpc.channelGroup.create.useMutation({
    onSuccess: () => {
      setName('');
      setDescription('');
      setSelectedIcon('folder-open');
      setSelectedColor(COLORS[0]);
      setOpen(false);
      utils.channelGroup.list.invalidate({ workspaceId });
      router.refresh();
    },
  });

  const handleCreate = () => {
    if (name.trim()) {
      createGroup.mutate({
        name: name.trim(),
        workspaceId,
        description: description || undefined,
        icon: selectedIcon,
        color: selectedColor,
      });
    }
  };

  const SelectedIconComponent = ICONS.find((i) => i.name === selectedIcon)?.icon || FolderOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo Group mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Tên Group</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="vd: Development, Marketing..."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="group-desc">Mô tả (tùy chọn)</Label>
            <Textarea
              id="group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Group này dùng để làm gì?"
              rows={2}
            />
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-2">
              {ICONS.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedIcon(name)}
                  className={cn(
                    'p-2 rounded-md border transition-colors',
                    selectedIcon === name
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5 mx-auto" />
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Màu sắc</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-transform',
                    selectedColor === color
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
              <SelectedIconComponent
                className="h-5 w-5"
                style={{ color: selectedColor }}
              />
              <span className="font-medium">{name || 'New Group'}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || createGroup.isPending}
          >
            {createGroup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Tạo Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ICONS, COLORS };
