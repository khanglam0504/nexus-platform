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
import { FilePreview } from './file-preview';
import type { Agent } from '@prisma/client';

interface FileItem {
  file: File;
  preview?: string;
}

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
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: () => {
      setContent('');
      setFiles([]);
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
      setFiles([]);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: FileItem[] = selectedFiles.map((file) => ({
      file,
      preview: file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined,
    }));
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5)); // Max 5 files
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadFiles = async (): Promise<
    Array<{ url: string; name: string; type: string; size: number }>
  > => {
    const uploaded: Array<{ url: string; name: string; type: string; size: number }> = [];
    for (const { file } of files) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        uploaded.push({
          url: data.url,
          name: data.name,
          type: data.type,
          size: data.size,
        });
      }
    }
    return uploaded;
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;

    setIsUploading(true);
    try {
      let attachments: Array<{ url: string; name: string; type: string; size: number }> = [];
      if (files.length > 0) {
        attachments = await uploadFiles();
      }

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
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isPending = sendMessage.isPending || chatWithAgent.isPending || isUploading;

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

      {/* File Preview */}
      <FilePreview files={files} onRemove={removeFile} />

      {/* Input Container */}
      <div
        className={cn(
          'flex items-end gap-2 bg-secondary/50 border border-border p-2 transition-all duration-200',
          selectedAgent ? 'rounded-b-lg rounded-t-none border-primary/20' : 'rounded-xl',
          files.length > 0 && !selectedAgent && 'rounded-t-none border-t-0',
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

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 shrink-0 rounded-lg',
                  files.length > 0 && 'text-primary bg-primary/10'
                )}
                onClick={() => fileInputRef.current?.click()}
              >
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
              disabled={(!content.trim() && files.length === 0) || isPending}
              size="icon"
              className={cn(
                'h-8 w-8 shrink-0 rounded-lg transition-all',
                (content.trim() || files.length > 0) && !isPending
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
