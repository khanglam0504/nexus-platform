import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WorkspaceSelector } from '@/components/workspace/workspace-selector';

export default async function WorkspacePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const workspaces = await prisma.workspace.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    include: {
      _count: { select: { members: true, channels: true } },
    },
  });

  if (workspaces.length === 0) {
    return <WorkspaceSelector workspaces={[]} />;
  }

  // Redirect to first workspace
  redirect(`/workspace/${workspaces[0].slug}`);
}
