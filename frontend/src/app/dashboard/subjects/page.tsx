'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        board: 'CBSE',
        grade: '10',
        syllabusUrl: '',
    });

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const res = await api.get('/subjects');
            setSubjects(res.data);
        } catch (error) {
            toast.error('Failed to load subjects');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSubject) {
                await api.put(`/subjects/${editingSubject.id}`, {
                    ...formData,
                    grade: parseInt(formData.grade),
                });
                toast.success('Subject updated successfully');
            } else {
                await api.post('/subjects', {
                    ...formData,
                    grade: parseInt(formData.grade),
                });
                toast.success('Subject created successfully');
            }
            setShowModal(false);
            setEditingSubject(null);
            setFormData({ name: '', code: '', board: 'CBSE', grade: '10', syllabusUrl: '' });
            fetchSubjects();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save subject');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this subject?')) return;
        try {
            await api.delete(`/subjects/${id}`);
            toast.success('Subject deleted successfully');
            fetchSubjects();
        } catch (error) {
            toast.error('Failed to delete subject');
        }
    };

    const openEditModal = (subject: any) => {
        setEditingSubject(subject);
        setFormData({
            name: subject.name,
            code: subject.code || '',
            board: subject.board,
            grade: subject.grade.toString(),
            syllabusUrl: subject.syllabusUrl || '',
        });
        setShowModal(true);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Subjects</h1>
                        <p className="text-slate-600 dark:text-slate-400">Manage subjects for different boards and grades</p>
                    </div>
                    <Button onClick={() => { setShowModal(true); setEditingSubject(null); setFormData({ name: '', code: '', board: 'CBSE', grade: '10', syllabusUrl: '' }); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Subject
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Subject Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Board</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Grade</th>
                                    <th className="px-6 py-4 text-right text-sm font-medium text-slate-700 dark:text-slate-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {subjects.map((subject) => (
                                    <tr key={subject.id} className="hover:bg-white/5">
                                        <td className="px-6 py-4 text-slate-900 dark:text-slate-100">{subject.name}</td>
                                        <td className="px-6 py-4 text-slate-900 dark:text-slate-100">{subject.board}</td>
                                        <td className="px-6 py-4 text-slate-900 dark:text-slate-100">Grade {subject.grade}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => openEditModal(subject)}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-700 dark:text-slate-300"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(subject.id)}
                                                className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {subjects.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                No subjects found. Click "Add Subject" to create one.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md w-full mx-4">
                        <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">{editingSubject ? 'Edit Subject' : 'Add Subject'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Subject Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Subject Code (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                    placeholder="e.g., MATH-10, PHY-12"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Syllabus URL (Optional)</label>
                                <input
                                    type="url"
                                    value={formData.syllabusUrl}
                                    onChange={(e) => setFormData({ ...formData, syllabusUrl: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                    placeholder="https://example.com/syllabus.pdf"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Board</label>
                                <select
                                    value={formData.board}
                                    onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                >
                                    <option value="CBSE">CBSE</option>
                                    <option value="ICSE">ICSE</option>
                                    <option value="IGCSE">IGCSE</option>
                                    <option value="STATE_BOARD">State Board</option>
                                    <option value="IB">IB</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Grade</label>
                                <select
                                    value={formData.grade}
                                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                >
                                    {[6, 7, 8, 9, 10, 11, 12].map(g => (
                                        <option key={g} value={g}>Grade {g}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1">
                                    {editingSubject ? 'Update' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
