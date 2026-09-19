"use client";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { tripApi } from '../api/trip-api';

export function useTripQueries() {
    const { user, userType, hasPermission } = useAuth();
    const options = useAuthedFetch();
    const client = useQueryClient();
    const enabled = !!user && userType === 'internal' && hasPermission('schedule.view');
    const invalidate = async () => { await Promise.all(['trips', 'trip-options', 'schedules', 'project-services', 'project-service-options', 'operations-statistics', 'structures', 'structure-cycles'].map(key => client.invalidateQueries({ queryKey: [key] }))); };
    return { user, options, enabled, invalidate };
}
export function useTrips(params: URLSearchParams) {
    const state = useTripQueries();
    const list = useQuery({ queryKey: ['trips', state.user?.id, params.toString()], queryFn: ({ signal }) => tripApi.list(params, { ...state.options, signal }), enabled: state.enabled, refetchInterval: 30_000 });
    return { ...state, list };
}
