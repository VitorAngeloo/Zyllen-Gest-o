import type { ProjectServiceInput, ProjectServiceRecord } from '@zyllen/shared';
import { localDateTime as projectServiceLocalTime } from '@web/lib/date-time';
export { localDateTime as projectServiceLocalTime } from '@web/lib/date-time';

export type ProjectServiceFormValues = Omit<ProjectServiceInput, 'startDate' | 'endDate'> & { startDate: string; endDate: string };

export function projectServiceFormValues(record?: ProjectServiceRecord): ProjectServiceFormValues {
    return {
        companyId: record?.company.id ?? '', projectId: record?.projectId, name: record?.name ?? '', type: record?.type ?? 'INSTALLATION',
        structureId: record?.structureCycle?.structureId ?? null, removalCycleId: record?.type === 'REMOVAL' ? record.structureCycle?.id ?? null : null,
        markerId: record?.marker?.id ?? null, urgency: record?.urgency ?? 0, color: record?.color ?? '#ABFF10',
        address: record?.address ?? '', city: record?.city ?? '', state: record?.state ?? '', mapsUrl: record?.mapsUrl ?? '', notes: record?.notes ?? '',
        sectors: record?.sectors ?? [], installerIds: record?.internalAssignees.map(user => user.id) ?? [], contractorIds: record?.contractors.map(user => user.id) ?? [],
        requiresTravel: record?.requiresTravel ?? false, relevant: record?.relevant ?? false, allowConflicts: false,
        startDate: projectServiceLocalTime(record?.schedule?.startDate), endDate: projectServiceLocalTime(record?.schedule?.endDate),
    };
}
