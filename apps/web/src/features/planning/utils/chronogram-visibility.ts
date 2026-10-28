import type { ChronogramRecord } from '../types/chronogram.types';

/** Presentation scope only. These service IDs remain available to the other modules. */
export const hiddenPlanningServiceIds: ReadonlySet<string> = new Set(
    (process.env.NEXT_PUBLIC_PLANNING_HIDDEN_SERVICE_IDS ?? '').split(',').map(id => id.trim()).filter(Boolean),
);

export function visibleChronogramRecords(records: ChronogramRecord[], hiddenIds = hiddenPlanningServiceIds) {
    return records.filter(record => record.kind !== 'project' || !hiddenIds.has(record.sourceId));
}
