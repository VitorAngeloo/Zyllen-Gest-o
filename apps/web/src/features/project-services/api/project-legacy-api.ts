import type { ProjectLegacyRecord, ProjectLegacyUpdate, ProjectHistoryEntry, ProjectPlanningChange, ProjectObservationsChange, ProjectLegacyCancellation } from '@zyllen/shared';
import { apiClient, ApiError, type RequestOptions } from '@web/lib/api-client';
import { projectLegacyCollaborationApi } from './project-collaboration-api';
const route = (id: string) => `/project-services/legacy/records/${encodeURIComponent(id)}`;
export const projectLegacyApi = {
    ...projectLegacyCollaborationApi,
    async update(id: string, input: ProjectLegacyUpdate, options: RequestOptions) {
        return (await apiClient.put<{ data: ProjectLegacyRecord }>(route(id), input, options)).data;
    },
    history(id: string, page: number, options: RequestOptions) {
        return apiClient.get<{ data: ProjectHistoryEntry[]; total: number; page: number; limit: number }>(`${route(id)}/history?page=${page}&limit=30`, options);
    },
    planning(id: string, input: ProjectPlanningChange, options: RequestOptions) { return apiClient.put(`${route(id)}/planning`, input, options); },
    observations(id: string, input: ProjectObservationsChange, options: RequestOptions) { return apiClient.put(`${route(id)}/observations`, input, options); },
    cancel(id: string, input: ProjectLegacyCancellation, options: RequestOptions) { return apiClient.post(`${route(id)}/cancel`, input, options); },
    async detail(id: string, options: RequestOptions) {
        return (await apiClient.get<{ data: ProjectLegacyRecord }>(`/project-services/legacy/records/${encodeURIComponent(id)}`, options)).data;
    },
    async listAll(options: RequestOptions) {
        const records = new Map<string, ProjectLegacyRecord>();
        for (let page = 1; ; page++) {
            let response;
            try { response = await apiClient.get<{ data: ProjectLegacyRecord[]; total: number; page: number; limit: number }>(`/project-services/legacy/records?page=${page}&limit=100`, options); }
            catch (error) { if (page === 1 && error instanceof ApiError && error.status === 404) return []; throw error; }
            if (!Array.isArray(response.data) || !Number.isInteger(response.total) || response.total < 0 || response.page !== page || response.limit !== 100) throw new Error('Resposta incompleta do histórico legado');
            for (const row of response.data) { if (records.has(row.id)) throw new Error('O histórico mudou durante a consulta. Atualize para tentar novamente.'); records.set(row.id, row); }
            if (records.size >= response.total) return [...records.values()];
            if (!response.data.length) throw new Error('Não foi possível consultar todo o histórico legado');
        }
    },
};
