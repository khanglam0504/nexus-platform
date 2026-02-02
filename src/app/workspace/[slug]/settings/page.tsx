import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TeamSettings } from '@/components/workspace/team-settings';
import { AgentSettings } from '@/components/agent';
import { ThemeSettings } from '@/components/settings/theme-settings';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: { slug: string };
}

export default async function SettingsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const workspace = await prisma.workspace.findUnique({
    where: { slug: params.slug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!workspace || workspace.members.length === 0) {
    redirect('/workspace');
  }

  const currentRole = workspace.members[0].role;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link
            href={`/workspace/${params.slug}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
          <h1 className="text-2xl font-bold">Workspace Settings</h1>
          <p className="text-muted-foreground">{workspace.name}</p>
        </div>

        <TeamSettings
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          currentRole={currentRole}
        />

        <div className="mt-10 pt-10 border-t">
          <AgentSettings
            workspaceId={workspace.id}
            currentRole={currentRole}
          />
        </div>

        <div className="mt-10 pt-10 border-t">
          <ThemeSettings />
        </div>
      </div>
    </div>
  );
}
