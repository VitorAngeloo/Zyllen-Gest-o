"use client";
import { useQuery } from '@tanstack/react-query';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { tripApi } from '../api/trip-api';

export function useOperationsStatistics(period: { start: string; end: string } | null) {
    const { user, userType, hasPermission } = useAuth();
    const options = useAuthedFetch();
    return useQuery({ queryKey: ['operations-statistics', user?.id, period?.start, period?.end],
        queryFn: ({ signal }) => tripApi.statistics(period!, { ...options, signal }), enabled: !!period && !!user && userType === 'internal' && hasPermission('schedule.view'), refetchInterval: 30_000 });
}
