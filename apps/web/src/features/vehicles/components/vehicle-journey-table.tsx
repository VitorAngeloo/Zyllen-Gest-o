"use client";
import { Fragment, useState } from 'react';
import type { VehicleDashboard, VehicleReservationRecord } from '@zyllen/shared';
import { Button } from '@web/components/ui/button';
import { EmptyState, ListSectionHeader } from '@web/components/ui/workspace';
import { VehiclePhotoViewer } from './vehicle-photo-viewer';

const date = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR') : '—';
const purposeLabel: Record<string, string> = { VISITA_CLIENTE: 'Visita ao cliente', INSTALACAO: 'Instalação', DESINSTALACAO: 'Desinstalação', MANUTENCAO: 'Manutenção', CAPTACAO: 'Captação', OUTRO: 'Outro' };
const fuelLabel: Record<string, string> = { CHEIO: 'Cheio', TRES_QUARTOS: '3/4', METADE: '1/2', UM_QUARTO: '1/4', RESERVA: 'Reserva' };

function JourneyDetail({ booking }: { booking: VehicleReservationRecord }) {
    const use = booking.use!;
    return <div className="grid gap-6 rounded-lg bg-white/[0.035] p-5 md:grid-cols-2">
        <div className="space-y-2"><h3 className="font-medium text-white">Retirada</h3>
            <p>Condutor: {use.driver.name} · Setor: {use.driver.sector || 'Não informado'}</p>
            <p>Registrada por: {use.checkedOutBy?.name || 'Não informado'} · {date(use.checkedOutAt)}</p>
            <p>Cliente ou uso interno: {use.clientName}</p><p>Destino: {use.destination}</p>
            <p>Finalidade: {purposeLabel[use.purpose] || use.purpose}</p>
            <p>Hodômetro: {use.odometerOut.toLocaleString('pt-BR')} km · Combustível: {fuelLabel[use.fuelOut] || use.fuelOut}</p>
            <p>Avarias na retirada: {use.hadDamageOut ? 'Sim' : 'Não'}</p>
            <VehiclePhotoViewer label="Ver foto da retirada" path={use.checkoutPhotoUrl} />
        </div>
        <div className="space-y-2"><h3 className="font-medium text-white">Devolução</h3>
            {use.returnedAt ? <><p>Registrada por: {use.returnedBy?.name || 'Não informado'} · {date(use.returnedAt)}</p>
                <p>Hodômetro: {use.odometerIn?.toLocaleString('pt-BR')} km · Percurso: {((use.odometerIn ?? use.odometerOut) - use.odometerOut).toLocaleString('pt-BR')} km</p>
                <p>Usou o destino inicial: {use.sameDestination ? 'Sim' : 'Não'}</p>
                <p>Atraso: {use.lateMinutes ? `${use.lateMinutes} min` : 'Sem atraso'}</p>
                <VehiclePhotoViewer label="Ver foto da devolução" path={use.returnPhotoUrl} /></>
                : <p>Devolução ainda não registrada. Prevista para {date(booking.endDate)}.</p>}
        </div>
        {booking.notes && <p className="md:col-span-2">Observações da reserva: {booking.notes}</p>}
    </div>;
}

export function VehicleJourneyTable({ data, onPageChange }: { data: VehicleDashboard; onPageChange: (page: number) => void }) {
    const [openId, setOpenId] = useState<string | null>(null);
    const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
    return <section className="space-y-4"><ListSectionHeader title="Registro de retiradas e devoluções" count={data.total} description="Abra uma linha para conferir dados de saída, chegada, responsáveis e fotos. Os registros seguem o mês da retirada." />
        {data.total ? <><div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm"><thead className="bg-white/[0.05] text-xs text-[var(--zyllen-muted)]"><tr>{['Carro / finalidade', 'Condutor / setor', 'Retirada', 'Devolução', 'Percurso', 'Situação', 'Detalhes'].map(label => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-white/10">{data.journeys.map(booking => { const use = booking.use!; const open = openId === booking.id; return <Fragment key={booking.id}><tr className="align-top hover:bg-white/[0.025]">
                    <td className="px-4 py-4"><p className="font-medium text-white">{booking.vehicle.name}</p><p className="text-xs text-[var(--zyllen-muted)]">{booking.title}</p></td>
                    <td className="px-4 py-4">{use.driver.name}<p className="text-xs text-[var(--zyllen-muted)]">{use.driver.sector || 'Setor não informado'}</p></td>
                    <td className="px-4 py-4 tabular-nums">{date(use.checkedOutAt)}</td><td className="px-4 py-4 tabular-nums">{date(use.returnedAt)}</td>
                    <td className="px-4 py-4 font-mono tabular-nums">{use.odometerIn !== null ? `${(use.odometerIn - use.odometerOut).toLocaleString('pt-BR')} km` : '—'}</td>
                    <td className="px-4 py-4">{!use.returnedAt ? 'Em uso' : use.lateMinutes ? `${use.lateMinutes} min atraso` : 'No prazo'}</td>
                    <td className="px-4 py-4"><Button type="button" size="sm" variant="highlight-ghost" aria-expanded={open} onClick={() => setOpenId(open ? null : booking.id)}>{open ? 'Recolher' : 'Ver registro'}</Button></td>
                </tr>{open && <tr><td colSpan={7} className="px-4 pb-4 text-sm text-[var(--zyllen-muted)]"><JourneyDetail booking={booking} /></td></tr>}</Fragment>; })}</tbody>
            </table>
        </div><div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--zyllen-muted)]"><span>Página {data.page} de {totalPages}</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={data.page <= 1} onClick={() => { setOpenId(null); onPageChange(data.page - 1); }}>Anterior</Button><Button type="button" variant="outline" size="sm" disabled={data.page >= totalPages} onClick={() => { setOpenId(null); onPageChange(data.page + 1); }}>Próxima</Button></div></div></>
            : <EmptyState title="Nenhuma retirada neste mês" description="Escolha outro mês para consultar o histórico." />}
    </section>;
}
