"use client";
import type { VehicleDashboard } from '@zyllen/shared';
import { AlertTriangle, Wrench } from 'lucide-react';
import { Badge } from '@web/components/ui/badge';
import { Button } from '@web/components/ui/button';
import { EmptyState, ListSectionHeader } from '@web/components/ui/workspace';

type VehicleUsage = VehicleDashboard['byVehicle'][number];

function SectorBars({ rows }: { rows: VehicleDashboard['bySector'] }) {
    const max = Math.max(...rows.map(row => row.trips), 1);
    return <div className="space-y-4" role="list">{rows.map(row => {
        const leading = row.trips === max;
        const percentage = row.trips ? row.trips / max * 100 : 0;
        return <div key={row.name} role="listitem" className="space-y-1.5">
        <div className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2"><span className="truncate text-white" title={row.name}>{row.name}</span>{leading && <Badge variant="success">Líder</Badge>}</span><span className="shrink-0 font-mono tabular-nums text-white">{row.trips} uso(s)</span></div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${row.name}: ${row.trips} uso(s)`} aria-valuemin={0} aria-valuemax={max} aria-valuenow={row.trips}><div data-sector-leading={leading || undefined} className={`h-full rounded-full bg-[var(--zyllen-highlight)] transition-[width] ${leading ? 'shadow-[0_0_14px_rgba(174,255,0,0.45)]' : 'opacity-65'}`} style={{ width: `${percentage}%` }} /></div>
        <p className="text-xs text-[var(--zyllen-muted)]">{row.km.toLocaleString('pt-BR')} km concluídos no mês</p>
    </div>;})}</div>;
}

function ServiceCard({ vehicle, fallbackOdometer, onService }: { vehicle: VehicleUsage; fallbackOdometer: number | null; onService: (vehicle: VehicleUsage) => void }) {
    const maintenanceAvailable = Number.isFinite(vehicle.serviceIntervalKm) && Number.isFinite(vehicle.serviceProgress);
    const serviceIntervalKm = maintenanceAvailable ? vehicle.serviceIntervalKm : 5_000;
    const kmSinceService = typeof vehicle.kmSinceService === 'number' && Number.isFinite(vehicle.kmSinceService) ? vehicle.kmSinceService : vehicle.km;
    const progress = maintenanceAvailable ? Math.max(0, Math.min(100, vehicle.serviceProgress)) : Math.min(100, kmSinceService / serviceIntervalKm * 100);
    const currentOdometer = typeof vehicle.currentOdometer === 'number' && Number.isFinite(vehicle.currentOdometer) ? vehicle.currentOdometer : fallbackOdometer;
    const distanceTitle = maintenanceAvailable && vehicle.serviceDistanceSource === 'SERVICE' ? 'Desde a última revisão' : maintenanceAvailable ? 'Desde o primeiro uso registrado' : 'Percorrido no mês selecionado';
    const alertActive = !!vehicle.serviceAlertUntil;
    return <li className={`rounded-xl border p-4 ${alertActive ? 'border-red-400/35 bg-red-500/[0.045]' : vehicle.serviceDue ? 'border-amber-300/25 bg-amber-400/[0.035]' : 'border-white/10 bg-white/[0.02]'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{vehicle.name}</h3><p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/45">Hodômetro atual</p><p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white">{currentOdometer === null ? 'Sem leitura' : `${currentOdometer.toLocaleString('pt-BR')} km`}</p></div>
            {alertActive ? <Badge variant="destructive"><AlertTriangle className="mr-1 size-3" /> Parar para revisão</Badge> : vehicle.serviceDue ? <Badge variant="warning"><AlertTriangle className="mr-1 size-3" /> Revisão necessária</Badge> : <Badge variant="secondary">Em acompanhamento</Badge>}
        </div>
        <div className="mt-5 space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2 text-sm"><span className="text-white">{distanceTitle}</span><strong className="font-mono tabular-nums text-white">{kmSinceService.toLocaleString('pt-BR')} km</strong></div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`Progresso para revisão de ${vehicle.name}`} aria-valuemin={0} aria-valuemax={serviceIntervalKm} aria-valuenow={Math.min(kmSinceService ?? 0, serviceIntervalKm)}><div className={`h-full rounded-full transition-[width] ${vehicle.serviceDue ? 'bg-amber-300' : 'bg-[var(--zyllen-highlight)]'}`} style={{ width: `${progress}%` }} /></div>
            <div className="flex justify-between gap-3 text-xs text-[var(--zyllen-muted)]"><span>{!maintenanceAvailable ? 'Quilometragem calculada pelas retiradas e devoluções do mês selecionado.' : vehicle.serviceDistanceSource === 'TRACKED_USAGE' ? 'Contagem inicial pelos percursos registrados; a próxima revisão inicia o ciclo oficial.' : vehicle.serviceDistanceSource === 'NONE' ? 'A contagem começa na primeira retirada registrada.' : `Revisão a cada ${serviceIntervalKm.toLocaleString('pt-BR')} km`}</span><span className="shrink-0">{Math.round(progress)}%</span></div>
            {alertActive && <p role="alert" className="text-xs font-medium text-red-200">O limite foi atingido. Este alerta destacado permanece por 24 horas; a pendência continua até registrar a revisão.</p>}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><p className="text-xs text-[var(--zyllen-muted)]">Neste mês: {vehicle.km.toLocaleString('pt-BR')} km · {vehicle.trips} retirada(s)</p>{maintenanceAvailable && <Button type="button" size="sm" variant="outline" onClick={() => onService(vehicle)}><Wrench /> Registrar revisão</Button>}</div>
    </li>;
}

export function VehicleUsageCharts({ data, onService }: { data: VehicleDashboard; onService: (vehicle: VehicleUsage) => void }) {
    const latestOdometers = new Map<string, number>();
    for (const journey of data.journeys) {
        const use = journey.use;
        if (use && !latestOdometers.has(journey.vehicle.id)) latestOdometers.set(journey.vehicle.id, use.returnedAt && use.odometerIn !== null ? use.odometerIn : use.odometerOut);
    }
    return <div className="space-y-5">
        <section className="space-y-5 rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <ListSectionHeader title="Hodômetro e revisões" description="A barra usa os quilômetros comprovados pelas retiradas e, após uma revisão registrada, acompanha o ciclo oficial de 5.000 km." />
            {data.byVehicle.length ? <ul className="grid gap-4 lg:grid-cols-2">{data.byVehicle.map(vehicle => <ServiceCard key={vehicle.id} vehicle={vehicle} fallbackOdometer={latestOdometers.get(vehicle.id) ?? null} onService={onService} />)}</ul> : <EmptyState title="Nenhum carro ativo" description="Cadastre ou ative um carro para acompanhar o hodômetro." />}
        </section>
        <section className="space-y-5 rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <ListSectionHeader title="Uso por setor" description="O setor com mais retiradas ocupa 100% da barra; os demais aparecem proporcionalmente." />
            {data.bySector.length ? <SectorBars rows={data.bySector} /> : <EmptyState title="Nenhuma retirada no mês" description="O uso por setor aparecerá quando houver retiradas." />}
        </section>
    </div>;
}
