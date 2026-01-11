"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { FileText, Loader2, RefreshCw, Trash2, Eye, CheckCircle, Clock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

interface AnswerSheet {
    id: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    processingStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    mimeType: string;
}

export default function AnswerSheetsPage() {
    const [answerSheets, setAnswerSheets] = useState<AnswerSheet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchAnswerSheets = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/answer-sheets");
            setAnswerSheets(response.data);
        } catch (error) {
            toast.error("Failed to fetch answer sheets");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnswerSheets();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this answer sheet?")) return;

        setDeletingId(id);
        try {
            await api.delete(`/answer-sheets/${id}`);
            setAnswerSheets(prev => prev.filter(sheet => sheet.id !== id));
            toast.success("Answer sheet deleted");
        } catch (error) {
            toast.error("Failed to delete answer sheet");
        } finally {
            setDeletingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
            PROCESSING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
            COMPLETED: "bg-green-500/10 text-green-500 border-green-500/20",
            FAILED: "bg-red-500/10 text-red-500 border-red-500/20",
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
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">My Answer Sheets</h1>
                        <p className="text-muted-foreground">Manage and view your uploaded exams.</p>
                    </div>
                    <Button onClick={fetchAnswerSheets} variant="secondary">
                        <RefreshCw size={18} className="mr-2" />
                        Refresh
                    </Button>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500 mb-4" />
                        <p className="text-muted-foreground">Loading your answer sheets...</p>
                    </div>
                ) : answerSheets.length === 0 ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                            <FileText className="text-muted-foreground" size={32} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No answer sheets yet</h3>
                        <p className="text-muted-foreground mb-6">Upload your first answer sheet to get started.</p>
                        <Button onClick={() => window.location.href = '/dashboard/upload'}>
                            Upload Answer Sheet
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {answerSheets.map((sheet) => (
                            <motion.div
                                key={sheet.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card rounded-xl p-4 flex items-center justify-between group hover:border-purple-500/30 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                                        {sheet.mimeType === 'application/pdf' ? (
                                            <FileText className="text-red-400" size={24} />
                                        ) : (
                                            <FileText className="text-blue-400" size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-medium">{sheet.fileName}</h3>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                            <span>{(sheet.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                                            <span>•</span>
                                            <span>{new Date(sheet.uploadedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {getStatusBadge(sheet.processingStatus)}

                                    <div className="flex items-center gap-2">
                                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-white" title="View Results">
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(sheet.id)}
                                            disabled={deletingId === sheet.id}
                                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-muted-foreground hover:text-red-400"
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
        </DashboardLayout>
    );
}
