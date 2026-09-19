import { apiClient, type RequestOptions } from "@web/lib/api-client";

type PathValue = string | number | null | undefined;
type QueryValue = PathValue | URLSearchParams;

export const inventoryApi = {
    lookupAsset<T = unknown>(code: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/assets/lookup/${code}`, options);
    },

    getAssetSummary<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/assets/summary?search=`, options);
    },

    searchExitAssets<T = unknown>(search: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/assets?search=${search}&limit=20`, options);
    },

    searchBatchAssets<T = unknown>(search: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/assets?search=${search}&limit=30`, options);
    },

    listExitAssets<T = unknown>(skuId: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/assets?skuId=${skuId}&limit=100`, options);
    },

    listDetailAssets<T = unknown>(skuId: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/assets?skuId=${skuId}&limit=1000`, options);
    },

    listSkus<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/catalog/skus`, options);
    },

    getBalances<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/inventory/balances`, options);
    },

    listActiveExitReasons<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/inventory/exit-reasons?onlyActive=true`, options);
    },

    listMovementTypes<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/inventory/movement-types`, options);
    },

    listMovements<T = unknown>(page: PathValue, limit: PathValue, searchQuery: PathValue, options?: RequestOptions) {
        return apiClient.get<T>(`/inventory/movements?page=${page}&limit=${limit}${searchQuery}`, options);
    },

    getStats<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/inventory/stats`, options);
    },

    listLocations<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/locations`, options);
    },

    getProductExitReport<T = unknown>(query: QueryValue, options?: RequestOptions) {
        return apiClient.get<T>(`/product-exits/report?${query}`, options);
    },

    getProductExitSummary<T = unknown>(options?: RequestOptions) {
        return apiClient.get<T>(`/product-exits/summary`, options);
    },

    listProductExits<T = unknown>(query: QueryValue, options?: RequestOptions) {
        return apiClient.get<T>(`/product-exits?${query}`, options);
    },

    createEntry<T = unknown>(body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`/inventory/entry`, body, options);
    },

    createBatchEntry<T = unknown>(body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`/inventory/entry-batch`, body, options);
    },

    createExit<T = unknown>(body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`/inventory/exit`, body, options);
    },

    createBatchExit<T = unknown>(body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`/inventory/exit-batch`, body, options);
    },

    createProductExit<T = unknown>(body: unknown, options?: RequestOptions) {
        return apiClient.post<T>(`/product-exits`, body, options);
    },

    uploadEntry<T = unknown>(body: FormData, options?: RequestOptions) {
        return apiClient.upload<T>(`/inventory/entry`, body, options);
    },
};
