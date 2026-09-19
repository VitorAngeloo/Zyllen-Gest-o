"use client";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProjectServiceStatus } from '@zyllen/shared';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { projectServiceApi } from '../api/project-service-api';

export function useProjectServices(params: URLSearchParams) {
    const { user, userType, hasPermission } = useAuth();
    const options = useAuthedFetch();
    const client = useQueryClient();
    const enabled = !!user && userType === 'internal' && hasPermission('schedule.view');
    const list = useQuery({ queryKey: ['project-services', user?.id, params.toString()], queryFn: ({ signal }) => projectServiceApi.list(params, { ...options, signal }), enabled, refetchInterval: 30_000 });
    const choices = useQuery({ queryKey: ['project-service-options', user?.id], queryFn: ({ signal }) => projectServiceApi.options({ ...options, signal }), enabled });
    const invalidate = async () => { await Promise.all([
        client.invalidateQueries({ queryKey: ['project-services'] }), client.invalidateQueries({ queryKey: ['project-service-options'] }),
        client.invalidateQueries({ queryKey: ['schedules'] }), client.invalidateQueries({ queryKey: ['projects'] }),
        ...['trips', 'trip-options', 'operations-statistics', 'structures', 'structure-cycles'].map(key => client.invalidateQueries({ queryKey: [key] })),
    ]); };
    const status = useMutation({ mutationFn: ({ id, status }: { id: string; status: ProjectServiceStatus }) => projectServiceApi.status(id, status, options), onSuccess: invalidate });
    return { list, choices, status, invalidate, options };
}
