const normalizeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export function selectableExitReason(name: string) {
    return !['perda', 'uso'].includes(normalizeName(name));
}

export function stockEntryLocation(location: { kind: string | null; name: string }) {
    return location.kind === 'INTERNAL' && !['baixa', 'manutencao', 'outros'].includes(normalizeName(location.name));
}
