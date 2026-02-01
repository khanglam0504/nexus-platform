'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Send, Bot, AtSign, Paperclip, Smile } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { Agent } from '@prisma/client';

interface Props {
  channelId: string;
  threadId?: string;
  agents: Agent[];
  placeholder?: string;
}

export function MessageInput({ channelId, threadId, agents, placeholder }: Props) {
  const [content, setContent] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const utils = trpc.useUtils();

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: () => {
      setContent('');
      utils.message.list.invalidate({ channelId });
      if (threadId) {
        utils.message.getThread.invalidate({ messageId: threadId });
      }
    },
  });

  const chatWithAgent = trpc.agent.chat.useMutation({
    onSuccess: () => {
      setContent('');
      setSelectedAgent(null);
      utils.message.list.invalidate({ channelId });
      if (threadId) {
        utils.message.getThread.invalidate({ messageId: threadId });
      }
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) return;

    if (selectedAgent) {
      chatWithAgent.mutate({
        agentId: selectedAgent.id,
        channelId,
        message: content.trim(),
        threadId,
      });
    } else {
      sendMessage.mutate({
        content: content.trim(),
        channelId,
        threadId,
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isPending = sendMessage.isPending || chatWithAgent.isPending;

  return (
    <div className="p-4 border-t border-border">
      {selectedAgent && (
        <div className="mb-2 flex items-center gap-2 text-sm">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-primary font-medium">{selectedAgent.name}</span>
          <button
            onClick={() => setSelectedAgent(null)}
            className="text-muted-foreground hover:text-foreground ml-auto text-xs"
          >
            Cancel
          </button>
        </div>
      )}

      <div
        className={cn(
          'flex items-end gap-2 bg-secondary rounded-lg border border-border p-2',
          selectedAgent && 'border-primary'
        )}
      >
        <div className="flex gap-1">
          {agents.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <AtSign className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {agents.map((agent) => (
                  <DropdownMenuItem key={agent.id} onClick={() => setSelectedAgent(agent)}>
                    <Bot className="h-4 w-4 mr-2 text-primary" />
                    {agent.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Smile className="h-4 w-4" />
          </Button>
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || `Message #channel${selectedAgent ? ` (to ${selectedAgent.name})` : ''}`}
          className="flex-1 bg-transparent border-0 resize-none text-sm focus:outline-none min-h-[36px] max-h-[120px] py-2"
          rows={1}
          disabled={isPending}
        />

        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || isPending}
          size="icon"
          className="h-8 w-8 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
