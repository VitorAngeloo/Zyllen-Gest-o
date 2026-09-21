"use client";
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { VehicleReservationRecord } from '@zyllen/shared';
import { toast } from 'sonner';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { PageHeader } from '@web/components/ui/page-header';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { SearchableSelect } from '@web/components/ui/searchable-select';
import { ListSectionHeader, EmptyState } from '@web/components/ui/workspace';
import { VehicleWorkspaceNav } from '../components/vehicle-workspace-nav';
import { VehiclePhotoInput } from '../components/vehicle-photo-input';
import { VehiclePhotoViewer } from '../components/vehicle-photo-viewer';
import { vehicleApi, shouldRetryVehicleQuery } from '../api/vehicle-api';

const date = (value: string) => new Date(value).toLocaleString('pt-BR');
const purposes = [
    ['VISITA_CLIENTE', 'Visita ao cliente'], ['INSTALACAO', 'Instalação'], ['DESINSTALACAO', 'Desinstalação'],
    ['MANUTENCAO', 'Manutenção'], ['CAPTACAO', 'Captação'], ['OUTRO', 'Outro'],
] as const;
const fuels = [['CHEIO', 'Cheio'], ['TRES_QUARTOS', '3/4'], ['METADE', '1/2'], ['UM_QUARTO', '1/4'], ['RESERVA', 'Reserva']] as const;
const labelClass = 'block space-y-1.5 text-sm text-white';
const selectClass = 'h-9 w-full rounded-md border border-white/15 bg-[var(--zyllen-bg-dark)] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zyllen-highlight)]';

function BookingSummary({ booking }: { booking: VehicleReservationRecord }) {
    return <div className="space-y-1"><p className="font-medium text-white">{booking.vehicle.name}{booking.vehicle.plate ? ` · ${booking.vehicle.plate}` : ''}</p>
        <p className="text-sm text-[var(--zyllen-muted)]">{booking.title} · Responsável: {booking.responsible.name}</p>
        <p className="text-xs tabular-nums text-[var(--zyllen-muted)]">Reserva: {date(booking.startDate)} até {date(booking.endDate)}</p></div>;
}

function CheckoutForm({ booking, users, onDone }: { booking: VehicleReservationRecord; users: { id: string; name: string }[]; onDone: () => Promise<void> }) {
    const options = useAuthedFetch();
    const [driverId, setDriverId] = useState(booking.responsible.id);
    const [clientName, setClientName] = useState('');
    const [destination, setDestination] = useState('');
    const [purpose, setPurpose] = useState('');
    const [odometer, setOdometer] = useState('');
    const [fuel, setFuel] = useState('');
    const [damage, setDamage] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoBusy, setPhotoBusy] = useState(false);
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const submit = async (event: React.FormEvent) => {
        event.preventDefault(); setError('');
        if (pending || photoBusy) return;
        if (!driverId || !purpose || !fuel || !damage || !photo) { setError('Preencha todos os campos e anexe a foto do hodômetro.'); return; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 20 * 1024 * 1024) { setError('Use uma foto JPG, PNG ou WebP de até 20 MB.'); return; }
        const form = new FormData();
        Object.entries({ driverId, clientName: clientName.trim(), destination: destination.trim(), purpose, odometerOut: odometer, fuelOut: fuel, hadDamageOut: damage }).forEach(([key, value]) => form.append(key, value));
        form.append('odometerPhoto', photo);
        setPending(true);
        try { await vehicleApi.checkout(booking.id, form, options); toast.success('Retirada registrada. O carro agora está em uso.'); await onDone(); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível registrar a retirada. Confira os dados e tente novamente.'); }
        finally { setPending(false); }
    };
    return <form onSubmit={submit} className="space-y-5 rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5" aria-label={`Retirada de ${booking.vehicle.name}`}>
        <BookingSummary booking={booking} />
        <div className="grid gap-4 sm:grid-cols-2">
            <div className={labelClass}><label htmlFor="checkout-driver">Colaborador / condutor *</label><SearchableSelect id="checkout-driver" ariaLabel="Colaborador / condutor" placeholder="Selecione o condutor" searchPlaceholder="Digite para buscar" emptyText="Nenhum colaborador encontrado" value={driverId} options={users.map(person => ({ value: person.id, label: person.name }))} onValueChange={setDriverId} disabled={pending} /></div>
            <label className={labelClass}>Cliente ou uso interno *<Input value={clientName} onChange={event => setClientName(event.target.value)} required minLength={2} maxLength={160} placeholder="Ex.: Skyline ou nome do cliente" /></label>
            <label className={labelClass}>Destino *<Input value={destination} onChange={event => setDestination(event.target.value)} required minLength={2} maxLength={240} /></label>
            <label className={labelClass}>Finalidade da utilização *<select className={selectClass} value={purpose} onChange={event => setPurpose(event.target.value)} required><option value="">Selecione</option>{purposes.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
            <label className={labelClass}>Quilometragem na retirada (km) *<Input type="number" min="0" max="9999999" step="1" inputMode="numeric" value={odometer} onChange={event => setOdometer(event.target.value)} required /></label>
            <label className={labelClass}>Combustível na retirada *<select className={selectClass} value={fuel} onChange={event => setFuel(event.target.value)} required><option value="">Selecione</option>{fuels.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
            <VehiclePhotoInput label="Foto do hodômetro na retirada" value={photo} onChange={setPhoto} onBusyChange={setPhotoBusy} disabled={pending} />
            <fieldset className="space-y-2 text-sm text-white"><legend>O veículo apresenta avarias na saída? *</legend><div className="flex gap-5"><label className="flex items-center gap-2"><input type="radio" name="damage" value="true" checked={damage === 'true'} onChange={event => setDamage(event.target.value)} required /> Sim</label><label className="flex items-center gap-2"><input type="radio" name="damage" value="false" checked={damage === 'false'} onChange={event => setDamage(event.target.value)} required /> Não</label></div></fieldset>
        </div>
        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
        <Button type="submit" variant="highlight" disabled={pending || photoBusy}>{pending ? 'Registrando retirada…' : 'Confirmar retirada'}</Button>
    </form>;
}

function ReturnForm({ booking, onDone }: { booking: VehicleReservationRecord; onDone: () => Promise<void> }) {
    const options = useAuthedFetch();
    const [odometer, setOdometer] = useState('');
    const [sameDestination, setSameDestination] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoBusy, setPhotoBusy] = useState(false);
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const submit = async (event: React.FormEvent) => {
        event.preventDefault(); setError('');
        if (pending || photoBusy) return;
        if (!sameDestination || !photo) { setError('Informe o destino e anexe a foto do hodômetro.'); return; }
        if (Number(odometer) < (booking.use?.odometerOut ?? 0)) { setError('A quilometragem não pode ser menor que a registrada na retirada.'); return; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 20 * 1024 * 1024) { setError('Use uma foto JPG, PNG ou WebP de até 20 MB.'); return; }
        const form = new FormData(); form.append('odometerIn', odometer); form.append('sameDestination', sameDestination); form.append('odometerPhoto', photo);
        setPending(true);
        try { const result = await vehicleApi.returnVehicle(booking.id, form, options); toast.success(result.use?.lateMinutes ? `Devolução registrada com ${result.use.lateMinutes} minuto(s) de atraso.` : 'Devolução registrada. O carro está disponível.'); await onDone(); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível registrar a devolução. Confira os dados e tente novamente.'); }
        finally { setPending(false); }
    };
    return <form onSubmit={submit} className="space-y-5 rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5" aria-label={`Devolução de ${booking.vehicle.name}`}>
        <BookingSummary booking={booking} />
        <p className="text-sm text-[var(--zyllen-muted)]">Condutor: {booking.use?.driver.name} · Retirada: {booking.use && date(booking.use.checkedOutAt)} · Saída: {booking.use?.odometerOut} km</p>
        {Date.parse(booking.endDate) < Date.now() && <p role="status" className="text-sm text-amber-200">Prazo da reserva encerrado. O atraso será registrado na devolução.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Quilometragem na devolução (km) *<Input type="number" min={booking.use?.odometerOut ?? 0} max="9999999" step="1" inputMode="numeric" value={odometer} onChange={event => setOdometer(event.target.value)} required /></label>
            <VehiclePhotoInput label="Foto do hodômetro na devolução" value={photo} onChange={setPhoto} onBusyChange={setPhotoBusy} disabled={pending} />
        </div>
        <fieldset className="space-y-2 text-sm text-white"><legend>O veículo foi usado para o destino inicial? *</legend><div className="flex gap-5"><label className="flex items-center gap-2"><input type="radio" name="sameDestination" value="true" checked={sameDestination === 'true'} onChange={event => setSameDestination(event.target.value)} required /> Sim</label><label className="flex items-center gap-2"><input type="radio" name="sameDestination" value="false" checked={sameDestination === 'false'} onChange={event => setSameDestination(event.target.value)} required /> Não</label></div></fieldset>
        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
        <Button type="submit" variant="highlight" disabled={pending || photoBusy}>{pending ? 'Registrando devolução…' : 'Confirmar devolução'}</Button>
    </form>;
}

export default function VehicleOperationsScreen() {
    const { user, userType, hasPermission, isLoading } = useAuth();
    const options = useAuthedFetch(), client = useQueryClient();
    const enabled = !!user && userType === 'internal' && (hasPermission('vehicles.view') || hasPermission('schedule.view'));
    const canOperate = hasPermission('vehicles.reserve') || hasPermission('schedule.create');
    const operations = useQuery({ queryKey: ['vehicles', 'operations', user?.id], queryFn: ({ signal }) => vehicleApi.operations({ ...options, signal }), enabled, refetchInterval: 30_000, retry: shouldRetryVehicleQuery });
    const people = useQuery({ queryKey: ['vehicles', 'options', user?.id], queryFn: ({ signal }) => vehicleApi.options({ ...options, signal }), enabled, retry: shouldRetryVehicleQuery });
    const [selected, setSelected] = useState<{ id: string; action: 'checkout' | 'return' } | null>(null);
    useEffect(() => { const id = new URLSearchParams(window.location.search).get('reserva'); if (id) setSelected({ id, action: 'checkout' }); }, []);
    const afterSave = async () => { setSelected(null); await client.invalidateQueries({ queryKey: ['vehicles'] }); };
    if (isLoading) return <p className="text-sm text-[var(--zyllen-muted)]">Carregando acesso…</p>;
    if (!enabled) return <p className="text-sm text-[var(--zyllen-muted)]">Você não tem acesso aos carros.</p>;
    const data = operations.data;
    const selectedBooking = selected && [...(data?.ready ?? []), ...(data?.inUse ?? [])].find(row => row.id === selected.id);
    return <div className="space-y-8"><PageHeader eyebrow="Operação · Carros" title="Retiradas e devoluções" description="A reserva planeja o uso. Registre a retirada quando pegar a chave e a devolução quando entregar o carro." />
        <VehicleWorkspaceNav />
        {operations.isError && <div role="alert" className="border-l-2 border-red-400 bg-red-500/5 px-4 py-3 text-sm text-red-200">Não foi possível carregar as movimentações. <Button variant="ghost" size="sm" onClick={() => void operations.refetch()}>Tentar novamente</Button></div>}
        {people.isError && <div role="alert" className="border-l-2 border-amber-400 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">Não foi possível carregar os colaboradores para a retirada. <Button variant="ghost" size="sm" onClick={() => void people.refetch()}>Tentar novamente</Button></div>}
        {operations.isLoading && <p className="text-sm text-[var(--zyllen-muted)]">Carregando movimentações…</p>}
        {selectedBooking && !selectedBooking.use && canOperate && people.isSuccess && <section className="space-y-3"><ListSectionHeader title="Registrar retirada" description="Confira os dados do veículo antes de sair." /><CheckoutForm key={selectedBooking.id} booking={selectedBooking} users={people.data?.responsibleUsers ?? []} onDone={afterSave} /><Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Fechar formulário</Button></section>}
        {data && <>
            <section className="space-y-3"><ListSectionHeader title="Aguardando retirada" count={data.ready.length} description="Reservas cujo período já começou e ainda não tiveram retirada." />{data.ready.length ? <ul className="divide-y divide-white/10 border-y border-white/10">{data.ready.map(booking => <li key={booking.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4"><BookingSummary booking={booking} />{canOperate && <Button size="sm" variant="outline" onClick={() => setSelected({ id: booking.id, action: 'checkout' })}>Registrar retirada</Button>}</li>)}</ul> : <EmptyState title="Nenhuma retirada pendente" description="Quando começar o período de uma reserva, ela aparecerá aqui." />}</section>
            {selectedBooking?.use && !selectedBooking.use.returnedAt && canOperate && <section className="space-y-3"><ListSectionHeader title="Registrar devolução" description="O carro permanecerá em uso até confirmar esta etapa." /><ReturnForm key={selectedBooking.id} booking={selectedBooking} onDone={afterSave} /><Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Fechar formulário</Button></section>}
            <section className="space-y-3"><ListSectionHeader title="Em uso" count={data.inUse.length} description="O carro só volta a ficar disponível após a devolução registrada." />{data.inUse.length ? <ul className="divide-y divide-white/10 border-y border-white/10">{data.inUse.map(booking => <li key={booking.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4"><div><BookingSummary booking={booking} /><p className="mt-2 text-xs text-[var(--zyllen-muted)]">Condutor: {booking.use?.driver.name} · Retirado em {booking.use && date(booking.use.checkedOutAt)}</p>{Date.parse(booking.endDate) < Date.now() && <p className="mt-1 text-xs font-medium text-amber-200">Devolução atrasada</p>}</div>{canOperate && <Button size="sm" variant="outline" onClick={() => setSelected({ id: booking.id, action: 'return' })}>Registrar devolução</Button>}</li>)}</ul> : <EmptyState title="Nenhum carro em uso" description="Os carros retirados aparecerão aqui até a devolução." />}</section>
            <section className="space-y-3"><ListSectionHeader title="Minhas devoluções recentes" count={data.recent.length} />{data.recent.length ? <ul className="divide-y divide-white/10 border-y border-white/10">{data.recent.map(booking => <li key={booking.id} className="space-y-2 px-4 py-4"><BookingSummary booking={booking} /><p className="text-xs text-[var(--zyllen-muted)]">Devolvido em {booking.use?.returnedAt && date(booking.use.returnedAt)} · {booking.use?.odometerOut} → {booking.use?.odometerIn} km · {booking.use?.lateMinutes ? `${booking.use.lateMinutes} min de atraso` : 'No prazo'}</p><div className="flex flex-wrap gap-2"><VehiclePhotoViewer label="Foto da retirada" path={booking.use?.checkoutPhotoUrl} /><VehiclePhotoViewer label="Foto da devolução" path={booking.use?.returnPhotoUrl} /></div></li>)}</ul> : <EmptyState title="Nenhuma devolução recente" />}</section>
        </>}
    </div>;
}
