import { ACTIVE_STAGES, AUTO_PENDING_LABEL, CHRONOGRAM_PLANNING_STAGES, CHRONOGRAM_SERVICES, CHRONOGRAM_STAGES } from '../chronogram.constants';
import type { ChronogramAlert, ChronogramFilters, ChronogramRecord } from '../types/chronogram.types';
import { compareByDate, forecastInPeriod, inPeriod } from './chronogram-dates';

export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
/** Stateless adaptation of pass/openPens/needsUpdate from the supplied application. */
export function matchesFilters(record: ChronogramRecord, filters: ChronogramFilters) {
    if (filters.category !== 'all' && (filters.category === 'unknown' ? record.category !== null : record.category !== filters.category)) return false;
    if (filters.service !== 'all' && record.service !== filters.service) return false;
    if (filters.stage !== 'all' && (CHRONOGRAM_PLANNING_STAGES.includes(filters.stage) ? record.stage : record.operationalStatus) !== filters.stage) return false;
    if (filters.state !== 'all' && record.state !== filters.state) return false;
    const haystack = normalizeSearch([record.title, record.company, record.city, record.state, record.address, record.equipment.join(' '),
        record.technical?.format, record.people.join(' '), record.notes, record.marker, CHRONOGRAM_STAGES[record.stage].label,
        CHRONOGRAM_STAGES[record.operationalStatus].label, CHRONOGRAM_SERVICES[record.service]].join(' '));
    return !filters.search || haystack.includes(normalizeSearch(filters.search));
}
export const isActiveProject = (record: ChronogramRecord) => record.kind === 'project' && ACTIVE_STAGES.includes(record.stage) && ['PENDING', 'SCHEDULED', 'IN_PROGRESS'].includes(record.operationalStatus);
export const isPlanningProject = (record: ChronogramRecord) => isActiveProject(record) || record.kind === 'legacy' && ACTIVE_STAGES.includes(record.stage);
export const needsConfirmation = (record: ChronogramRecord, today: string) => record.operationalStatus === 'SCHEDULED' && !!record.start && (record.end || record.start) < today;
export function pendingRows(records: ChronogramRecord[], today: string): ChronogramAlert[] {
    return records.flatMap(record => {
        const manual: ChronogramAlert[] = record.pending.filter(pending => pending.open).map(pending => ({ id: `${record.id}:${pending.id}`, record,
            type: pending.type, responsible: pending.responsible, deadline: pending.deadline, detail: pending.detail, automatic: false }));
        if (needsConfirmation(record, today)) manual.push({ id: `${record.id}:confirmation`, record, type: AUTO_PENDING_LABEL,
            responsible: record.people.join(', '), deadline: record.end || record.start, detail: 'Confira o andamento no card antes de atualizar a realização.', automatic: true });
        return manual;
    }).sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999') || compareByDate(a.record, b.record));
}
export function agendaRecords(records: ChronogramRecord[], filters: ChronogramFilters) {
    return records.filter(record => matchesFilters(record, filters) && (inPeriod(record, filters.year, filters.month) || forecastInPeriod(record, filters.year, filters.month))).sort(compareByDate);
}
export function chronogramSummary(records: ChronogramRecord[], filters: ChronogramFilters, today: string) {
    const projects = records.filter(record => record.kind === 'project' && matchesFilters(record, filters));
    const completed = projects.filter(record => record.operationalStatus === 'DONE' && record.completedDate.startsWith(String(filters.year)));
    const planned = projects.filter(record => record.service === 'INSTALLATION' && record.operationalStatus === 'SCHEDULED' && record.start >= today);
    const active = projects.filter(isActiveProject);
    return { installations: completed.filter(record => record.service === 'INSTALLATION'), removals: completed.filter(record => record.service === 'REMOVAL'),
        upcoming: planned, active, pending: pendingRows(records.filter(record => matchesFilters(record, filters)), today),
        incompleteHistory: projects.filter(record => (record.operationalStatus === 'DONE' || record.stage === 'concluido') && !record.completionDateKnown).length,
        installationsInYear: projects.filter(record => record.service === 'INSTALLATION' && record.operationalStatus !== 'CANCELLED' && record.stage !== 'cancelado' && (record.start || record.forecast).startsWith(String(filters.year))).length,
        removalsInYear: projects.filter(record => record.service === 'REMOVAL' && record.operationalStatus !== 'CANCELLED' && record.stage !== 'cancelado' && (record.start || record.forecast).startsWith(String(filters.year))).length };
}
