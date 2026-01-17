'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FileText, ListTodo, Save, Download, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism } from 'react-syntax-highlighter';
const SyntaxHighlighter = Prism as any;
import dracula from 'react-syntax-highlighter/dist/esm/styles/prism/dracula';
import DashboardLayout from '@/components/layout/DashboardLayout';

type Tab = 'implementation' | 'tasks';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('implementation');
    const [implementationPlan, setImplementationPlan] = useState('');
    const [taskList, setTaskList] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user?.role === 'STUDENT') {
            router.replace('/student');
        }
    }, [user, loading, router]);

    if (loading || user?.role === 'STUDENT') {
        return null;
    }

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        try {
            const implRes = await fetch('/api/documents/implementation-plan');
            const taskRes = await fetch('/api/documents/task-list');

            if (implRes.ok) {
                const data = await implRes.json();
                setImplementationPlan(data.content);
            }

            if (taskRes.ok) {
                const data = await taskRes.json();
                setTaskList(data.content);
            }
        } catch (error) {
            console.error('Failed to load documents:', error);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const endpoint = activeTab === 'implementation'
                ? '/api/documents/implementation-plan'
                : '/api/documents/task-list';

            const content = activeTab === 'implementation' ? implementationPlan : taskList;

            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });

            if (res.ok) {
                alert('Document saved successfully!');
                setIsEditing(false);
            } else {
                alert('Failed to save document');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save document');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = () => {
        const content = activeTab === 'implementation' ? implementationPlan : taskList;
        const filename = activeTab === 'implementation' ? 'implementation_plan.md' : 'task.md';

        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (activeTab === 'implementation') {
                setImplementationPlan(content);
            } else {
                setTaskList(content);
            }
        };
        reader.readAsText(file);
    };

    const currentContent = activeTab === 'implementation' ? implementationPlan : taskList;
    const setCurrentContent = activeTab === 'implementation' ? setImplementationPlan : setTaskList;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            Documentation
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Manage implementation plans and task lists
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isEditing ? (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                    {isSaving ? 'Saving...' : 'Save'}
                                </span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <span className="text-sm font-medium">Edit</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('implementation')}
                        className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${activeTab === 'implementation'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                    >
                        <FileText className="w-5 h-5" />
                        Implementation Plan
                    </button>
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${activeTab === 'tasks'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                    >
                        <ListTodo className="w-5 h-5" />
                        Task List
                    </button>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {isEditing ? (
                        <textarea
                            value={currentContent}
                            onChange={(e) => setCurrentContent(e.target.value)}
                            className="w-full h-[calc(100vh-400px)] p-6 font-mono text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Enter markdown content..."
                        />
                    ) : (
                        <div className="p-8 overflow-auto h-[calc(100vh-400px)]">
                            <div className="prose prose-lg prose-slate dark:prose-invert max-w-none text-slate-900 dark:text-slate-100">
                                <ReactMarkdown
                                    components={{
                                        code({ inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            return !inline && match ? (
                                                <SyntaxHighlighter
                                                    style={dracula}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    customStyle={{
                                                        borderRadius: '0.5rem',
                                                        padding: '1rem',
                                                        fontSize: '0.875rem',
                                                    }}
                                                    {...props}
                                                >
                                                    {String(children).replace(/\n$/, '')}
                                                </SyntaxHighlighter>
                                            ) : (
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        },
                                    }}
                                >
                                    {currentContent || '# No content available\n\nPlease upload or create a document.'}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
