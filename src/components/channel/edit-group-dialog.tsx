'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Loader2, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { ICONS, COLORS } from './create-group-dialog';
import type { ChannelGroup } from '@prisma/client';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FolderOpen } from 'lucide-react';

interface Props {
    group: ChannelGroup;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
}

export function EditGroupDialog({ group, open, onOpenChange, workspaceId }: Props) {
    const router = useRouter();
    const [name, setName] = useState(group.name);
    const [description, setDescription] = useState(group.description || '');
    const [selectedIcon, setSelectedIcon] = useState(group.icon || 'folder-open');
    const [selectedColor, setSelectedColor] = useState(group.color || COLORS[0]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const utils = trpc.useUtils();

    useEffect(() => {
        if (open) {
            setName(group.name);
            setDescription(group.description || '');
            setSelectedIcon(group.icon || 'folder-open');
            setSelectedColor(group.color || COLORS[0]);
        }
    }, [open, group]);

    const updateGroup = trpc.channelGroup.update.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            utils.channelGroup.list.invalidate({ workspaceId });
            router.refresh();
        },
    });

    const deleteGroup = trpc.channelGroup.delete.useMutation({
        onSuccess: () => {
            setDeleteDialogOpen(false);
            onOpenChange(false);
            utils.channelGroup.list.invalidate({ workspaceId });
            router.refresh();
        },
    });

    const handleUpdate = () => {
        if (name.trim()) {
            updateGroup.mutate({
                id: group.id,
                name: name.trim(),
                description: description || undefined,
                icon: selectedIcon,
                color: selectedColor,
            });
        }
    };

    const handleDelete = () => {
        deleteGroup.mutate({ id: group.id });
    };

    const SelectedIconComponent = ICONS.find((i) => i.name === selectedIcon)?.icon || FolderOpen;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa Group</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Group Name */}
                        <div className="space-y-2">
                            <Label htmlFor="edit-group-name">Tên Group</Label>
                            <Input
                                id="edit-group-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="vd: Development, Marketing..."
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="edit-group-desc">Mô tả (tùy chọn)</Label>
                            <Textarea
                                id="edit-group-desc"
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
                                <span className="font-medium">{name || 'Group Name'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setDeleteDialogOpen(true)}
                            disabled={updateGroup.isPending || deleteGroup.isPending}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Hủy
                            </Button>
                            <Button
                                onClick={handleUpdate}
                                disabled={!name.trim() || updateGroup.isPending}
                            >
                                {updateGroup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Lưu thay đổi
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bạn có chắc chắn muốn xóa group này?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Các kênh trong group sẽ được chuyển ra ngoài (ungrouped).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteGroup.isPending ? 'Đang xóa...' : 'Xóa Group'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
