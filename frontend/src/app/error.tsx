'use client';

import { useEffect } from 'react';

export default function Error({
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
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <h2 className="text-2xl font-bold">Something went wrong!</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-md text-center">
                {error.message || "An unexpected error occurred."}
            </p>
            <button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
            >
                Try again
            </button>
        </div>
    );
}
