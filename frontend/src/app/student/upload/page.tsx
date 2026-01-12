"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Upload, X, File as FileIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [grade, setGrade] = useState('10');
    const [board, setBoard] = useState('CBSE');
    const [subjectId, setSubjectId] = useState('');
    const [subjects, setSubjects] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const router = useRouter();

    // Fetch subjects when grade or board changes
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const res = await api.get(`/subjects?board=${board}&grade=${grade}`);
                setSubjects(res.data);
                if (res.data.length > 0) {
                    setSubjectId(res.data[0].id);
                } else {
                    setSubjectId('');
                }
            } catch (error) {
                console.error('Failed to fetch subjects:', error);
                toast.error('Failed to load subjects');
            }
        };
        if (grade && board) {
            fetchSubjects();
        }
    }, [grade, board]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.png', '.jpg', '.jpeg']
        },
        maxFiles: 1,
        multiple: false
    });

    const handleUpload = async () => {
        if (!file) return;
        if (!subjectId) {
            toast.error('Please select a subject');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("questionType", "SUBJECTIVE");
        formData.append("subjectId", subjectId);

        try {
            await api.post("/answer-sheets/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("File uploaded successfully!");
            router.push("/student/answer-sheets");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
            <div className="max-w-2xl mx-auto">
                <Link href="/student" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
                    ← Back to Dashboard
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Upload Answer Sheet</h1>
                    <p className="text-slate-600 dark:text-slate-400">Upload your exam paper for AI analysis.</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 space-y-6">
                    {/* Grade and Board Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Grade *
                            </label>
                            <select
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            >
                                {[6, 7, 8, 9, 10, 11, 12].map(g => (
                                    <option key={g} value={g}>Grade {g}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Board *
                            </label>
                            <select
                                value={board}
                                onChange={(e) => setBoard(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            >
                                <option value="CBSE">CBSE</option>
                                <option value="ICSE">ICSE</option>
                                <option value="IGCSE">IGCSE</option>
                                <option value="STATE_BOARD">State Board</option>
                                <option value="IB">IB</option>
                            </select>
                        </div>
                    </div>

                    {/* Subject Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Subject *
                        </label>
                        <select
                            value={subjectId}
                            onChange={(e) => setSubjectId(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            required
                            disabled={subjects.length === 0}
                        >
                            {subjects.length === 0 ? (
                                <option value="">No subjects available for {board} Grade {grade}</option>
                            ) : (
                                <>
                                    <option value="">Select a subject</option>
                                    {subjects.map((subject) => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.name}
                                        </option>
                                    ))}
                                </>
                            )}
                        </select>
                        {subjects.length === 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                No subjects found. Please contact your administrator to add subjects for this grade and board.
                            </p>
                        )}
                    </div>

                    {/* File Upload */}
                    {!file ? (
                        <div
                            {...getRootProps()}
                            className={`
                border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                ${isDragActive
                                    ? 'border-purple-500 bg-purple-500/10'
                                    : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}
              `}
                        >
                            <input {...getInputProps()} />
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                    <Upload className="text-blue-600 dark:text-blue-400" size={32} />
                                </div>
                                <div>
                                    <p className="text-lg font-medium text-slate-900 dark:text-white">Click to upload or drag and drop</p>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                                        PDF, PNG, or JPG (max 10MB)
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                        <FileIcon className="text-blue-600 dark:text-blue-400" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">{file.name}</h3>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFile(null)}
                                    disabled={isUploading}
                                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-slate-600 dark:text-slate-400" />
                                </button>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    onClick={() => setFile(null)}
                                    variant="secondary"
                                    className="flex-1"
                                    disabled={isUploading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleUpload}
                                    className="flex-1"
                                    isLoading={isUploading}
                                >
                                    Upload & Analyze
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
