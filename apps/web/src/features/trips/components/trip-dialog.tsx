"use client";
import { useQuery } from '@tanstack/react-query';
import { tripApi } from '../api/trip-api';
import { useTripQueries } from '../hooks/use-trips';
import { TripFormDialog } from './trip-form-dialog';
import { TripDialogFeedback } from './trip-dialog-feedback';

interface Props { id?: string; initialDates?: { start: string; end: string }; onClose: () => void }
export function TripDialog({ id, initialDates, onClose }: Props) {
    const state = useTripQueries();
    const choices = useQuery({ queryKey: ['trip-options', state.user?.id], queryFn: ({ signal }) => tripApi.options({ ...state.options, signal }), enabled: state.enabled });
    const trip = useQuery({ queryKey: ['trips', 'detail', state.user?.id, id], queryFn: ({ signal }) => tripApi.find(id!, { ...state.options, signal }), enabled: state.enabled && !!id });
    const failed = choices.isError || (!!id && trip.isError), loading = choices.isLoading || (!!id && trip.isLoading);
    if (!state.enabled || loading || failed || !choices.data || (!!id && !trip.data)) return <TripDialogFeedback loading={loading} enabled={state.enabled} failed={failed} onClose={onClose} onRetry={() => { void choices.refetch(); if (id) void trip.refetch(); }} />;
    return <TripFormDialog editing={trip.data} initialDates={initialDates} choices={choices.data} options={state.options} onClose={onClose} onSaved={state.invalidate} />;
}
