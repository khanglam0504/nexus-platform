import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChatArea } from '@/components/chat/chat-area';

interface Props {
  params: { slug: string; channelId: string };
}

export default async function ChannelPage({ params }: Props) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const channel = await prisma.channel.findUnique({
    where: { id: params.channelId },
    include: {
      workspace: {
        include: {
          members: { where: { userId: session.user.id } },
          agents: { where: { isActive: true } },
        },
      },
    },
  });

  if (!channel || channel.workspace.members.length === 0) {
    redirect(`/workspace/${params.slug}`);
  }

  return (
    <ChatArea
      channel={channel}
      agents={channel.workspace.agents}
      currentUserId={session.user.id}
    />
  );
}
