import { PROJECT_SERVICE_STATUSES, type ProjectLegacyRecord, type ProjectServiceRecord, type ProjectServiceStatus } from '@zyllen/shared';
import type { Schedule } from '@web/features/schedule/types/schedule.types';
import { CHRONOGRAM_SERVICES, CHRONOGRAM_STAGES } from '../chronogram.constants';
import type { ChronogramRecord, ChronogramService, ChronogramStage } from '../types/chronogram.types';
import { intervalLastDay, localDay } from './chronogram-dates';

function baseRecord(): Omit<ChronogramRecord, 'id' | 'sourceId' | 'kind' | 'title'> {
    return { company: '', city: '', state: '', address: '', service: 'OTHER', stage: 'UNKNOWN', operationalStatus: 'UNKNOWN', category: null,
        start: '', end: '', forecast: '', originalDate: '', completedDate: '', completionDateKnown: false,
        equipment: [], technical: null, people: [], notes: '', color: '#ABFF10', marker: '', mapsUrl: '', pending: [], annotations: [], collaborationAvailable: false, actionsAvailable: false, planning: null };
}
const stageOf = (value: string): ChronogramStage => Object.hasOwn(CHRONOGRAM_STAGES, value) ? value as ChronogramStage : 'UNKNOWN';
const serviceOf = (value: string): ChronogramService => Object.hasOwn(CHRONOGRAM_SERVICES, value) ? value as ChronogramService : 'OTHER';
const operationalStatusOf = (value: string): ChronogramRecord['operationalStatus'] => PROJECT_SERVICE_STATUSES.includes(value as ProjectServiceStatus) ? value as ProjectServiceStatus : 'UNKNOWN';

/** Only explicit API fields are adapted. Names/markers/notes never infer technical data or stages. */
export function projectToChronogram(record: ProjectServiceRecord): ChronogramRecord {
    return { ...baseRecord(), id: `project:${record.id}`, sourceId: record.id, kind: 'project', title: record.name,
        company: record.company.name, city: record.city ?? '', state: record.state ?? '', address: record.address ?? '',
        service: serviceOf(record.type), stage: stageOf(record.planning?.stage ?? record.status), operationalStatus: operationalStatusOf(record.status),
        forecast: record.planning?.forecast ?? '', start: localDay(record.schedule?.startDate), end: record.schedule ? intervalLastDay(record.schedule.endDate, record.schedule.startDate) : '',
        completedDate: localDay(record.completedAt), completionDateKnown: !!localDay(record.completedAt),
        people: [...record.internalAssignees.map(person => person.name), ...record.contractors.map(person => person.name)],
        category: record.specifications?.category ?? null, equipment: record.specifications?.equipment ?? [], technical: record.specifications?.room ?? null,
        pending: (record.pending ?? []).map(item => ({ id: item.id, type: item.type, responsible: item.responsible, deadline: item.deadline ?? '', detail: item.detail,
            open: !item.resolvedAt, resolvedAt: item.resolvedAt ?? '', resolvedBy: item.resolvedBy?.name ?? '', version: item.version, createdAt: item.createdAt, createdBy: item.createdBy.name })),
        annotations: (record.annotations ?? []).map(item => ({ id: item.id, date: item.createdAt, author: item.author.name, text: item.text })),
        collaborationAvailable: Array.isArray(record.pending) && Array.isArray(record.annotations),
        originalDate: localDay(record.originalScheduledStartAt), actionsAvailable: record.actionsAvailable === true, planning: record.planning ?? null,
        notes: record.notes ?? '', color: record.color, marker: record.marker?.name ?? '', mapsUrl: record.mapsUrl ?? '' };
}
export function scheduleToChronogram(record: Schedule): ChronogramRecord {
    return { ...baseRecord(), id: `${record.trip ? 'trip' : 'schedule'}:${record.trip?.id ?? record.id}`,
        sourceId: record.trip?.id ?? record.id, kind: record.trip ? 'trip' : 'schedule', title: record.title,
        company: record.companyName ?? '', address: record.address ?? '', service: record.trip ? 'TRIP' : serviceOf(record.type), stage: stageOf(record.status),
        operationalStatus: operationalStatusOf(record.status),
        start: localDay(record.startDate), end: intervalLastDay(record.endDate, record.startDate), notes: record.notes ?? '',
        people: [...record.installers.map(person => person.name), ...(record.trip?.contractors?.map(person => person.name) ?? [])] };
}
export function combineChronogram(projects: ProjectServiceRecord[], schedules: Schedule[]) {
    const scheduledProjects = new Set(projects.flatMap(project => project.schedule ? [project.schedule.id] : []));
    const records = projects.map(projectToChronogram);
    for (const schedule of schedules) {
        if (schedule.projectService || scheduledProjects.has(schedule.id)) continue;
        records.push(scheduleToChronogram(schedule));
    }
    return records;
}

export function legacyToChronogram(record: ProjectLegacyRecord): ChronogramRecord {
    const location = record.location.match(/^(.*?)\s*[/,-]\s*([A-Z]{2})$/);
    return { ...baseRecord(), id: `legacy:${record.id}`, sourceId: record.id, kind: 'legacy', title: record.name,
        company: '', city: location?.[1]?.trim() ?? record.location, state: location?.[2] ?? '', service: serviceOf(record.service ?? ''),
        stage: stageOf(record.planning.stage ?? 'UNKNOWN'), operationalStatus: 'UNKNOWN', forecast: record.planning.forecast ?? '',
        start: record.start ?? '', end: record.end ?? '', originalDate: record.original ?? '',
        category: record.specifications.category, equipment: record.specifications.equipment, technical: record.specifications.room,
        notes: record.notes, people: record.technician ? [record.technician] : [],
        pending: record.pending.map(item => ({ id: item.sourceId, type: item.type, responsible: item.responsible, deadline: item.deadline ?? '', detail: item.detail,
            open: item.open, resolvedAt: item.resolvedAt, resolvedBy: item.resolvedBy, createdAt: item.createdAt || undefined, createdBy: item.createdBy || undefined })),
        annotations: record.annotations.map(item => ({ id: item.sourceId, date: item.date, author: item.author, text: item.text })),
        legacySource: { ...record.source, sourceId: record.sourceId } };
}
