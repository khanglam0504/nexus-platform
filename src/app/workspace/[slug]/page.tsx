import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Props {
  params: { slug: string };
}

export default async function WorkspaceChannelPage({ params }: Props) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug: params.slug },
    include: {
      channels: { orderBy: { name: 'asc' } },
      members: { where: { userId: session.user.id } },
    },
  });

  if (!workspace || workspace.members.length === 0) {
    redirect('/workspace');
  }

  // Redirect to first channel (general)
  if (workspace.channels.length > 0) {
    redirect(`/workspace/${params.slug}/${workspace.channels[0].id}`);
  }

  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      No channels yet. Create one to get started.
    </div>
  );
}
