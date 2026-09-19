export type DatePeriodPreset = 'TODAY' | '7_DAYS' | '30_DAYS' | 'CUSTOM';

export function localCalendarDate(now: number): string {
    const date = new Date(now);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localMidnight(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return localCalendarDate(date.getTime()) === value ? date : null;
}

// Local calendar days become UTC instants with an inclusive start and exclusive end.
export function datePeriod(preset: DatePeriodPreset, today: string, from: string, to: string) {
    const start = localMidnight(preset === 'CUSTOM' ? from : today);
    const end = localMidnight(preset === 'CUSTOM' ? to : today);
    if (!start || !end) return null;
    if (preset !== 'CUSTOM') start.setDate(start.getDate() - (preset === '30_DAYS' ? 29 : preset === '7_DAYS' ? 6 : 0));
    end.setDate(end.getDate() + 1);
    const duration = end.getTime() - start.getTime();
    if (duration <= 0 || duration > 366 * 86_400_000) return null;
    return { start: start.toISOString(), end: end.toISOString() };
}
