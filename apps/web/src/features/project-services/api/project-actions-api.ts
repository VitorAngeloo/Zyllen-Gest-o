import type { ProjectHistoryEntry, ProjectCancellation, ProjectObservationsChange, ProjectPlanningChange } from '@zyllen/shared';
import { apiClient, type RequestOptions } from '@web/lib/api-client';
export const projectActionsApi = {
    planning: (id: string, body: ProjectPlanningChange, options: RequestOptions) => apiClient.put(`/project-services/${encodeURIComponent(id)}/planning`, body, options),
    observations: (id: string, body: ProjectObservationsChange, options: RequestOptions) => apiClient.put(`/project-services/${encodeURIComponent(id)}/observations`, body, options),
    cancel: (id: string, body: ProjectCancellation, options: RequestOptions) => apiClient.post(`/project-services/${encodeURIComponent(id)}/cancel`, body, options),
    history: (id: string, page: number, options: RequestOptions) => apiClient.get<{ data: ProjectHistoryEntry[]; total: number; page: number; limit: number }>(`/project-services/${encodeURIComponent(id)}/history?page=${page}&limit=30`, options),
};
