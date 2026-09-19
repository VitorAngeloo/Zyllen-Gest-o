import { randomInt } from 'crypto';

export function generateOsNumber(): string {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = String(randomInt(0, 10_000)).padStart(4, '0');
    return `OS-${ym}-${rand}`;
}
