import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface UseSubjectsParams {
    board?: string;
    grade?: string;
}

/**
 * Hook to fetch subjects with caching
 * Eliminates duplicate subject queries (e.g., CBSE Grade 10)
 * Query key includes filters for proper cache separation
 */
export function useSubjects({ board, grade }: UseSubjectsParams = {}) {
    return useQuery({
        queryKey: ['subjects', { board, grade }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (board) params.append('board', board);
            if (grade) params.append('grade', grade);

            const { data } = await api.get(`/subjects?${params}`);
            return data;
        },
        enabled: !!board && !!grade,
        staleTime: 15 * 60 * 1000, // 15 minutes (subjects rarely change)
    });
}
