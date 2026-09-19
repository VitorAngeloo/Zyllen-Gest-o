import { apiClient, type RequestOptions } from "@web/lib/api-client";

type PathValue = string | number | null | undefined;
type QueryValue = PathValue | URLSearchParams;

export const maintenanceApi = {
    deleteFollowupBlock<T = unknown>(basePath: PathValue, osId: PathValue, blockId: PathValue, options?: RequestOptions) {
        return apiClient.delete<T>(`${basePath}/${osId}/followup-blocks/${blockId}`, options);
    },

    deleteFollowupAttachment<T = unknown>(basePath: PathValue, osId: PathValue, blockId: PathValue, attachmentId: PathValue, options?: RequestOptions) {
        return apiClient.delete<T>(`${basePath}/${osId}/followup-blocks/${blockId}/attachments/${attachmentId}`, options);
    },

    listAttachments<T = unknown>(basePath: PathValue, osId: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`${basePath}/${osId}/attachments`, options);
    },

    listFollowupBlocks<T = unknown>(basePath: PathValue, osId: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`${basePath}/${osId}/followup-blocks`, options);
    },

    listClientOrders<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/client/maintenance`, options);
    },

    listPublicProjects<T = unknown>(companyId: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/clients/companies/${companyId}/projects-public`, options);
    },

    searchCompanies<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/clients/companies/search`, options);
    },

    listContractorOrders<T = unknown>(query: QueryValue, options?: RequestOptions) {
        return apiClient.get<T>(`/contractor/maintenance${query}`, options);
    },

    listContractorAttachments<T = unknown>(osId: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/contractor/maintenance/${osId}/attachments`, options);
    },

    listOrders<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/maintenance`, options);
    },

    listFilteredOrders<T = unknown>(query: QueryValue, options?: RequestOptions) {
        return apiClient.get<T>(`/maintenance${query}`, options);
    },

    listInternalAttachments<T = unknown>(osId: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/maintenance/${osId}/attachments`, options);
    },

    listInternalFollowupBlocks<T = unknown>(osId: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/maintenance/${osId}/followup-blocks`, options);
    },

    listMyOrders<T = unknown>(query: QueryValue, options?: RequestOptions) {
        return apiClient.get<T>(`/maintenance/my-orders${query}`, options);
    },

    createFollowupBlock<T = unknown>(basePath: PathValue, osId: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`${basePath}/${osId}/followup-blocks`, body, options);
    },

    lockFollowupBlock<T = unknown>(basePath: PathValue, osId: PathValue, blockId: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`${basePath}/${osId}/followup-blocks/${blockId}/lock`, body, options);
    },

    createContractorOrder<T = unknown>(body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`/contractor/maintenance`, body, options);
    },

    createOrder<T = unknown>(body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`/maintenance`, body, options);
    },

    updateFollowupBlock<T = unknown>(basePath: PathValue, osId: PathValue, blockId: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.put<T>(`${basePath}/${osId}/followup-blocks/${blockId}`, body, options);
    },

    confirmWitnessSignature<T = unknown>(osId: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.put<T>(`/client/maintenance/${osId}/witness-signature`, body, options);
    },

    updateContractorFormData<T = unknown>(osId: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.put<T>(`/contractor/maintenance/${osId}/form-data`, body, options);
    },

    updateContractorStatus<T = unknown>(osId: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.put<T>(`/contractor/maintenance/${osId}/status`, body, options);
    },

    updateFormData<T = unknown>(osId: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.put<T>(`/maintenance/${osId}/form-data`, body, options);
    },

    updateStatus<T = unknown>(osId: PathValue, body: unknown, options?: RequestOptions) {
        return apiClient.put<T>(`/maintenance/${osId}/status`, body, options);
    },

    uploadAttachments<T = unknown>(basePath: PathValue, osId: PathValue, body: FormData, options?: RequestOptions) {
        return apiClient.upload<T>(`${basePath}/${osId}/attachments`, body, options);
    },

    uploadFollowupAttachments<T = unknown>(basePath: PathValue, osId: PathValue, blockId: PathValue, body: FormData, options?: RequestOptions) {
        return apiClient.upload<T>(`${basePath}/${osId}/followup-blocks/${blockId}/attachments`, body, options);
    },
};
