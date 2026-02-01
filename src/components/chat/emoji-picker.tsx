'use client';

import { Button } from '@/components/ui/button';

const COMMON_EMOJIS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉',
  '🚀', '👀', '🔥', '✅', '❌', '💯', '🤔', '👏',
];

interface Props {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-8 gap-1 p-2">
      {COMMON_EMOJIS.map((emoji) => (
        <Button
          key={emoji}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-lg hover:bg-secondary"
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </Button>
      ))}
    </div>
  );
}
