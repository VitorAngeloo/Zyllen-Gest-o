import type { ChronogramRecord } from '../types/chronogram.types';

// Presentation only: never persisted as project colors or used to create links.
const CALENDAR_COLORS = ['#5B8DEF', '#AC83E8', '#E6A04B', '#45B8AC', '#E8789A', '#77AD60', '#DC8060', '#62AFD3', '#CC90CF', '#C5AD4C', '#888DE0', '#54AF8D'];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();

export function chronogramCalendarColor(record: ChronogramRecord): string {
    // The ZIP has no project IDs. Matching labels share a visual accent only.
    const key = record.calendarGroup || (record.kind === 'legacy' && record.title.trim()
        ? `legacy:${JSON.stringify([normalize(record.title), normalize(record.city), normalize(record.state)])}` : record.id);
    let hash = 2166136261;
    for (let index = 0; index < key.length; index++) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
    return CALENDAR_COLORS[(hash >>> 0) % CALENDAR_COLORS.length];
}
