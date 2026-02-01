'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageItem } from './message-item';
import { MessageInput } from './message-input';
import { X, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Props {
  messageId: string;
  channelId: string;
  currentUserId: string;
  onClose: () => void;
}

export function ThreadPanel({ messageId, channelId, currentUserId, onClose }: Props) {
  const { data, isLoading } = trpc.message.getThread.useQuery(
    { messageId },
    { refetchInterval: 3000 }
  );

  return (
    <div className="w-96 border-l border-border flex flex-col bg-card">
      {/* Header */}
      <header className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0">
        <h2 className="font-semibold">Thread</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Parent message */}
              {data?.parent && (
                <MessageItem
                  message={{
                    ...data.parent,
                    reactions: [],
                  }}
                  currentUserId={currentUserId}
                  onThreadClick={() => {}}
                  isThreadReply
                />
              )}

              {/* Replies */}
              {data?.replies && data.replies.length > 0 && (
                <>
                  <div className="text-xs text-muted-foreground py-2">
                    {data.replies.length} {data.replies.length === 1 ? 'reply' : 'replies'}
                  </div>
                  {data.replies.map((reply) => (
                    <MessageItem
                      key={reply.id}
                      message={{
                        ...reply,
                        reactions: [],
                      }}
                      currentUserId={currentUserId}
                      onThreadClick={() => {}}
                      isThreadReply
                    />
                  ))}
                </>
              )}
            </div>
          </ScrollArea>

          <MessageInput
            channelId={channelId}
            threadId={messageId}
            agents={[]}
            placeholder="Reply in thread..."
          />
        </>
      )}
    </div>
  );
}
