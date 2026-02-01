import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WorkspaceLayout } from '@/components/workspace/workspace-layout';

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
      agents: { where: { isActive: true } },
    },
  });

  if (!workspace) {
    redirect('/workspace');
  }

  const isMember = workspace.members.some((m) => m.userId === session.user.id);
  if (!isMember) {
    redirect('/workspace');
  }

  return (
    <WorkspaceLayout workspace={workspace} currentUser={session.user}>
      {children}
    </WorkspaceLayout>
  );
}
