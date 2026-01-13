'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Plus, Edit, Trash2, Globe } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';

export default function BoardsPage() {
    const [boards, setBoards] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBoard, setEditingBoard] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        country: '',
        description: '',
        websiteUrl: '',
    });

    useEffect(() => {
        fetchBoards();
    }, []);

    const fetchBoards = async () => {
        try {
            const res = await api.get('/boards/custom');
            setBoards(res.data);
        } catch (error) {
            toast.error('Failed to load boards');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingBoard) {
                await api.put(`/boards/custom/${editingBoard.id}`, formData);
                toast.success('Board updated successfully');
            } else {
                await api.post('/boards/custom', formData);
                toast.success('Board created successfully');
            }
            setShowModal(false);
            setEditingBoard(null);
            resetForm();
            fetchBoards();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save board');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this board? All subjects for this board will also be deleted.')) return;
        try {
            await api.delete(`/boards/custom/${id}`);
            toast.success('Board deleted successfully');
            fetchBoards();
        } catch (error) {
            toast.error('Failed to delete board');
        }
    };

    const openEditModal = (board: any) => {
        setEditingBoard(board);
        setFormData({
            name: board.name,
            code: board.code,
            country: board.country || '',
            description: board.description || '',
            websiteUrl: board.websiteUrl || '',
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            country: '',
            description: '',
            websiteUrl: '',
        });
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Education Boards</h1>
                        <p className="text-slate-600 dark:text-slate-400">Manage custom education boards for your organization</p>
                    </div>
                    <Button onClick={() => { setShowModal(true); setEditingBoard(null); resetForm(); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Custom Board
                    </Button>
                </div>

                {/* Standard Boards Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Standard Boards Available</h3>
                    <div className="flex flex-wrap gap-2">
                        {['CBSE', 'ICSE', 'IGCSE', 'IB', 'STATE_BOARD'].map(board => (
                            <span key={board} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                                {board}
                            </span>
                        ))}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Board Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Code</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Country</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Website</th>
                                    <th className="px-6 py-4 text-right text-sm font-medium text-slate-700 dark:text-slate-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {boards.map((board) => (
                                    <tr key={board.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="px-6 py-4 text-slate-900 dark:text-slate-100 font-medium">{board.name}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs">{board.code}</code>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{board.country || '-'}</td>
                                        <td className="px-6 py-4">
                                            {board.websiteUrl ? (
                                                <a href={board.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                                    <Globe className="w-3 h-3" />
                                                    <span className="text-xs">Visit</span>
                                                </a>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => openEditModal(board)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-700 dark:text-slate-300"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(board.id)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {boards.length === 0 && (
                            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                No custom boards found. Click "Add Custom Board" to create one.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <Modal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    title={editingBoard ? 'Edit Board' : 'Add Custom Board'}
                    size="lg"
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Board Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Maharashtra State Board"
                                required
                            />
                            <Input
                                label="Board Code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="e.g., MSBSHSE"
                                required
                                helperText="Unique identifier for this board"
                            />
                        </div>

                        <Input
                            label="Country"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            placeholder="e.g., India"
                        />

                        <Textarea
                            label="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description of this education board..."
                            rows={3}
                        />

                        <Input
                            label="Website URL"
                            type="url"
                            value={formData.websiteUrl}
                            onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                            placeholder="https://example.com"
                            helperText="Official website of the education board"
                        />

                        <ModalFooter>
                            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingBoard ? 'Update Board' : 'Create Board'}
                            </Button>
                        </ModalFooter>
                    </form>
                </Modal>
            )}
        </DashboardLayout>
    );
}
