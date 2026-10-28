"use client";
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { canEnterProjectPlanning, PROJECT_PLANNING_ACCESS } from '@zyllen/shared';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { scheduleApi } from '@web/features/schedule/api/schedule-api';
import { loadChronogramProjects } from '../api/chronogram-api';
import { projectLegacyApi } from '@web/features/project-services/api/project-legacy-api';
import { dayKey } from '../utils/chronogram-dates';
import { combineChronogram, legacyToChronogram } from '../utils/chronogram-records';

export function useChronogram() {
    const { user, userType, hasPermission } = useAuth();
    const options = useAuthedFetch();
    const [now, setNow] = useState(() => new Date());
    useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
    const enabled = canEnterProjectPlanning(user) && userType === 'internal' && hasPermission(PROJECT_PLANNING_ACCESS.view);
    const projects = useQuery({ queryKey: ['project-services', 'chronogram', user?.id], enabled,
        queryFn: ({ signal }) => loadChronogramProjects({ ...options, signal }), refetchInterval: 30_000 });
    const schedules = useQuery({ queryKey: ['schedules', 'chronogram', user?.id], enabled,
        queryFn: async ({ signal }) => {
            const response = await scheduleApi.listAllSchedules('', '', { ...options, signal });
            if (response.data.length < response.total) throw new Error('A agenda mudou durante a consulta. Atualize para tentar novamente.');
            return response;
        }, refetchInterval: 30_000 });
    const legacy = useQuery({ queryKey: ['project-services', 'chronogram-legacy', user?.id], enabled,
        queryFn: ({ signal }) => projectLegacyApi.listAll({ ...options, signal }), refetchInterval: 30_000 });
    const records = useMemo(() => [...combineChronogram(projects.data ?? [], schedules.data?.data ?? []), ...(legacy.data ?? []).map(legacyToChronogram)], [projects.data, schedules.data, legacy.data]);
    return { projects, schedules, legacy, records, now, today: dayKey(now),
        loading: projects.isLoading || schedules.isLoading || legacy.isLoading, failed: projects.isError || schedules.isError || legacy.isError,
        ready: !!projects.data && !!schedules.data && !!legacy.data, fetching: projects.isFetching || schedules.isFetching || legacy.isFetching,
        updatedAt: projects.dataUpdatedAt && schedules.dataUpdatedAt && legacy.dataUpdatedAt ? Math.min(projects.dataUpdatedAt, schedules.dataUpdatedAt, legacy.dataUpdatedAt) : 0,
        refresh: () => Promise.all([projects.refetch(), schedules.refetch(), legacy.refetch()]) };
}
