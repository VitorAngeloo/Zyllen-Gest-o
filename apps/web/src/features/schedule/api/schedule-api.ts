import { apiClient, type RequestOptions } from "@web/lib/api-client";
import type { Schedule } from '../types/schedule.types';
import { TRIP_COPY } from '@web/lib/brand-voice';

type PathValue = string | number | null | undefined;
type QueryValue = PathValue | URLSearchParams;

export const scheduleApi = {
    upcoming(startDate: string, options?: RequestOptions) {
        const query = new URLSearchParams({ status: 'SCHEDULED', startDate, limit: '5', page: '1' });
        return apiClient.get<{ data: Schedule[]; total: number }>(`/schedule?${query}`, options);
    },
    async listAllSchedules(status: string, type: string, options?: RequestOptions) {
        const records = new Map<string, Schedule>();
        let page = 1, received = 0, total = 0;
        do {
            const response = await apiClient.get<{ data: Schedule[]; total: number }>(`/schedule?limit=100&page=${page}${status}${type}`, options);
            for (const item of response.data) records.set(item.id, item);
            received += response.data.length; total = response.total;
            if (!response.data.length && received < total) throw new Error(TRIP_COPY.calendarError);
            page++;
        } while (received < total);
        return { data: [...records.values()], total };
    },
    updateSchedule<T = unknown>(id: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.put<T>(`/schedule/${id}`, body, options);
    },

    listActiveInstallers<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/schedule/installers?onlyActive=true`, options);
    },

    listCompanies<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/clients/companies`, options);
    },

    listProjects<T = unknown>(companyId: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/clients/companies/${companyId}/projects`, options);
    },

    createSchedule<T = unknown>(body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`/schedule`, body, options);
    },

    listConflicts<T = unknown>(query: QueryValue, options?: RequestOptions) {
        return apiClient.get<T>(`/schedule/conflicts?${query}`, options);
    },

    listInstallers<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/schedule/installers`, options);
    },

    listSchedules<T = unknown>(statusQuery: PathValue, typeQuery: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/schedule?limit=100${statusQuery}${typeQuery}`, options);
    },

    updateInstaller<T = unknown>(id: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.put<T>(`/schedule/installers/${id}`, body, options);
    },

    cancelSchedule<T = unknown>(id: PathValue, query: QueryValue, options?: RequestOptions) {
        return apiClient.delete<T>(`/schedule/${id}${query}`, options);
    },
};
