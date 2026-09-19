import { apiClient, type RequestOptions } from "@web/lib/api-client";

type PathValue = string | number | null | undefined;
type QueryValue = PathValue | URLSearchParams;

export const followupsApi = {
    deleteFollowup<T = unknown>(id: PathValue, options?: RequestOptions) {
        return apiClient.delete<T>(`/followups/${id}`, options);
    },

    deleteBlock<T = unknown>(followupId: PathValue, blockId: PathValue, options?: RequestOptions) {
        return apiClient.delete<T>(`/followups/${followupId}/blocks/${blockId}`, options);
    },

    deleteAttachment<T = unknown>(followupId: PathValue, blockId: PathValue, attachmentId: PathValue, options?: RequestOptions) {
        return apiClient.delete<T>(`/followups/${followupId}/blocks/${blockId}/attachments/${attachmentId}`, options);
    },

    deleteChecklistItem<T = unknown>(followupId: PathValue, blockId: PathValue, itemId: PathValue, options?: RequestOptions) {
        return apiClient.delete<T>(`/followups/${followupId}/blocks/${blockId}/checklist/${itemId}`, options);
    },

    listClientFollowups<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/client/followups`, options);
    },

    getClientFollowup<T = unknown>(id: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/client/followups/${id}`, options);
    },

    listProjects<T = unknown>(companyId: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/clients/companies/${companyId}/projects`, options);
    },

    searchCompanies<T = unknown>(search: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/clients/companies?search=${search}&limit=20`, options);
    },

    getFollowup<T = unknown>(id: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/followups/${id}`, options);
    },

    getHistory<T = unknown>(id: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/followups/${id}/history`, options);
    },

    listFollowups<T = unknown>(statusQuery: PathValue, searchQuery: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/followups?limit=100${statusQuery}${searchQuery}`, options);
    },

    createFollowup<T = unknown>(body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`/followups`, body, options);
    },

    createBlock<T = unknown>(followupId: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`/followups/${followupId}/blocks`, body, options);
    },

    createChecklistItem<T = unknown>(followupId: PathValue, blockId: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`/followups/${followupId}/blocks/${blockId}/checklist`, body, options);
    },

    createComment<T = unknown>(followupId: PathValue, blockId: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`/followups/${followupId}/blocks/${blockId}/comments`, body, options);
    },

    updateFollowup<T = unknown>(id: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.put<T>(`/followups/${id}`, body, options);
    },

    updateBlock<T = unknown>(followupId: PathValue, blockId: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.put<T>(`/followups/${followupId}/blocks/${blockId}`, body, options);
    },

    updateChecklistItem<T = unknown>(followupId: PathValue, blockId: PathValue, itemId: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.put<T>(`/followups/${followupId}/blocks/${blockId}/checklist/${itemId}`, body, options);
    },

    updateStatus<T = unknown>(id: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.put<T>(`/followups/${id}/status`, body, options);
    },

    uploadAttachments<T = unknown>(followupId: PathValue, blockId: PathValue, body: FormData, options?: RequestOptions) {
        return apiClient.upload<T>(`/followups/${followupId}/blocks/${blockId}/attachments`, body, options);
    },
};
