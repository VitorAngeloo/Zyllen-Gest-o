"use client";

import type { InternalDashboardTicket } from '@zyllen/shared';
import { CalendarDays, Car, Clock, FolderKanban, Headset } from 'lucide-react';
import { Badge } from '@web/components/ui/badge';
import { Button } from '@web/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import { PageHeader } from '@web/components/ui/page-header';
import { Skeleton } from '@web/components/ui/skeleton';
import { useAuth } from '@web/features/auth/context/auth-context';
import { PROJECT_SERVICE_COPY } from '@web/lib/brand-voice';
import { useInternalDashboard } from '../hooks/use-internal-dashboard';

const priority: Record<string, { label: string; variant: 'secondary' | 'warning' | 'destructive' }> = {
    LOW: { label: 'Baixa', variant: 'secondary' },
    MEDIUM: { label: 'Média', variant: 'warning' },
    HIGH: { label: 'Alta', variant: 'destructive' },
    CRITICAL: { label: 'Crítica', variant: 'destructive' },
};

function dateTime(value: string) {
    return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function TicketList({ title, icon: Icon, total, items, empty }: {
    title: string;
    icon: typeof Headset;
    total: number;
    items: InternalDashboardTicket[];
    empty: string;
}) {
    return <Card className="rounded-lg border-white/10 bg-white/[0.025]" data-internal-ticket-list={title}>
        <CardHeader className="px-4 pb-3 sm:px-5">
            <CardTitle className="flex items-center gap-2 text-base text-white"><Icon size={18} className="text-[var(--zyllen-highlight)]" />{title}<Badge variant="secondary">{total}</Badge></CardTitle>
            <p className="text-xs text-[var(--zyllen-muted)]">Somente chamados criados pela sua conta.</p>
        </CardHeader>
        <CardContent className="px-4 sm:px-5">
            {items.length ? <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                {items.map(item => {
                    const overdue = Date.now() - Date.parse(item.createdAt) >= 3_600_000;
                    const badge = priority[item.priority] ?? priority.MEDIUM;
                    return <article key={item.id} data-internal-ticket={item.id} className={`rounded-lg border bg-[var(--zyllen-bg-dark)] p-4 ${overdue ? 'border-red-400/60 motion-safe:animate-pulse' : 'border-white/10'}`}>
                        <div className="flex flex-wrap items-center gap-2"><Badge variant={badge.variant}>Prioridade {badge.label}</Badge>{overdue && <span className="text-xs font-semibold text-red-300">Aguardando há mais de 1 hora</span>}</div>
                        <h3 className="mt-2 break-words text-sm font-semibold text-white">{item.title}</h3>
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/75">{item.description}</p>
                        <div className="mt-3 border-t border-white/10 pt-3 text-xs text-[var(--zyllen-muted)]">
                            <p>Aberto em <span className="text-white/90">{dateTime(item.createdAt)}</span></p>
                            <p className="mt-1">Técnico: <span className="text-white/90">{item.assignedTo?.name ?? 'Aguardando atendimento'}</span></p>
                        </div>
                    </article>;
                })}
                {total > items.length && <p className="text-xs text-[var(--zyllen-muted)]">Mostrando {items.length} de {total}. O histórico completo permanece em Meus Chamados TI.</p>}
            </div> : <p className="py-8 text-center text-sm text-[var(--zyllen-muted)]">{empty}</p>}
        </CardContent>
    </Card>;
}

export default function InternalDashboardScreen() {
    const { user } = useAuth();
    const query = useInternalDashboard();
    const data = query.data;

    return <div className="space-y-8 pb-6" data-internal-dashboard>
        <PageHeader
            eyebrow="Minha visão"
            title={<>Olá, <span className="text-[var(--zyllen-highlight)]">{user?.name?.split(' ')[0]}</span></>}
            description="Acompanhe seus chamados, os projetos atuais e a agenda dos carros. Esta dashboard é somente para consulta."
        />

        {query.isError && <div role="alert" className="rounded-lg border border-red-400/40 bg-red-500/5 p-4 text-sm text-red-200">
            <p>Não foi possível atualizar sua dashboard.</p>
            <Button type="button" variant="ghost" size="sm" className="mt-2 text-white" onClick={() => { void query.refetch(); }}>Tentar novamente</Button>
        </div>}

        {query.isLoading ? <div role="status" aria-label="Carregando dashboard" className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-80 w-full" /><Skeleton className="h-80 w-full" /><Skeleton className="h-64 w-full lg:col-span-2" /></div> : data && <>
            <section aria-labelledby="internal-tickets-title" className="space-y-4">
                <div className="border-b border-white/10 pb-3"><h2 id="internal-tickets-title" className="text-xl font-semibold text-white">Meus chamados</h2><p className="mt-1 text-sm text-[var(--zyllen-muted)]">Abertos e em atendimento vinculados à sua conta.</p></div>
                <div className="grid items-start gap-5 lg:grid-cols-2">
                    <TicketList title="Chamados em aberto" icon={Headset} total={data.tickets.open.total} items={data.tickets.open.items} empty="Você não possui chamados em aberto." />
                    <TicketList title="Chamados em atendimento" icon={Clock} total={data.tickets.inProgress.total} items={data.tickets.inProgress.items} empty="Você não possui chamados em atendimento." />
                </div>
            </section>

            <section aria-labelledby="internal-projects-title" className="space-y-4 rounded-lg border border-white/10 bg-white/[0.025] p-4 sm:p-5" data-internal-projects>
                <header className="flex items-center gap-2 border-b border-white/10 pb-3"><FolderKanban size={19} className="text-[var(--zyllen-highlight)]" /><div><h2 id="internal-projects-title" className="text-lg font-semibold text-white">Projetos</h2><p className="text-xs text-[var(--zyllen-muted)]">Visão geral dos projetos atuais.</p></div></header>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[['Ativos', data.projects.current.active], ['Pendentes', data.projects.current.pending], ['Agendados', data.projects.current.scheduled], ['Em andamento', data.projects.current.inProgress]].map(([label, value]) => <div key={String(label)} className="border-l-2 border-white/15 py-1 pl-3"><p className="text-2xl font-semibold tabular-nums text-white">{value}</p><p className="mt-1 text-xs text-[var(--zyllen-muted)]">{label}</p></div>)}
                </div>
                {data.projects.highlights.length ? <ul className="grid gap-3 md:grid-cols-2">
                    {data.projects.highlights.map((item, index) => <li key={`${item.companyName}-${item.name}-${index}`} className="rounded-lg border border-white/10 bg-[var(--zyllen-bg-dark)] p-3">
                        <p className="text-sm font-semibold text-white">{item.name}</p><p className="mt-1 text-xs text-[var(--zyllen-muted)]">{item.companyName} · {PROJECT_SERVICE_COPY.types[item.type]} · {PROJECT_SERVICE_COPY.statuses[item.status]}</p>
                        {item.startDate && <p className="mt-2 text-xs text-white/70"><CalendarDays size={12} className="mr-1 inline" />{dateTime(item.startDate)}{item.endDate ? ` — ${dateTime(item.endDate)}` : ''}</p>}
                    </li>)}
                </ul> : <p className="py-4 text-sm text-[var(--zyllen-muted)]">Nenhum projeto pendente, agendado ou em andamento.</p>}
            </section>

            <section aria-labelledby="internal-vehicles-title" className="space-y-4 rounded-lg border border-white/10 bg-white/[0.025] p-4 sm:p-5" data-internal-vehicles>
                <header className="flex items-center gap-2 border-b border-white/10 pb-3"><Car size={19} className="text-[var(--zyllen-highlight)]" /><div><h2 id="internal-vehicles-title" className="text-lg font-semibold text-white">Agenda dos carros</h2><p className="text-xs text-[var(--zyllen-muted)]">Situação atual e próximas reservas.</p></div></header>
                <div className="grid grid-cols-3 gap-3"><div><p className="text-2xl font-semibold text-white">{data.vehicles.active}</p><p className="text-xs text-[var(--zyllen-muted)]">Ativos</p></div><div><p className="text-2xl font-semibold text-emerald-300">{data.vehicles.available}</p><p className="text-xs text-[var(--zyllen-muted)]">Disponíveis agora</p></div><div><p className="text-2xl font-semibold text-amber-300">{data.vehicles.occupied}</p><p className="text-xs text-[var(--zyllen-muted)]">Em uso agora</p></div></div>
                <div className="grid items-start gap-5 lg:grid-cols-2">
                    <div><h3 className="mb-2 text-sm font-medium text-white">Em uso neste momento</h3>{data.vehicles.current.length ? <ul className="space-y-2">{data.vehicles.current.map(item => <li key={item.id} className="rounded-lg border border-amber-400/20 bg-amber-500/5 p-3"><p className="text-sm font-medium text-white">{item.vehicleName} · {item.title}</p><p className="mt-1 text-xs text-[var(--zyllen-muted)]">{item.responsibleName} · devolução {dateTime(item.endDate)}</p></li>)}</ul> : <p className="text-sm text-[var(--zyllen-muted)]">Nenhum carro em uso agora.</p>}</div>
                    <div><h3 className="mb-2 text-sm font-medium text-white">Próximas reservas</h3>{data.vehicles.upcoming.length ? <ul className="space-y-2">{data.vehicles.upcoming.map(item => <li key={item.id} className="rounded-lg border border-white/10 bg-[var(--zyllen-bg-dark)] p-3"><p className="text-sm font-medium text-white">{item.vehicleName} · {item.title}</p><p className="mt-1 text-xs text-[var(--zyllen-muted)]">{item.responsibleName} · {dateTime(item.startDate)} até {dateTime(item.endDate)}</p></li>)}</ul> : <p className="text-sm text-[var(--zyllen-muted)]">Nenhuma reserva futura cadastrada.</p>}</div>
                </div>
            </section>
        </>}
    </div>;
}
