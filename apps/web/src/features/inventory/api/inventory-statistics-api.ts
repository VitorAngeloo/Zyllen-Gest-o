import type { InventoryStatistics, InventoryStatisticsQuery, StockMinimumInput } from '@zyllen/shared';
import { apiClient, type RequestOptions } from '@web/lib/api-client';
export const inventoryStatisticsApi = {
    statistics: (query: InventoryStatisticsQuery, opts?: RequestOptions) => apiClient.get<{ data: InventoryStatistics }>(`/inventory/statistics?${new URLSearchParams({ context: query.context, ...(query.locationId ? { locationId: query.locationId } : {}), ...(query.companyId ? { companyId: query.companyId } : {}) })}`, opts),
    options: (opts?: RequestOptions) => apiClient.get<{ data: { id: string; skuCode: string; name: string }[] }>('/inventory/minimum-options', opts),
    minimums: (locationId: string, opts?: RequestOptions) => apiClient.get<{ data: (StockMinimumInput & { id: string })[] }>(`/inventory/minimums?locationId=${locationId}`, opts),
    save: (value: StockMinimumInput, opts?: RequestOptions) => apiClient.post('/inventory/minimums', value, opts),
};
