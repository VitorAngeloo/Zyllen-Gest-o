"use client";
import { useQuery } from '@tanstack/react-query';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { PageHeader } from '@web/components/ui/page-header';
import { Button } from '@web/components/ui/button';
import { ListSectionHeader, EmptyState } from '@web/components/ui/workspace';
import { VehicleWorkspaceNav } from '../components/vehicle-workspace-nav';
import { vehicleApi, shouldRetryVehicleQuery } from '../api/vehicle-api';

export default function VehicleDashboardScreen() {
    const { user, isLoading } = useAuth(), options = useAuthedFetch();
    const manager = user?.type === 'internal' && ['Administrador', 'Gestor'].includes(user.role.name);
    const dashboard = useQuery({ queryKey: ['vehicles', 'manager-dashboard', user?.id], queryFn: ({ signal }) => vehicleApi.dashboard({ ...options, signal }), enabled: manager, refetchInterval: 30_000, retry: shouldRetryVehicleQuery });
    if (isLoading) return <p className="text-sm text-[var(--zyllen-muted)]">Carregando acesso…</p>;
    if (!manager) return <p className="text-sm text-[var(--zyllen-muted)]">O painel de carros é exclusivo para Administrador e Gestor.</p>;
    const data = dashboard.data;
    return <div className="space-y-8"><PageHeader eyebrow="Operação · Carros" title="Painel de carros" description="Situação atual da frota, calculada pelas retiradas e devoluções registradas. Indicadores adicionais serão definidos com a equipe." />
        <VehicleWorkspaceNav />
        {dashboard.isLoading && <p className="text-sm text-[var(--zyllen-muted)]">Carregando indicadores…</p>}
        {dashboard.isError && <div role="alert" className="border-l-2 border-red-400 bg-red-500/5 px-4 py-3 text-sm text-red-200">Não foi possível carregar o painel. <Button variant="ghost" size="sm" onClick={() => void dashboard.refetch()}>Tentar novamente</Button></div>}
        {data && <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
            ['Carros ativos', data.activeVehicles], ['Disponíveis agora', data.availableVehicles], ['Em uso agora', data.occupiedVehicles], ['Devoluções atrasadas', data.overdueVehicles],
        ].map(([label, value]) => <div key={label} className="border-l-2 border-[var(--zyllen-highlight)] bg-white/[0.03] px-4 py-5"><p className="text-xs text-[var(--zyllen-muted)]">{label}</p><p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-white">{value}</p></div>)}</div>
            <section className="space-y-3"><ListSectionHeader title="Carros em uso" count={data.current.length} description="Permanecem em uso mesmo depois do horário previsto, até a devolução." />{data.current.length ? <ul className="divide-y divide-white/10 border-y border-white/10">{data.current.map(booking => <li key={booking.id} className="flex flex-wrap justify-between gap-3 px-4 py-4"><div><p className="font-medium text-white">{booking.vehicle.name} · {booking.use?.driver.name}</p><p className="mt-1 text-xs text-[var(--zyllen-muted)]">{booking.title} · Devolução prevista: {new Date(booking.endDate).toLocaleString('pt-BR')}</p></div>{Date.parse(booking.endDate) < Date.now() && <span className="text-xs font-medium text-amber-200">Atrasado</span>}</li>)}</ul> : <EmptyState title="Nenhum carro em uso" description="Uma retirada registrada aparecerá aqui." />}</section>
        </>}
    </div>;
}
