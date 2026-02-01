'use client';

import { useState } from 'react';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { ThreadPanel } from './thread-panel';
import { Hash, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Channel, Agent } from '@prisma/client';

interface Props {
  channel: Channel;
  agents: Agent[];
  currentUserId: string;
}

export function ChatArea({ channel, agents, currentUserId }: Props) {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <header className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <h1 className="font-semibold">{channel.name}</h1>
          </div>
          <Button variant="ghost" size="icon">
            <Users className="h-5 w-5" />
          </Button>
        </header>

        {/* Messages */}
        <MessageList
          channelId={channel.id}
          currentUserId={currentUserId}
          onThreadClick={setSelectedThread}
        />

        {/* Input */}
        <MessageInput channelId={channel.id} agents={agents} />
      </div>

      {/* Thread Panel */}
      {selectedThread && (
        <ThreadPanel
          messageId={selectedThread}
          channelId={channel.id}
          currentUserId={currentUserId}
          onClose={() => setSelectedThread(null)}
        />
      )}
    </div>
  );
}
