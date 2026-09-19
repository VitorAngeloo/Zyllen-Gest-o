import type { StructureCycleRecord, StructureInput, StructureRecord } from '@zyllen/shared';
import { apiClient, type RequestOptions } from '@web/lib/api-client';
interface Page<T> { data: T[]; total: number; page: number; limit: number }
export const structureApi = {
    list(query: URLSearchParams, options: RequestOptions) { return apiClient.get<Page<StructureRecord>>(`/structures?${query}`, options); },
    async all(companyId: string, options: RequestOptions) {
        const rows = new Map<string, StructureRecord>();
        for (let page = 1; ; page++) {
            const response = await this.list(new URLSearchParams({ companyId, page: String(page), limit: '100' }), options);
            response.data.forEach(row => rows.set(row.id, row));
            if (page * 100 >= response.total || response.data.length === 0) return [...rows.values()];
        }
    },
    async create(input: StructureInput, options: RequestOptions) { return (await apiClient.post<{ data: StructureRecord }>('/structures', input, options)).data; },
    cycles(id: string, page: number, options: RequestOptions) { return apiClient.get<Page<StructureCycleRecord>>(`/structures/${encodeURIComponent(id)}/cycles?page=${page}&limit=20`, options); },
    async available(id: string, options: RequestOptions) { return (await apiClient.get<{ data: StructureCycleRecord | null }>(`/structures/${encodeURIComponent(id)}/available-cycle`, options)).data; },
};
