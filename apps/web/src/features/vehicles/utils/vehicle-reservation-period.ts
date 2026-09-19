export function reservationDateText(isoDate: string) {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
}

export function normalizeReservationDate(value: string) {
    const text = value.trim();
    return /^\d{8}$/.test(text) ? `${text.slice(0, 2)}/${text.slice(2, 4)}/${text.slice(4)}` : text;
}

export function normalizeReservationTime(value: string) {
    const text = value.trim();
    return /^\d{4}$/.test(text) ? `${text.slice(0, 2)}:${text.slice(2)}` : text;
}

export function reservationDateIso(value: string): string | undefined {
    const text = normalizeReservationDate(value);
    if (!reservationInstant(text, '12:00')) return undefined;
    return text.split('/').reverse().join('-');
}

export function reservationInstant(dateText: string, timeText: string): string | undefined {
    const date = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalizeReservationDate(dateText));
    const time = /^(\d{2}):(\d{2})$/.exec(normalizeReservationTime(timeText));
    if (!date || !time) return undefined;
    const [, day, month, year] = date, [, hour, minute] = time;
    const value = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    // Date can normalize impossible dates or local times; do not silently change a reservation.
    if (!Number.isFinite(value.getTime()) || value.getFullYear() !== Number(year)
        || value.getMonth() + 1 !== Number(month) || value.getDate() !== Number(day)
        || value.getHours() !== Number(hour) || value.getMinutes() !== Number(minute)) return undefined;
    return value.toISOString();
}
