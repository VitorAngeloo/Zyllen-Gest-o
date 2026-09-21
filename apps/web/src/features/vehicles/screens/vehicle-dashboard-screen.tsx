"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { PageHeader } from '@web/components/ui/page-header';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { ListSectionHeader, EmptyState } from '@web/components/ui/workspace';
import { VehicleWorkspaceNav } from '../components/vehicle-workspace-nav';
import { VehicleUsageCharts } from '../components/vehicle-usage-chart';
import { VehicleJourneyTable } from '../components/vehicle-journey-table';
import { vehicleApi, shouldRetryVehicleQuery } from '../api/vehicle-api';

const currentMonth = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).slice(0, 7);

export default function VehicleDashboardScreen() {
    const { user, isLoading } = useAuth(), options = useAuthedFetch();
    const manager = user?.type === 'internal' && ['Administrador', 'Gestor'].includes(user.role.name);
    const [month, setMonth] = useState(currentMonth);
    const [page, setPage] = useState(1);
    const dashboard = useQuery({ queryKey: ['vehicles', 'manager-dashboard', user?.id, month, page], queryFn: ({ signal }) => vehicleApi.dashboard({ month, page, limit: 20 }, { ...options, signal }), enabled: manager, refetchInterval: 30_000, retry: shouldRetryVehicleQuery });
    if (isLoading) return <p className="text-sm text-[var(--zyllen-muted)]">Carregando acesso…</p>;
    if (!manager) return <p className="text-sm text-[var(--zyllen-muted)]">O painel de carros é exclusivo para Administrador e Gestor.</p>;
    const data = dashboard.data;
    return <div className="space-y-8"><PageHeader eyebrow="Operação · Carros" title="Painel de carros" description="Acompanhe o uso da frota e confira cada retirada e devolução registrada." />
        <VehicleWorkspaceNav />
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <div><h2 className="text-lg font-semibold text-white">Uso da frota</h2><p className="mt-1 text-sm text-[var(--zyllen-muted)]">Indicadores por mês da retirada. A distância entra no total após a devolução.</p></div>
            <label className="space-y-1 text-sm text-white">Mês <Input type="month" value={month} min="2020-01" max="2099-12" onChange={event => { if (event.target.value) { setMonth(event.target.value); setPage(1); } }} className="min-w-44" /></label>
        </div>
        {dashboard.isLoading && <p role="status" className="text-sm text-[var(--zyllen-muted)]">Carregando indicadores…</p>}
        {dashboard.isError && <div role="alert" className="border-l-2 border-red-400 bg-red-500/5 px-4 py-3 text-sm text-red-200">Não foi possível carregar o painel. <Button variant="ghost" size="sm" onClick={() => void dashboard.refetch()}>Tentar novamente</Button></div>}
        {data && <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
                ['Retiradas no mês', data.total, 'Todas as saídas registradas'],
                ['Km percorridos', `${data.totalKm.toLocaleString('pt-BR')} km`, `${data.completedTrips} devolução(ões) com hodômetro`],
                ['Devoluções atrasadas', data.lateReturns, 'Entre os usos iniciados no mês'],
                ['Carros em uso agora', data.occupiedVehicles, `${data.availableVehicles} disponível(is) agora`],
            ].map(([label, value, description]) => <div key={label} className="rounded-xl border border-white/10 bg-white/[0.035] p-5"><p className="text-sm text-[var(--zyllen-muted)]">{label}</p><p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-white">{value}</p><p className="mt-2 text-xs text-[var(--zyllen-muted)]">{description}</p></div>)}</div>
            <VehicleUsageCharts data={data} />
            <section className="space-y-3"><ListSectionHeader title="Em uso agora" count={data.current.length} description="O carro continua em uso até a devolução ser registrada." />{data.current.length ? <ul className="grid gap-3 md:grid-cols-2">{data.current.map(booking => <li key={booking.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-4"><p className="font-medium text-white">{booking.vehicle.name} · {booking.use?.driver.name}</p><p className="mt-1 text-sm text-[var(--zyllen-muted)]">{booking.title} · Previsto: {new Date(booking.endDate).toLocaleString('pt-BR')}</p>{Date.parse(booking.endDate) < Date.now() && <p className="mt-2 text-sm font-medium text-amber-200">Devolução atrasada</p>}</li>)}</ul> : <EmptyState title="Nenhum carro em uso" description="Uma retirada registrada aparecerá aqui." />}</section>
            <VehicleJourneyTable data={data} onPageChange={setPage} />
        </>}
    </div>;
}
