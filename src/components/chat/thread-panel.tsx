'use client';

import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageItem } from './message-item';
import { X, Loader2, Users, Bot } from 'lucide-react';
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

  // Count unique participants in thread
  const participantCount = useMemo(() => {
    if (!data) return 0;
    const users = new Set<string>();
    if (data.parent?.user?.id) users.add(data.parent.user.id);
    data.replies?.forEach((r) => {
      if (r.user?.id) users.add(r.user.id);
    });
    return users.size;
  }, [data]);

  return (
    <div className="w-full lg:w-96 border-l border-border flex flex-col bg-card">
      {/* Header */}
      <header className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">Thread</h2>
          {participantCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>
                {participantCount} {participantCount === 1 ? 'person' : 'people'}
              </span>
            </div>
          )}
        </div>
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
                    reactions: data.parent.reactions || [],
                  }}
                  channelId={channelId}
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
                        reactions: reply.reactions || [],
                      }}
                      channelId={channelId}
                      currentUserId={currentUserId}
                      onThreadClick={() => {}}
                      isThreadReply
                    />
                  ))}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Agent-only indicator */}
          <div className="px-4 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Bot className="h-3 w-3" />
              <span>Agent-only thread</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
