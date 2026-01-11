"use client";

import { useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, File as FileIcon, Loader2, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const router = useRouter();

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

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("questionType", "SUBJECTIVE");
        // Mock subject ID for now - in real app, select from dropdown
        formData.append("subjectId", "550e8400-e29b-41d4-a716-446655440000");

        try {
            await api.post("/answer-sheets/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("File uploaded successfully!");
            router.push("/dashboard/answer-sheets");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Upload Answer Sheet</h1>
                    <p className="text-muted-foreground">Upload your exam paper for AI analysis.</p>
                </div>

                <div className="glass-card rounded-2xl p-8">
                    {!file ? (
                        <div
                            {...getRootProps()}
                            className={`
                border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                ${isDragActive
                                    ? 'border-purple-500 bg-purple-500/10'
                                    : 'border-white/20 hover:border-white/40 hover:bg-white/5'}
              `}
                        >
                            <input {...getInputProps()} />
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                    <Upload className="text-purple-400" size={32} />
                                </div>
                                <div>
                                    <p className="text-lg font-medium">Click to upload or drag and drop</p>
                                    <p className="text-muted-foreground text-sm mt-1">
                                        PDF, PNG, or JPG (max 10MB)
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/5 border border-white/10 rounded-xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                        <FileIcon className="text-purple-400" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-medium truncate max-w-[200px]">{file.name}</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFile(null)}
                                    disabled={isUploading}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-muted-foreground" />
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
        </DashboardLayout>
    );
}
