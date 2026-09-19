import type { ProjectServiceInput, ProjectServiceOptions, ProjectServiceRecord, ProjectServiceStatus, ProjectStatistics, ProjectStatisticsQuery } from '@zyllen/shared';
import { apiClient, type RequestOptions } from '@web/lib/api-client';

export const projectServiceApi = {
    async detail(id: string, options: RequestOptions) {
        return (await apiClient.get<{ data: ProjectServiceRecord }>(`/project-services/${encodeURIComponent(id)}`, options)).data;
    },
    async statistics(query: ProjectStatisticsQuery, options: RequestOptions) {
        return (await apiClient.get<{ data: ProjectStatistics }>(`/project-services/statistics?${new URLSearchParams(query)}`, options)).data;
    },
    list(params: URLSearchParams, options: RequestOptions) {
        return apiClient.get<{ data: ProjectServiceRecord[]; total: number; page: number; limit: number }>(`/project-services?${params}`, options);
    },
    async options(options: RequestOptions) {
        return (await apiClient.get<{ data: ProjectServiceOptions }>('/project-services/options', options)).data;
    },
    async save(id: string | undefined, input: ProjectServiceInput, options: RequestOptions) {
        const response = id ? await apiClient.put<{ data: ProjectServiceRecord }>(`/project-services/${encodeURIComponent(id)}`, input, options)
            : await apiClient.post<{ data: ProjectServiceRecord }>('/project-services', input, options);
        return response.data;
    },
    async status(id: string, status: ProjectServiceStatus, options: RequestOptions) {
        return (await apiClient.put<{ data: ProjectServiceRecord }>(`/project-services/${encodeURIComponent(id)}/status`, { status }, options)).data;
    },
    async marker(name: string, options: RequestOptions) {
        return (await apiClient.post<{ data: { id: string; name: string } }>('/project-services/markers', { name }, options)).data;
    },
};
