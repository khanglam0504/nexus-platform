'use client';

import { Avatar as UIAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Identicon } from '@/components/ui/identicon';

interface AvatarDisplayProps {
    name: string;
    avatarUrl?: string | null;
    className?: string;
}

export function AvatarDisplay({ name, avatarUrl, className }: AvatarDisplayProps) {
    return (
        <UIAvatar className={className}>
            <AvatarImage src={avatarUrl || undefined} alt={name} />
            <AvatarFallback className="p-0">
                <Identicon name={name} size={40} />
            </AvatarFallback>
        </UIAvatar>
    );
}
