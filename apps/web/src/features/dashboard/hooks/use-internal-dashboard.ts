"use client";

import { useQuery } from '@tanstack/react-query';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { internalDashboardApi } from '../api/internal-dashboard-api';

export function useInternalDashboard() {
    const { user } = useAuth();
    const options = useAuthedFetch();
    return useQuery({
        queryKey: ['internal-dashboard', user?.id],
        queryFn: ({ signal }) => internalDashboardApi.get({ ...options, signal }),
        enabled: user?.type === 'internal' && user.role?.name === 'Internos',
        refetchInterval: 30_000,
    });
}
