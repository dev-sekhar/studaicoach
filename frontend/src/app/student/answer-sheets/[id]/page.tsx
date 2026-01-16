"use client";

import { useAnswerSheet } from "@/hooks/useAnswerSheets";
import { Loader2, ArrowLeft, FileText, CheckCircle, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";

export default function AnswerSheetResultPage() {
    const params = useParams();
    const id = params.id as string;
    const { data: sheet, isLoading, error } = useAnswerSheet(id);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">Loading result...</p>
                </div>
            </div>
        );
    }

    if (error || !sheet) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                    <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Failed to load result</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">Could not fetch the answer sheet details.</p>
                    <Link href="/student/answer-sheets" className="text-blue-600 hover:underline">
                        ← Back to Answer Sheets
                    </Link>
                </div>
            </div>
        );
    }

    const { analysis, processingStatus } = sheet;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
            case 'FAILED': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
            case 'PROCESSING': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
            default: return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
            <div className="max-w-5xl mx-auto">
                <Link href="/student/answer-sheets" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition-colors">
                    <ArrowLeft size={18} />
                    Back to Answer Sheets
                </Link>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{sheet.fileName}</h1>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sheet.processingStatus)}`}>
                            {sheet.processingStatus === 'COMPLETED' && <CheckCircle size={16} />}
                            {sheet.processingStatus === 'PROCESSING' && <Loader2 size={16} className="animate-spin" />}
                            {sheet.processingStatus === 'FAILED' && <AlertCircle size={16} />}
                            {sheet.processingStatus === 'PENDING' && <Clock size={16} />}
                            {sheet.processingStatus}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Metadata & Source */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText size={20} className="text-blue-500" />
                                File Details
                            </h3>
                            <dl className="space-y-4 text-sm">
                                <div>
                                    <dt className="text-slate-500 dark:text-slate-400">Uploaded</dt>
                                    <dd className="font-medium text-slate-900 dark:text-white">{new Date(sheet.uploadedAt).toLocaleString()}</dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500 dark:text-slate-400">Size</dt>
                                    <dd className="font-medium text-slate-900 dark:text-white">{(sheet.fileSize / 1024 / 1024).toFixed(2)} MB</dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500 dark:text-slate-400">Type</dt>
                                    <dd className="font-medium text-slate-900 dark:text-white">{sheet.mimeType}</dd>
                                </div>
                            </dl>
                        </div>

                        {sheet.notes && (
                            <div className={`rounded-xl p-6 border shadow-sm ${sheet.processingStatus === 'FAILED'
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }`}>
                                <h3 className={`text-lg font-semibold mb-4 ${sheet.processingStatus === 'FAILED' ? 'text-red-800 dark:text-red-300' : 'text-slate-900 dark:text-white'
                                    }`}>
                                    {sheet.processingStatus === 'FAILED' ? 'Processing Error / Notes' : 'Notes'}
                                </h3>
                                <p className={`text-sm whitespace-pre-wrap ${sheet.processingStatus === 'FAILED' ? 'text-red-700 dark:text-red-200' : 'text-slate-600 dark:text-slate-400'
                                    }`}>{sheet.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Analysis Results */}
                    <div className="lg:col-span-2 space-y-6">
                        {analysis ? (
                            <>
                                {/* Extracted Text */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
                                >
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                                        Extracted Text (OCR)
                                    </h3>
                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-sm font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
                                        {typeof analysis.extractedText === 'string'
                                            ? analysis.extractedText
                                            : JSON.stringify(analysis.extractedText, null, 2)}
                                    </div>
                                    <p className="mt-2 text-xs text-slate-400 italic">
                                        PII (names, emails, phones) has been automatically obfuscated.
                                    </p>
                                </motion.div>

                                {/* Identified Topics */}
                                {analysis.identifiedTopics && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
                                    >
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                                            Identified Topics
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {(typeof analysis.identifiedTopics === 'string'
                                                ? JSON.parse(analysis.identifiedTopics)
                                                : analysis.identifiedTopics
                                            ).map((topic: string, i: number) => (
                                                <span key={i} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full text-sm font-medium">
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* Evaluation & Recommendations (Mock/Placeholder if empty) */}
                                {(analysis.evaluation || analysis.recommendations) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
                                    >
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                                            AI Analysis
                                        </h3>

                                        {analysis.evaluation && (
                                            <div className="mb-6">
                                                <h4 className="font-medium text-slate-900 dark:text-white mb-2">Evaluation</h4>
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    {typeof analysis.evaluation === 'string'
                                                        ? analysis.evaluation
                                                        : (Object.keys(analysis.evaluation || {}).length > 0 ? JSON.stringify(analysis.evaluation, null, 2) : "Pending evaluation...")}
                                                </div>
                                            </div>
                                        )}

                                        {analysis.recommendations && (
                                            <div>
                                                <h4 className="font-medium text-slate-900 dark:text-white mb-2">Recommendations</h4>
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    {typeof analysis.recommendations === 'string'
                                                        ? analysis.recommendations
                                                        : (Object.keys(analysis.recommendations || {}).length > 0 ? JSON.stringify(analysis.recommendations, null, 2) : "No recommendations available.")}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                                    <Loader2 className="text-slate-400" size={32} />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Analysis Pending</h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    The answer sheet is being analysed. Detailed results will appear here once processing is complete.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
