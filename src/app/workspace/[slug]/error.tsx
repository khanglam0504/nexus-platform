'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function WorkspaceError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-xl font-bold">Workspace Error</h2>
            <p className="text-muted-foreground max-w-md">
                {error.message || 'We couldn\'t load this workspace.'}
            </p>
            <div className="flex gap-2">
                <Link href="/">
                    <Button variant="outline">Back to Home</Button>
                </Link>
                <Button onClick={() => reset()}>Try again</Button>
            </div>
        </div>
    );
}
