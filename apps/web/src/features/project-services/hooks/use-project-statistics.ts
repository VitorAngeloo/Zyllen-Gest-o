"use client";
import { useQuery } from '@tanstack/react-query';
import type { ProjectStatisticsQuery } from '@zyllen/shared';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { projectServiceApi } from '../api/project-service-api';

export function useProjectStatistics(type: ProjectStatisticsQuery['type'], period: { start: string; end: string } | null) {
    const { user, userType, hasPermission } = useAuth();
    const options = useAuthedFetch();
    return useQuery({
        queryKey: ['project-services', 'statistics', user?.id, type, period?.start, period?.end],
        queryFn: ({ signal }) => projectServiceApi.statistics({ type, ...period! }, { ...options, signal }),
        enabled: !!user && userType === 'internal' && hasPermission('schedule.view') && !!period,
        refetchInterval: 30_000,
        retry: 1,
    });
}
