import type { ProjectNoteCreate, ProjectPendingCreate, ProjectPendingUpdate } from '@zyllen/shared';
import { apiClient, type RequestOptions } from '@web/lib/api-client';
function collaborationApi(prefix: string) {
const route = (serviceId: string) => `${prefix}/${encodeURIComponent(serviceId)}`;
return {
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
}
export const projectCollaborationApi = collaborationApi('/project-services');
export const projectLegacyCollaborationApi = collaborationApi('/project-services/legacy/records');
