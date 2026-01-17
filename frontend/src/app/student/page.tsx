'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Upload, FileText, TrendingUp, Award } from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard() {
    const { user, isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/');
        }
    }, [loading, isAuthenticated, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header / Welcome Section */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    StudAICoach
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Welcome back, {user?.name}!
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Quick Actions */}
                <Link
                    href="/student/upload"
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group"
                >
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Upload Answer Sheet
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Upload your exam papers for AI analysis
                    </p>
                </Link>

                <Link
                    href="/student/answer-sheets"
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group"
                >
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        My Answer Sheets
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        View and manage your submissions
                    </p>
                </Link>

                <Link
                    href="/student/question-papers"
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group"
                >
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Question Papers
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Browse past exam papers
                    </p>
                </Link>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center mb-4">
                        <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Progress
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Track your academic progress
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Coming soon</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center mb-4">
                        <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Achievements
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        View your badges and rewards
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Coming soon</p>
                </div>
            </div>

            {/* Welcome Message */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
                <h2 className="text-3xl font-bold mb-4">
                    Ready to improve your grades? 🎓
                </h2>
                <p className="text-blue-100 mb-6">
                    Upload your answer sheets and get instant AI-powered feedback to help you learn and grow.
                </p>
                <Link
                    href="/student/upload"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
                >
                    <Upload className="w-5 h-5" />
                    Upload Your First Answer Sheet
                </Link>
            </div>
        </div>
    );
}

