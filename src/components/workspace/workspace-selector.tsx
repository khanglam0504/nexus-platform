'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  _count: { members: number; channels: number };
}

interface Props {
  workspaces: WorkspaceItem[];
}

export function WorkspaceSelector({ workspaces }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(workspaces.length === 0);

  const createWorkspace = trpc.workspace.create.useMutation({
    onSuccess: (workspace) => {
      setDialogOpen(false);
      router.push(`/workspace/${workspace.slug}`);
    },
  });

  const handleCreate = () => {
    if (name.trim()) {
      createWorkspace.mutate({ name: name.trim() });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Nexus Platform</h1>
          <p className="mt-2 text-muted-foreground">Select or create a workspace</p>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => router.push(`/workspace/${workspace.slug}`)}
              className="w-full p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {workspace.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{workspace.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {workspace._count.members} members · {workspace._count.channels} channels
                  </p>
                </div>
              </div>
            </button>
          ))}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Workspace</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace name</Label>
                  <Input
                    id="workspace-name"
                    placeholder="My Company"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!name.trim() || createWorkspace.isPending}
                  className="w-full"
                >
                  {createWorkspace.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Create Workspace
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
