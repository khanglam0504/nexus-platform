'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const createWorkspace = trpc.workspace.create.useMutation({
    onSuccess: (workspace) => {
      router.push(`/workspace/${workspace.slug}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim()) {
      createWorkspace.mutate({ name: name.trim() });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workspaces
          </Link>

          <h1 className="text-3xl font-bold mt-6">Create a Workspace</h1>
          <p className="mt-2 text-muted-foreground">
            A workspace is where your team collaborates with AI agents.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-lg p-6 border border-border space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              placeholder="My Company"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              This will be the name of your workspace. You can change it later.
            </p>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={!name.trim() || createWorkspace.isPending}
          >
            {createWorkspace.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Workspace
          </Button>
        </form>
      </div>
    </div>
  );
}
