import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WorkspaceLayout } from '@/components/workspace/workspace-layout';

// Helper to calculate heartbeat status
function getHeartbeatStatus(
  lastHeartbeat: Date | null,
  intervalSeconds: number
): 'online' | 'stale' | 'offline' {
  if (!lastHeartbeat) return 'offline';
  const now = Date.now();
  const lastBeat = lastHeartbeat.getTime();
  const elapsed = (now - lastBeat) / 1000;

  if (elapsed <= intervalSeconds * 1.5) return 'online';
  if (elapsed <= intervalSeconds * 3) return 'stale';
  return 'offline';
}

interface Props {
  params: { slug: string };
  children: React.ReactNode;
}

export default async function WorkspaceSlugLayout({ params, children }: Props) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug: params.slug },
    include: {
      channels: { orderBy: { name: 'asc' } },
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
      agents: {
        where: { isActive: true },
        include: { context: true },
      },
    },
  });

  if (!workspace) {
    redirect('/workspace');
  }

  const isMember = workspace.members.some((m) => m.userId === session.user.id);
  if (!isMember) {
    redirect('/workspace');
  }

  // Transform agents to include heartbeat status
  const agentsWithStatus = workspace.agents.map((agent) => ({
    ...agent,
    heartbeatStatus: getHeartbeatStatus(agent.lastHeartbeat, agent.heartbeatInterval),
  }));

  const workspaceWithStatus = {
    ...workspace,
    agents: agentsWithStatus,
  };

  return (
    <WorkspaceLayout workspace={workspaceWithStatus} currentUser={session.user}>
      {children}
    </WorkspaceLayout>
  );
}
