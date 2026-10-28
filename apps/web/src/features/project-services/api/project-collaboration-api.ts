import type { ProjectNoteCreate, ProjectPendingCreate, ProjectPendingUpdate } from '@zyllen/shared';
import { apiClient, type RequestOptions } from '@web/lib/api-client';
const route = (serviceId: string) => `/project-services/${encodeURIComponent(serviceId)}`;
export const projectCollaborationApi = {
    addPending(serviceId: string, body: ProjectPendingCreate, options: RequestOptions) {
        return apiClient.post(`${route(serviceId)}/pending`, body, options);
    },
    updatePending(serviceId: string, pendingId: string, body: ProjectPendingUpdate, options: RequestOptions) {
        return apiClient.put(`${route(serviceId)}/pending/${encodeURIComponent(pendingId)}`, body, options);
    },
    resolvePending(serviceId: string, pendingId: string, expectedVersion: number, options: RequestOptions) {
        return apiClient.put(`${route(serviceId)}/pending/${encodeURIComponent(pendingId)}/resolve`, { expectedVersion }, options);
    },
    addNote(serviceId: string, body: ProjectNoteCreate, options: RequestOptions) {
        return apiClient.post(`${route(serviceId)}/notes`, body, options);
    },
};
