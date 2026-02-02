'use client';

import { Avatar as UIAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot } from 'lucide-react';

interface AvatarDisplayProps {
    name: string;
    avatarUrl?: string | null;
    className?: string;
}

export function AvatarDisplay({ name, avatarUrl, className }: AvatarDisplayProps) {
    return (
        <UIAvatar className={className}>
            <AvatarImage src={avatarUrl || undefined} alt={name} />
            <AvatarFallback>
                <Bot className="h-1/2 w-1/2" />
            </AvatarFallback>
        </UIAvatar>
    );
}
