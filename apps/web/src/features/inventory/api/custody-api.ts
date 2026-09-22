import { apiClient, type RequestOptions } from '@web/lib/api-client';
import type { CustodyAsset, CustodyOptions, InventoryTransferInput, InventoryTransferRecord, UninstallationReviewInput, UninstallationSnapshot, UpdateLocationInput } from '@zyllen/shared';

export interface CustodyPage<T> { data: T[]; total: number; page: number; limit: number }
export const custodyApi = {
    options: (opts?: RequestOptions) => apiClient.get<{ data: CustodyOptions }>('/inventory/custody/options', opts),
    assets: (query: URLSearchParams, opts?: RequestOptions) => apiClient.get<CustodyPage<CustodyAsset>>(`/inventory/custody/assets?${query}`, opts),
    history: (query: URLSearchParams, opts?: RequestOptions) => apiClient.get<CustodyPage<InventoryTransferRecord>>(`/inventory/custody/transfers?${query}`, opts),
    uninstallation: (locationId: string, opts?: RequestOptions) => apiClient.get<{ data: UninstallationSnapshot & { pendingApprovalId: string | null } }>(`/inventory/custody/uninstallations/${locationId}`, opts),
    requestUninstallation: (locationId: string, input: UninstallationReviewInput, opts?: RequestOptions) => apiClient.post<{ data: { approvalRequestId: string; status: string; returned: number; lost: number } }>(`/inventory/custody/uninstallations/${locationId}`, input, opts),
    transfer: (input: InventoryTransferInput, opts?: RequestOptions) => apiClient.post<{ data: InventoryTransferRecord }>(`/inventory/custody/${input.kind === 'RETURN' ? 'returns' : 'transfers'}`, input, opts),
    updateLocation: (id: string, input: UpdateLocationInput, opts?: RequestOptions) => apiClient.put(`/locations/${id}`, input, opts),
};
