'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AuthError({
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
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-4 text-center p-4">
            <h2 className="text-xl font-bold">Authentication Check Failed</h2>
            <p className="text-muted-foreground text-sm max-w-md">
                {error.message || 'We ran into an issue verifying your session.'}
            </p>
            <Button onClick={() => reset()} variant="secondary">
                Try again
            </Button>
        </div>
    );
}
