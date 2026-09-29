"use client";

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VehicleReservationRecord } from '@zyllen/shared';
import { Check, Clock3, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { PageHeader } from '@web/components/ui/page-header';
import { Badge } from '@web/components/ui/badge';
import { Button } from '@web/components/ui/button';
import { Textarea } from '@web/components/ui/textarea';
import { EmptyState, ListSectionHeader } from '@web/components/ui/workspace';
import { VehicleWorkspaceNav } from '../components/vehicle-workspace-nav';
import { isVehicleServiceUnavailable, vehicleApi, shouldRetryVehicleQuery } from '../api/vehicle-api';

const dateTime = (value: string) => new Date(value).toLocaleString('pt-BR');

function RequestSummary({ request }: { request: VehicleReservationRecord }) {
    return <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-white">{request.vehicle.name}</h3>{request.vehicle.plate && <span className="font-mono text-xs text-white/55">{request.vehicle.plate}</span>}</div>
        <p className="text-sm text-white/80">{request.title}</p>
        <p className="text-sm text-[var(--zyllen-muted)]">Responsável: {request.responsible.name}</p>
        <p className="flex items-start gap-2 text-xs tabular-nums text-[var(--zyllen-muted)]"><Clock3 className="mt-0.5 size-3.5 shrink-0" /> <span>{dateTime(request.startDate)} até {dateTime(request.endDate)}</span></p>
        {request.notes && <p className="whitespace-pre-wrap text-xs text-[var(--zyllen-muted)]">{request.notes}</p>}
    </div>;
}

export default function VehicleApprovalsScreen() {
    const { user, isLoading } = useAuth();
    const options = useAuthedFetch(), client = useQueryClient();
    const manager = user?.type === 'internal' && ['Administrador', 'Gestor'].includes(user.role.name);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const queue = useQuery({ queryKey: ['vehicles', 'approval-requests', user?.id], queryFn: ({ signal }) => vehicleApi.approvalRequests({ ...options, signal }), enabled: manager, refetchInterval: 30_000, retry: shouldRetryVehicleQuery });
    const review = useMutation({ mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) => action === 'approve' ? vehicleApi.approveReservation(id, options) : vehicleApi.rejectReservation(id, { reason: reason! }, options),
        onSuccess: reservation => {
            toast.success(reservation.approvalStatus === 'APPROVED' ? 'Solicitação autorizada. A retirada foi liberada.' : 'Solicitação negada.');
            setRejectingId(null); setReason(''); void client.invalidateQueries({ queryKey: ['vehicles'] });
        }, onError: (error: Error) => toast.error(error.message) });
    if (isLoading) return <p className="text-sm text-[var(--zyllen-muted)]">Carregando acesso…</p>;
    if (!manager) return <p className="text-sm text-[var(--zyllen-muted)]">As autorizações de carros são exclusivas para Administrador e Gestor.</p>;
    const pending = queue.data?.pending ?? [], recent = queue.data?.recent ?? [];
    return <div className="space-y-8">
        <PageHeader eyebrow="Operação · Carros" title="Autorizações" description="Confira carro, responsável e horário. A retirada só é liberada depois da autorização." />
        <VehicleWorkspaceNav />
        {queue.isError && (isVehicleServiceUnavailable(queue.error)
            ? <EmptyState icon={<ShieldCheck className="size-5" />} title="Sem solicitações de reserva no momento" />
            : <div role="alert" className="border-l-2 border-red-400 bg-red-500/5 px-4 py-3 text-sm text-red-200">Não foi possível carregar as solicitações. <Button variant="ghost" size="sm" onClick={() => void queue.refetch()}>Tentar novamente</Button></div>)}
        {queue.isLoading && <p role="status" className="text-sm text-[var(--zyllen-muted)]">Carregando solicitações…</p>}
        {queue.data && <>
            <section className="space-y-4" aria-label="Solicitações aguardando autorização">
                <ListSectionHeader title="Aguardando decisão" description="Analise primeiro as solicitações com retirada mais próxima." />
                {pending.length ? <ul className="grid gap-3 lg:grid-cols-2">{pending.map(request => <li key={request.id} data-vehicle-approval={request.id} className="rounded-xl border border-amber-300/20 bg-amber-400/[0.035] p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3"><RequestSummary request={request} /><Badge variant="warning">Pendente</Badge></div>
                    {rejectingId === request.id ? <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
                        <label className="block text-sm text-white">Motivo da negativa *<Textarea className="mt-1" value={reason} maxLength={500} autoFocus onChange={event => setReason(event.target.value)} placeholder="Explique para a pessoa ajustar a solicitação." /></label>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" disabled={review.isPending} onClick={() => { setRejectingId(null); setReason(''); }}>Voltar</Button><Button variant="destructive" disabled={review.isPending || reason.trim().length < 2} onClick={() => review.mutate({ id: request.id, action: 'reject', reason: reason.trim() })}><X /> Confirmar negativa</Button></div>
                    </div> : <div className="mt-5 flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end"><Button variant="outline" disabled={review.isPending} onClick={() => { setRejectingId(request.id); setReason(''); }}><X /> Negar</Button><Button variant="highlight" disabled={review.isPending} onClick={() => review.mutate({ id: request.id, action: 'approve' })}><Check /> Autorizar retirada</Button></div>}
                </li>)}</ul> : <EmptyState icon={<ShieldCheck className="size-5" />} title="Sem solicitações de reserva no momento" description="Novas reservas aparecerão aqui antes de liberar a retirada." />}
            </section>
            <details className="border-y border-white/10 py-4"><summary className="cursor-pointer text-sm font-medium text-white">Decisões recentes ({recent.length})</summary>
                <ul className="mt-4 divide-y divide-white/10">{recent.map(request => <li key={request.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto]"><RequestSummary request={request} /><div className="md:text-right"><Badge variant={request.approvalStatus === 'APPROVED' ? 'success' : 'destructive'}>{request.approvalStatus === 'APPROVED' ? 'Autorizada' : 'Negada'}</Badge><p className="mt-2 text-xs text-[var(--zyllen-muted)]">{request.reviewedBy?.name}{request.reviewedAt ? ` · ${dateTime(request.reviewedAt)}` : ''}</p>{request.rejectionReason && <p className="mt-1 max-w-md text-xs text-red-200">{request.rejectionReason}</p>}</div></li>)}</ul>
            </details>
        </>}
    </div>;
}
