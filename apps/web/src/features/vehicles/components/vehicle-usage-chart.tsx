"use client";
import type { VehicleDashboard } from '@zyllen/shared';
import { EmptyState, ListSectionHeader } from '@web/components/ui/workspace';

function Bars({ rows, unit, max }: { rows: { label: string; value: number; detail: string }[]; unit: string; max: number }) {
    return <div className="space-y-4" role="list">{rows.map(row => <div key={row.label} role="listitem" className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3 text-sm"><span className="truncate text-white" title={row.label}>{row.label}</span><span className="shrink-0 font-mono tabular-nums text-white">{row.value.toLocaleString('pt-BR')} {unit}</span></div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${row.label}: ${row.value.toLocaleString('pt-BR')} ${unit}; ${row.detail}`}><div className="h-full rounded-full bg-[var(--zyllen-highlight)]" style={{ width: `${row.value ? Math.max(4, row.value / max * 100) : 0}%` }} /></div>
        <p className="text-xs text-[var(--zyllen-muted)]">{row.detail}</p>
    </div>)}</div>;
}

export function VehicleUsageCharts({ data }: { data: VehicleDashboard }) {
    const cars = data.byVehicle.filter(row => row.completedTrips > 0);
    const sectors = data.bySector;
    return <div className="grid gap-5 xl:grid-cols-2">
        <section className="space-y-5 rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <ListSectionHeader title="Quilômetros por carro" description="Soma das retiradas deste mês que já tiveram devolução registrada." />
            {cars.length ? <Bars rows={cars.map(row => ({ label: row.name, value: row.km, detail: `${row.completedTrips} devolução(ões) · ${row.trips} retirada(s)` }))} unit="km" max={Math.max(...cars.map(row => row.km), 1)} /> : <EmptyState title="Sem quilômetros calculados" description="A distância aparece após registrar a primeira devolução do mês." />}
        </section>
        <section className="space-y-5 rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <ListSectionHeader title="Uso por setor" description="Número de retiradas no mês, conforme o setor atual do condutor." />
            {sectors.length ? <Bars rows={sectors.map(row => ({ label: row.name, value: row.trips, detail: `${row.km.toLocaleString('pt-BR')} km já concluídos` }))} unit="uso(s)" max={Math.max(...sectors.map(row => row.trips), 1)} /> : <EmptyState title="Nenhuma retirada no mês" description="O uso por setor aparecerá quando houver retiradas." />}
        </section>
    </div>;
}
