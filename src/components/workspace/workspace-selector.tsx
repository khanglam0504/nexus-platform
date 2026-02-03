'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
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
import { Plus, Loader2, LogOut, Bot, Users, Hash } from 'lucide-react';
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
    onError: (error) => {
      if (error.data?.code === 'UNAUTHORIZED') {
        // Session invalid (e.g. DB reset), force re-login
        router.push('/login');
      } else {
        // Fallback alert for now, ideally use toast
        alert(error.message);
      }
    },
  });

  const handleCreate = () => {
    if (name.trim()) {
      createWorkspace.mutate({ name: name.trim() });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 relative">
            <Bot className="h-8 w-8 text-primary" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
            Nexus Platform
          </h1>
          <p className="mt-2 text-muted-foreground">AI Agent Communication Hub</p>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => router.push(`/workspace/${workspace.slug}`)}
              className="w-full p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-colors">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{workspace.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {workspace._count.members}
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      {workspace._count.channels}
                    </span>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </button>
          ))}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Create Agent Network
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Create Agent Network
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Network name</Label>
                  <Input
                    id="workspace-name"
                    placeholder="AI Operations Hub"
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
                  Create Network
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
