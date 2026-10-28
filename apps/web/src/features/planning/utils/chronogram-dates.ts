import type { ChronogramFilters, ChronogramMonth, ChronogramRecord } from '../types/chronogram.types';

export const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function localDay(value: string | null | undefined): string {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? dayKey(date) : '';
}
export function parseLocalDay(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day || 1);
}
/** API intervals have an exclusive end; source date-only ranges remain inclusive. */
export function intervalLastDay(end: string, start: string) {
    const endTime = Date.parse(end), startTime = Date.parse(start);
    return Number.isFinite(endTime) && endTime > startTime ? localDay(new Date(endTime - 1).toISOString()) : localDay(end);
}
export function displayDay(value: string) {
    if (!value) return 'Sem data definida';
    return parseLocalDay(value).toLocaleDateString('pt-BR', value.length === 7 ? { month: 'long', year: 'numeric' } : { day: '2-digit', month: '2-digit', year: 'numeric' });
}
/** Period and forecast selection ported from the supplied src/dominio/regras.ts. */
export function inPeriod(record: ChronogramRecord, year: number, month: ChronogramMonth) {
    if (!record.start) return false;
    const start = dayKey(new Date(year, month === 'all' ? 0 : month, 1));
    const end = dayKey(new Date(year, month === 'all' ? 12 : month + 1, 0));
    return record.start <= end && (record.end || record.start) >= start;
}
export function forecastInPeriod(record: ChronogramRecord, year: number, month: ChronogramMonth) {
    if (record.start || !record.forecast) return false;
    return record.forecast.startsWith(month === 'all' ? String(year) : `${year}-${String(month + 1).padStart(2, '0')}`);
}
export function calendarDays(year: number, month: number) {
    const first = new Date(year, month, 1);
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: Math.ceil((first.getDay() + count) / 7) * 7 }, (_, index) => new Date(year, month, 1 - first.getDay() + index));
}
export function defaultFilters(now: Date): ChronogramFilters {
    return { year: now.getFullYear(), month: now.getMonth(), category: 'all', service: 'all', stage: 'all', state: 'all', search: '' };
}
export const compareByDate = (a: ChronogramRecord, b: ChronogramRecord) =>
    (a.start || a.forecast || '9999').localeCompare(b.start || b.forecast || '9999') || a.company.localeCompare(b.company, 'pt-BR') || a.id.localeCompare(b.id);
