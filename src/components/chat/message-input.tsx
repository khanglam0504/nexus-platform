'use client';

import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Send, Bot, AtSign, Paperclip, Smile, Loader2, X, Sparkles } from 'lucide-react';
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
  const [isFocused, setIsFocused] = useState(false);
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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

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
    <div className="px-4 pb-4">
      {/* Selected Agent Indicator */}
      {selectedAgent && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-t-lg bg-primary/5 border border-b-0 border-primary/20 animate-slide-up">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <span className="text-sm">
              Chatting with{' '}
              <span className="font-semibold text-primary">{selectedAgent.name}</span>
            </span>
            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
              AI
            </span>
          </div>
          <button
            onClick={() => setSelectedAgent(null)}
            className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input Container */}
      <div
        className={cn(
          'flex items-end gap-2 bg-secondary/50 border border-border p-2 transition-all duration-200',
          selectedAgent ? 'rounded-b-lg rounded-t-none border-primary/20' : 'rounded-xl',
          isFocused && 'ring-1 ring-primary border-primary/50',
          isPending && 'opacity-70'
        )}
      >
        {/* Left Actions */}
        <div className="flex gap-0.5 pb-1">
          {agents.length > 0 && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-8 w-8 shrink-0 rounded-lg',
                        selectedAgent && 'text-primary bg-primary/10'
                      )}
                    >
                      <AtSign className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">Mention AI agent</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Agents
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {agents.map((agent) => (
                  <DropdownMenuItem
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className="gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {agent.type || 'AI Assistant'}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg">
                <Paperclip className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Attach file</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg">
                <Smile className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Add emoji</TooltipContent>
          </Tooltip>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={
            placeholder ||
            (selectedAgent
              ? `Ask ${selectedAgent.name} something...`
              : 'Type a message...')
          }
          className="flex-1 bg-transparent border-0 resize-none text-sm focus:outline-none min-h-[36px] max-h-[120px] py-2 placeholder:text-muted-foreground/60"
          rows={1}
          disabled={isPending}
        />

        {/* Send Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || isPending}
              size="icon"
              className={cn(
                'h-8 w-8 shrink-0 rounded-lg transition-all',
                content.trim() && !isPending
                  ? 'bg-primary hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            Send message <kbd className="ml-1 text-xs opacity-60">Enter</kbd>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Typing hint */}
      <p className="text-xs text-muted-foreground/60 mt-2 px-2">
        Press <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground text-[10px] font-mono">Enter</kbd> to send,{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground text-[10px] font-mono">Shift + Enter</kbd> for new line
      </p>
    </div>
  );
}
