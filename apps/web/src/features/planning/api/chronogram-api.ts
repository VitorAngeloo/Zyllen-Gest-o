import { projectServiceApi } from '@web/features/project-services/api/project-service-api';
import type { RequestOptions } from '@web/lib/api-client';
import type { ProjectServiceRecord } from '@zyllen/shared';

export async function loadChronogramProjects(options: RequestOptions) {
    const records = new Map<string, ProjectServiceRecord>();
    let page = 1;
    let received = 0;
    let total = 0;
    do {
        const response = await projectServiceApi.list(new URLSearchParams({ page: String(page), limit: '100' }), options);
        const previousSize = records.size;
        response.data.forEach(record => records.set(record.id, record));
        received += response.data.length;
        total = response.total;
        if (received < total && records.size === previousSize) throw new Error('A lista de projetos mudou durante a consulta. Atualize para tentar novamente.');
        page++;
    } while (received < total);
    if (records.size < total) throw new Error('A lista de projetos mudou durante a consulta. Atualize para tentar novamente.');
    return [...records.values()];
}
