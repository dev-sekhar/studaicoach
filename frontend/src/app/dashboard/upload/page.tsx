"use client";

import { useState, useCallback, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, File as FileIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type ProcessingStep = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

const STEPS = [
    { id: 'uploading', label: 'Uploading File', icon: Upload },
    { id: 'processing', label: 'Processing OCR', icon: Loader2 },
    { id: 'analyzing', label: 'AI Analysis', icon: Loader2 },
    { id: 'completed', label: 'Complete', icon: CheckCircle },
];

export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [currentStep, setCurrentStep] = useState<ProcessingStep>('idle');
    const [uploadedSheetId, setUploadedSheetId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            setFile(acceptedFiles[0]);
            setError(null);
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

    // Poll for processing status
    useEffect(() => {
        if (!uploadedSheetId || currentStep === 'completed' || currentStep === 'failed') return;

        const pollInterval = setInterval(async () => {
            try {
                const res = await api.get(`/answer-sheets/${uploadedSheetId}`);
                const status = res.data.processingStatus;

                if (status === 'PROCESSING') {
                    setCurrentStep('processing');
                } else if (status === 'COMPLETED') {
                    setCurrentStep('completed');
                    toast.success('Processing complete!');
                    setTimeout(() => router.push('/dashboard/answer-sheets'), 1500);
                } else if (status === 'FAILED') {
                    setCurrentStep('failed');
                    setError('Processing failed. Please try again.');
                    toast.error('Processing failed');
                }
            } catch (err) {
                console.error('Error polling status:', err);
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [uploadedSheetId, currentStep, router]);

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setCurrentStep('uploading');
        setError(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("questionType", "SUBJECTIVE");

        try {
            const res = await api.post("/answer-sheets/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setUploadedSheetId(res.data.id);
            setCurrentStep('processing');
            toast.success("File uploaded successfully!");
        } catch (error: any) {
            setCurrentStep('failed');
            const errorMsg = error.response?.data?.message || "Upload failed";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const resetUpload = () => {
        setFile(null);
        setCurrentStep('idle');
        setUploadedSheetId(null);
        setError(null);
    };

    const getStepIndex = () => {
        switch (currentStep) {
            case 'uploading': return 0;
            case 'processing': return 1;
            case 'completed': return 3;
            default: return 0;
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Upload Answer Sheet</h1>
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
                            className="space-y-6"
                        >
                            {/* File Info */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <div className="flex items-center justify-between">
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
                                    {currentStep === 'idle' && (
                                        <button
                                            onClick={resetUpload}
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                        >
                                            <X size={20} className="text-muted-foreground" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Progress Steps */}
                            {currentStep !== 'idle' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        {STEPS.map((step, index) => {
                                            const isActive = index === getStepIndex();
                                            const isCompleted = index < getStepIndex();
                                            const isFailed = currentStep === 'failed' && isActive;

                                            return (
                                                <div key={step.id} className="flex items-center flex-1">
                                                    <div className="flex flex-col items-center flex-1">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompleted
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : isFailed
                                                                ? 'bg-red-500/20 text-red-400'
                                                                : isActive
                                                                    ? 'bg-purple-500/20 text-purple-400 animate-pulse'
                                                                    : 'bg-white/5 text-white/40'
                                                            }`}>
                                                            {isCompleted ? (
                                                                <CheckCircle size={20} />
                                                            ) : isFailed ? (
                                                                <AlertCircle size={20} />
                                                            ) : isActive ? (
                                                                <Loader2 size={20} className="animate-spin" />
                                                            ) : (
                                                                <step.icon size={20} />
                                                            )}
                                                        </div>
                                                        <p className={`text-xs mt-2 text-center ${isActive ? 'text-white font-medium' : 'text-muted-foreground'
                                                            }`}>
                                                            {step.label}
                                                        </p>
                                                    </div>
                                                    {index < STEPS.length - 1 && (
                                                        <div className={`h-0.5 flex-1 mx-2 ${isCompleted ? 'bg-green-500/40' : 'bg-white/10'
                                                            }`} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                                            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                                            <div className="flex-1">
                                                <p className="text-sm text-red-400 font-medium">Error</p>
                                                <p className="text-xs text-red-300 mt-1">{error}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            {currentStep === 'idle' && (
                                <div className="flex gap-4">
                                    <Button
                                        onClick={resetUpload}
                                        variant="secondary"
                                        className="flex-1"
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
                            )}

                            {currentStep === 'failed' && (
                                <div className="flex gap-4">
                                    <Button
                                        onClick={resetUpload}
                                        variant="secondary"
                                        className="flex-1"
                                    >
                                        Try Another File
                                    </Button>
                                    <Button
                                        onClick={handleUpload}
                                        className="flex-1"
                                    >
                                        Retry Upload
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
