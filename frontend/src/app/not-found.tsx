import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <h2 className="text-2xl font-bold">Page Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400">Could not find requested resource</p>
            <Link
                href="/dashboard"
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
            >
                Return to Dashboard
            </Link>
        </div>
    );
}
