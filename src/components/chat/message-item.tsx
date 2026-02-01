'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageSquare, SmilePlus, Bot } from 'lucide-react';
import { formatDate, getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MessageUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface MessageAgent {
  id: string;
  name: string;
  avatar: string | null;
  type: string;
}

interface Props {
  message: {
    id: string;
    content: string;
    createdAt: Date;
    user: MessageUser | null;
    agent: MessageAgent | null;
    reactions: Array<{
      id: string;
      emoji: string;
      user: { id: string; name: string | null };
    }>;
  };
  currentUserId: string;
  onThreadClick: () => void;
  replyCount?: number;
  isThreadReply?: boolean;
}

export function MessageItem({
  message,
  currentUserId,
  onThreadClick,
  replyCount = 0,
  isThreadReply = false,
}: Props) {
  const sender = message.user || message.agent;
  const isAgent = !!message.agent;
  const isOwnMessage = message.user?.id === currentUserId;

  // Group reactions by emoji
  const groupedReactions = message.reactions.reduce(
    (acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = [];
      acc[r.emoji].push(r.user);
      return acc;
    },
    {} as Record<string, Array<{ id: string; name: string | null }>>
  );

  return (
    <div
      className={cn(
        'group flex gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors',
        isOwnMessage && 'bg-primary/5'
      )}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={message.user?.image || message.agent?.avatar || undefined} />
        <AvatarFallback className={isAgent ? 'bg-primary text-primary-foreground' : ''}>
          {isAgent ? <Bot className="h-4 w-4" /> : getInitials(sender?.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={cn('font-semibold text-sm', isAgent && 'text-primary')}>
            {sender?.name || 'Unknown'}
          </span>
          {isAgent && (
            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
              AI
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</span>
        </div>

        <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{message.content}</p>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {Object.entries(groupedReactions).map(([emoji, users]) => (
              <Tooltip key={emoji}>
                <TooltipTrigger asChild>
                  <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs hover:bg-secondary/80">
                    <span>{emoji}</span>
                    <span>{users.length}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {users.map((u) => u.name || 'Unknown').join(', ')}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Thread indicator */}
        {!isThreadReply && replyCount > 0 && (
          <button
            onClick={onThreadClick}
            className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
          >
            <MessageSquare className="h-3 w-3" />
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <SmilePlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add reaction</TooltipContent>
        </Tooltip>

        {!isThreadReply && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onThreadClick}>
                <MessageSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply in thread</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
