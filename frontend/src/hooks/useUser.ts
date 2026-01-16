import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

/**
 * Hook to fetch current user data with caching
 * Eliminates duplicate user queries across components
 */
export function useUser() {
    const { user: authUser } = useAuth();

    return useQuery({
        queryKey: ['user', authUser?.id],
        queryFn: async () => {
            if (!authUser?.id) return null;
            const { data } = await api.get(`/users/${authUser.id}`);
            return data;
        },
        enabled: !!authUser?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook to fetch organization data with caching
 * Eliminates duplicate organization queries
 */
export function useOrganization(orgId?: string) {
    return useQuery({
        queryKey: ['organization', orgId],
        queryFn: async () => {
            if (!orgId) return null;
            const { data } = await api.get(`/organizations/${orgId}`);
            return data;
        },
        enabled: !!orgId,
        staleTime: 10 * 60 * 1000, // 10 minutes (organizations rarely change)
    });
}
