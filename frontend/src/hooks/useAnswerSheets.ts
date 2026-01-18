import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Hook to fetch answer sheets for current student
 */
export function useAnswerSheets(studentId?: string, options?: { refetchInterval?: number | false | ((data: any) => number | false) }) {
    return useQuery({
        queryKey: ['answerSheets', studentId],
        queryFn: async () => {
            const { data } = await api.get('/answer-sheets');
            return data;
        },
        enabled: !!studentId,
        staleTime: 0, // Always fetch fresh data to catch new uploads/status changes
        refetchInterval: options?.refetchInterval,
    });
}

/**
 * Hook to upload answer sheet with automatic cache invalidation
 */
export function useUploadAnswerSheet() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            const { data } = await api.post('/answer-sheets/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return data;
        },
        onSuccess: () => {
            // Invalidate and refetch answer sheets
            queryClient.invalidateQueries({ queryKey: ['answerSheets'] });
        },
    });
}

/**
 * Hook to delete answer sheet
 */
export function useDeleteAnswerSheet() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/answer-sheets/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['answerSheets'] });
        },
    });
}

/**
 * Hook to fetch single answer sheet details
 */
export function useAnswerSheet(id: string) {
    return useQuery({
        queryKey: ['answerSheet', id],
        queryFn: async () => {
            const { data } = await api.get(`/answer-sheets/${id}`);
            return data;
        },
        enabled: !!id,
    });
}
