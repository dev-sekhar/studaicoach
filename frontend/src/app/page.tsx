'use client';

import { useState, useEffect } from 'react';
import { FileText, ListTodo, Save, Download, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Tab = 'implementation' | 'tasks';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('implementation');
    const [implementationPlan, setImplementationPlan] = useState('');
    const [taskList, setTaskList] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                StudAICoach
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Super Admin Dashboard
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    accept=".md"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                    <Upload className="w-4 h-4" />
                                    <span className="text-sm font-medium">Upload</span>
                                </div>
                            </label>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                <span className="text-sm font-medium">Download</span>
                            </button>
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
                </div>
            </header>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
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
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {isEditing ? (
                        <textarea
                            value={currentContent}
                            onChange={(e) => setCurrentContent(e.target.value)}
                            className="w-full h-[calc(100vh-300px)] p-6 font-mono text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Enter markdown content..."
                        />
                    ) : (
                        <div className="p-8 overflow-auto h-[calc(100vh-300px)] bg-white dark:bg-slate-800">
                            <div className="prose prose-lg prose-slate dark:prose-invert max-w-none
                prose-headings:font-bold prose-headings:tracking-tight
                prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8
                prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-6 prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-2
                prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-5
                prose-p:text-base prose-p:leading-7 prose-p:mb-4
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-code:text-sm prose-code:bg-slate-100 dark:prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-slate-900 prose-pre:text-slate-100
                prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-4
                prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-4
                prose-li:mb-2
                prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic
                prose-strong:font-semibold prose-strong:text-slate-900 dark:prose-strong:text-slate-100
                prose-table:w-full prose-table:border-collapse
                prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 prose-th:p-2
                prose-td:border prose-td:border-slate-300 prose-td:p-2">
                                <ReactMarkdown
                                    components={{
                                        code({ inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            return !inline && match ? (
                                                <SyntaxHighlighter
                                                    style={vscDarkPlus}
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
        </div>
    );
}
