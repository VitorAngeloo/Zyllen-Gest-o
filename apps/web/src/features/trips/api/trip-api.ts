import type { OperationsStatistics, TripInput, TripOptions, TripRecord, TripStatusInput } from '@zyllen/shared';
import { apiClient, type RequestOptions } from '@web/lib/api-client';

export const tripApi = {
    list(params: URLSearchParams, options: RequestOptions) { return apiClient.get<{ data: TripRecord[]; total: number; page: number; limit: number }>(`/trips?${params}`, options); },
    async find(id: string, options: RequestOptions) { return (await apiClient.get<{ data: TripRecord }>(`/trips/${encodeURIComponent(id)}`, options)).data; },
    async options(options: RequestOptions) { return (await apiClient.get<{ data: TripOptions }>('/trips/options', options)).data; },
    async save(id: string | undefined, input: TripInput, options: RequestOptions) {
        return (id ? await apiClient.put<{ data: TripRecord }>(`/trips/${encodeURIComponent(id)}`, input, options) : await apiClient.post<{ data: TripRecord }>('/trips', input, options)).data;
    },
    async status(id: string, input: TripStatusInput, options: RequestOptions) { return (await apiClient.put<{ data: TripRecord }>(`/trips/${encodeURIComponent(id)}/status`, input, options)).data; },
    async statistics(period: { start: string; end: string }, options: RequestOptions) { return (await apiClient.get<{ data: OperationsStatistics }>(`/trips/statistics?${new URLSearchParams(period)}`, options)).data; },
};
