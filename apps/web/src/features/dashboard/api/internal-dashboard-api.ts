import type { InternalDashboardData } from '@zyllen/shared';
import { apiClient, type RequestOptions } from '@web/lib/api-client';

export const internalDashboardApi = {
    async get(options: RequestOptions) {
        return (await apiClient.get<{ data: InternalDashboardData }>('/internal-dashboard', options)).data;
    },
};
