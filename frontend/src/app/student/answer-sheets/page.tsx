"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FileText, Loader2, RefreshCw, Trash2, Eye, CheckCircle, Clock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAnswerSheets, useDeleteAnswerSheet } from "@/hooks/useAnswerSheets";

interface AnswerSheet {
    id: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    processingStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    mimeType: string;
    notes?: string;
}

export default function StudentAnswerSheetsPage() {
    const { user } = useAuth();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Calculate dynamic polling: if any sheet is PROCESSING, poll every 3s
    const { data: answerSheets = [], isLoading, refetch } = useAnswerSheets(user?.id, {
        refetchInterval: (query) => {
            const data = query.state.data as AnswerSheet[];
            if (data?.some(sheet => sheet.processingStatus === 'PROCESSING')) {
                return 3000;
            }
            return false;
        }
    });

    const deleteMutation = useDeleteAnswerSheet();

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this answer sheet?")) return;

        setDeletingId(id);
        try {
            await deleteMutation.mutateAsync(id);
            toast.success("Answer sheet deleted");
        } catch (error) {
            toast.error("Failed to delete answer sheet");
        } finally {
            setDeletingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            PENDING: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
            PROCESSING: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
            COMPLETED: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
            FAILED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        };

        const icons = {
            PENDING: Clock,
            PROCESSING: Loader2,
            COMPLETED: CheckCircle,
            FAILED: AlertCircle,
        };

        const Icon = icons[status as keyof typeof icons] || AlertCircle;

        return (
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
                <Icon size={12} className={status === "PROCESSING" ? "animate-spin" : ""} />
                {status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
            <div className="max-w-6xl mx-auto">
                <Link href="/student" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
                    ← Back to Dashboard
                </Link>

                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">My Answer Sheets</h1>
                            <p className="text-slate-600 dark:text-slate-400">View and manage your uploaded exams.</p>
                        </div>
                        <Button onClick={() => refetch()} variant="secondary">
                            <RefreshCw size={18} className="mr-2" />
                            Refresh
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-4" />
                            <p className="text-slate-600 dark:text-slate-400">Loading your answer sheets...</p>
                        </div>
                    ) : answerSheets.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
                            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-6">
                                <FileText className="text-blue-600 dark:text-blue-400" size={32} />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No answer sheets yet</h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">Upload your first answer sheet to get started.</p>
                            <Link href="/student/upload">
                                <Button>Upload Answer Sheet</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {answerSheets.map((sheet: AnswerSheet) => (
                                <motion.div
                                    key={sheet.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between border border-slate-200 dark:border-slate-700 hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                            {sheet.mimeType === 'application/pdf' ? (
                                                <FileText className="text-red-600 dark:text-red-400" size={24} />
                                            ) : (
                                                <FileText className="text-blue-600 dark:text-blue-400" size={24} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-900 dark:text-white">{sheet.fileName}</h3>
                                            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                <span>{(sheet.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                                                <span>•</span>
                                                <span>{new Date(sheet.uploadedAt).toLocaleDateString()}</span>
                                            </div>
                                            {sheet.processingStatus === 'FAILED' && sheet.notes && (
                                                <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                                    {sheet.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {getStatusBadge(sheet.processingStatus)}

                                        <div className="flex items-center gap-2">
                                            <Link href={`/student/answer-sheets/${sheet.id}`} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" title="View Results">
                                                <Eye size={18} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(sheet.id)}
                                                disabled={deletingId === sheet.id}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                                                title="Delete"
                                            >
                                                {deletingId === sheet.id ? (
                                                    <Loader2 size={18} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={18} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
