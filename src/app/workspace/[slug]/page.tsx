import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WorkspaceDashboard } from '@/components/dashboard';

interface Props {
  params: { slug: string };
}

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

export default async function WorkspacePage({ params }: Props) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug: params.slug },
    include: {
      channels: { orderBy: { name: 'asc' } },
      channelGroups: {
        orderBy: { position: 'asc' },
        include: {
          channels: { orderBy: { position: 'asc' } },
        },
      },
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

  // Add heartbeat status to agents
  const agentsWithStatus = workspace.agents.map((agent) => ({
    ...agent,
    heartbeatStatus: getHeartbeatStatus(agent.lastHeartbeat, agent.heartbeatInterval),
  }));

  return (
    <WorkspaceDashboard
      workspace={{
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        masterAgentId: workspace.masterAgentId,
      }}
      agents={agentsWithStatus}
      channelGroups={workspace.channelGroups}
      members={workspace.members}
    />
  );
}
