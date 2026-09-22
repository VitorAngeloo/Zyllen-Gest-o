const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export function internalExitDestination(reason: string) {
    const motive = normalize(reason.split(' — ')[0]);
    if (motive === 'manutencao') return { locationName: 'Manutenção', status: 'EM_MANUTENCAO', referenceType: 'INTERNAL_MAINTENANCE' } as const;
    if (motive === 'baixa') return { locationName: 'Baixa', status: 'BAIXADO', referenceType: 'STOCK_WRITE_OFF' } as const;
    if (motive === 'uso interno') return { locationName: 'Uso interno - Skyline', status: 'EM_USO', referenceType: 'INTERNAL_USE' } as const;
    return null;
}
