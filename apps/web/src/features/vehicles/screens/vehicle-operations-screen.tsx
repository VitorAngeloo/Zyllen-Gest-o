"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { VehicleReservationRecord } from '@zyllen/shared';
import { AlertTriangle, ArrowRight, Camera, CarFront, CheckCircle2, Clock3, KeyRound, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { PageHeader } from '@web/components/ui/page-header';
import { Badge } from '@web/components/ui/badge';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { SearchableSelect } from '@web/components/ui/searchable-select';
import { ListSectionHeader, EmptyState } from '@web/components/ui/workspace';
import { cn } from '@web/lib/utils';
import { VehicleWorkspaceNav } from '../components/vehicle-workspace-nav';
import { VehiclePhotoInput } from '../components/vehicle-photo-input';
import { VehiclePhotoViewer } from '../components/vehicle-photo-viewer';
import { vehicleApi, shouldRetryVehicleQuery } from '../api/vehicle-api';

const formatDateTime = (value: string) => new Date(value).toLocaleString('pt-BR');
const purposes = [
    ['VISITA_CLIENTE', 'Visita ao cliente'], ['INSTALACAO', 'Instalação'], ['DESINSTALACAO', 'Desinstalação'],
    ['MANUTENCAO', 'Manutenção'], ['CAPTACAO', 'Captação'], ['OUTRO', 'Outro'],
] as const;
const fuels = [['CHEIO', 'Cheio'], ['TRES_QUARTOS', '3/4'], ['METADE', '1/2'], ['UM_QUARTO', '1/4'], ['RESERVA', 'Reserva']] as const;
const labelClass = 'block space-y-1.5 text-sm text-white';
const selectClass = 'h-10 w-full rounded-md border border-white/15 bg-[var(--zyllen-bg-dark)] px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zyllen-highlight)]';

function BookingSummary({ booking, className }: { booking: VehicleReservationRecord; className?: string }) {
    return (
        <div className={cn('min-w-0 space-y-2', className)}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="font-semibold text-white">{booking.vehicle.name}</p>
                {booking.vehicle.plate && <span className="font-mono text-xs tracking-[0.08em] text-white/55">{booking.vehicle.plate}</span>}
            </div>
            <p className="text-sm leading-relaxed text-white/75">{booking.title} <span className="text-white/35">·</span> {booking.responsible.name}</p>
            <p className="flex items-start gap-2 text-xs tabular-nums leading-relaxed text-[var(--zyllen-muted)]">
                <Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>{formatDateTime(booking.startDate)} <ArrowRight className="mx-1 inline size-3" aria-hidden="true" /> {formatDateTime(booking.endDate)}</span>
            </p>
        </div>
    );
}

function OperationalMetric({ index, label, value, description, attention }: { index: string; label: string; value: number; description: string; attention?: boolean }) {
    return (
        <div className={cn('relative min-h-28 px-4 py-4 sm:px-5', attention && value > 0 && 'bg-amber-400/[0.035]')}>
            <span className={cn('font-mono text-[10px] font-semibold tracking-[0.16em]', attention && value > 0 ? 'text-amber-300' : 'text-[var(--zyllen-highlight)]')}>{index}</span>
            <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">{label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--zyllen-muted)]">{description}</p>
                </div>
                <strong className={cn('font-mono text-3xl font-semibold tabular-nums', attention && value > 0 ? 'text-amber-200' : 'text-white')}>{String(value).padStart(2, '0')}</strong>
            </div>
        </div>
    );
}

function FormGroup({ index, title, description, children }: { index: string; title: string; description: string; children: ReactNode }) {
    return (
        <section className="space-y-4">
            <div className="flex items-start gap-3 border-b border-white/10 pb-3">
                <span className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[var(--zyllen-highlight)]">{index}</span>
                <div>
                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--zyllen-muted)]">{description}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

function ActiveTaskHeader({ step, title, description, booking, onCancel }: { step: string; title: string; description: string; booking: VehicleReservationRecord; onCancel: () => void }) {
    return (
        <header className="relative border-b border-white/10 px-4 py-4 sm:px-5">
            <Button type="button" variant="ghost" size="sm" className="absolute right-3 top-3 min-h-10 sm:right-4" onClick={onCancel}>Fechar</Button>
            <div className="pr-20">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-1 block h-8 w-0.5 shrink-0 bg-[var(--zyllen-highlight)]" aria-hidden="true" />
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--zyllen-highlight)]">{step} · Tarefa em andamento</p>
                        <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--zyllen-muted)]">{description}</p>
                    </div>
                </div>
            </div>
            <BookingSummary booking={booking} className="mt-5 border-l border-white/15 pl-4" />
        </header>
    );
}

function CheckoutForm({ booking, users, onDone, onCancel }: { booking: VehicleReservationRecord; users: { id: string; name: string }[]; onDone: () => Promise<void>; onCancel: () => void }) {
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
    return (
        <form onSubmit={submit} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.018]" aria-label={`Retirada de ${booking.vehicle.name}`} aria-busy={pending || photoBusy}>
            <ActiveTaskHeader step="Etapa 1 de 2" title="Registrar retirada" description="Identifique o condutor e confira o estado do carro antes de sair." booking={booking} onCancel={onCancel} />
            <div className="grid gap-7 p-4 sm:p-5 lg:grid-cols-2 lg:gap-8">
                <FormGroup index="01" title="Uso e destino" description="Defina quem assume o carro e para qual atividade.">
                    <div className="grid gap-4">
                        <div className={labelClass}><label htmlFor="checkout-driver">Colaborador / condutor *</label><SearchableSelect id="checkout-driver" ariaLabel="Colaborador / condutor" placeholder="Selecione o condutor" searchPlaceholder="Digite para buscar" emptyText="Nenhum colaborador encontrado" value={driverId} options={users.map(person => ({ value: person.id, label: person.name }))} onValueChange={setDriverId} disabled={pending} /></div>
                        <label className={labelClass}>Cliente ou uso interno *<Input value={clientName} onChange={event => setClientName(event.target.value)} required minLength={2} maxLength={160} placeholder="Ex.: Skyline ou nome do cliente" disabled={pending} /></label>
                        <label className={labelClass}>Destino *<Input value={destination} onChange={event => setDestination(event.target.value)} required minLength={2} maxLength={240} disabled={pending} /></label>
                        <label className={labelClass}>Finalidade da utilização *<select className={selectClass} value={purpose} onChange={event => setPurpose(event.target.value)} required disabled={pending}><option value="">Selecione</option>{purposes.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
                    </div>
                </FormGroup>
                <FormGroup index="02" title="Conferência de saída" description="Registre a leitura e uma evidência legível do painel.">
                    <div className="grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className={labelClass}>Quilometragem na retirada (km) *<Input type="number" min="0" max="9999999" step="1" inputMode="numeric" value={odometer} onChange={event => setOdometer(event.target.value)} required disabled={pending} /></label>
                            <label className={labelClass}>Combustível na retirada *<select className={selectClass} value={fuel} onChange={event => setFuel(event.target.value)} required disabled={pending}><option value="">Selecione</option>{fuels.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
                        </div>
                        <fieldset className="space-y-3 border-l border-white/15 py-1 pl-4 text-sm text-white"><legend className="pr-2">O veículo apresenta avarias na saída? *</legend><div className="flex min-h-10 items-center gap-6"><label className="flex cursor-pointer items-center gap-2"><input type="radio" name="damage" value="true" checked={damage === 'true'} onChange={event => setDamage(event.target.value)} required disabled={pending} /> Sim</label><label className="flex cursor-pointer items-center gap-2"><input type="radio" name="damage" value="false" checked={damage === 'false'} onChange={event => setDamage(event.target.value)} required disabled={pending} /> Não</label></div></fieldset>
                        <VehiclePhotoInput label="Foto do hodômetro na retirada" value={photo} onChange={setPhoto} onBusyChange={setPhotoBusy} disabled={pending} />
                    </div>
                </FormGroup>
            </div>
            {error && <div role="alert" className="mx-4 mb-4 border-l-2 border-red-400 bg-red-500/5 px-4 py-3 text-sm text-red-200 sm:mx-5">{error}</div>}
            <footer className="flex flex-col-reverse gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs text-[var(--zyllen-muted)]">Os campos com * são obrigatórios.</p>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button type="button" variant="ghost" className="min-h-11" onClick={onCancel} disabled={pending}>Cancelar</Button>
                    <Button type="submit" variant="highlight" className="min-h-11" disabled={pending || photoBusy}>{pending ? 'Registrando retirada…' : 'Confirmar retirada'}</Button>
                </div>
            </footer>
        </form>
    );
}

function ReturnForm({ booking, onDone, onCancel }: { booking: VehicleReservationRecord; onDone: () => Promise<void>; onCancel: () => void }) {
    const options = useAuthedFetch();
    const [odometer, setOdometer] = useState('');
    const [sameDestination, setSameDestination] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoBusy, setPhotoBusy] = useState(false);
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const overdue = Date.parse(booking.endDate) < Date.now();
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
    return (
        <form onSubmit={submit} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.018]" aria-label={`Devolução de ${booking.vehicle.name}`} aria-busy={pending || photoBusy}>
            <ActiveTaskHeader step="Etapa 2 de 2" title="Registrar devolução" description="Confira a chegada para liberar o carro novamente." booking={booking} onCancel={onCancel} />
            <div className="space-y-7 p-4 sm:p-5">
                {overdue && <div role="status" className="flex items-start gap-3 border-l-2 border-amber-400 bg-amber-400/5 px-4 py-3 text-sm text-amber-100"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span><strong className="font-semibold">Prazo encerrado.</strong> O atraso será calculado e registrado ao confirmar a devolução.</span></div>}
                <FormGroup index="01" title="Saída registrada" description="Use estes dados como referência antes de conferir o retorno.">
                    <dl className="grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        <div className="px-3 py-3"><dt className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-white/40"><UserRound className="size-3.5" /> Condutor</dt><dd className="mt-2 text-sm font-medium text-white">{booking.use?.driver.name}</dd></div>
                        <div className="px-3 py-3"><dt className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-white/40"><KeyRound className="size-3.5" /> Retirada</dt><dd className="mt-2 text-sm tabular-nums text-white">{booking.use && formatDateTime(booking.use.checkedOutAt)}</dd></div>
                        <div className="px-3 py-3"><dt className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-white/40"><CarFront className="size-3.5" /> Quilometragem</dt><dd className="mt-2 text-sm font-medium tabular-nums text-white">{booking.use?.odometerOut} km</dd></div>
                    </dl>
                </FormGroup>
                <FormGroup index="02" title="Conferência de chegada" description="Registre a leitura final e confirme se o trajeto correspondeu ao planejado.">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                        <div className="space-y-5">
                            <label className={labelClass}>Quilometragem na devolução (km) *<Input type="number" min={booking.use?.odometerOut ?? 0} max="9999999" step="1" inputMode="numeric" value={odometer} onChange={event => setOdometer(event.target.value)} required disabled={pending} /></label>
                            <fieldset className="space-y-3 border-l border-white/15 py-1 pl-4 text-sm text-white"><legend className="pr-2">O veículo foi usado para o destino inicial? *</legend><div className="flex min-h-10 items-center gap-6"><label className="flex cursor-pointer items-center gap-2"><input type="radio" name="sameDestination" value="true" checked={sameDestination === 'true'} onChange={event => setSameDestination(event.target.value)} required disabled={pending} /> Sim</label><label className="flex cursor-pointer items-center gap-2"><input type="radio" name="sameDestination" value="false" checked={sameDestination === 'false'} onChange={event => setSameDestination(event.target.value)} required disabled={pending} /> Não</label></div></fieldset>
                        </div>
                        <VehiclePhotoInput label="Foto do hodômetro na devolução" value={photo} onChange={setPhoto} onBusyChange={setPhotoBusy} disabled={pending} />
                    </div>
                </FormGroup>
            </div>
            {error && <div role="alert" className="mx-4 mb-4 border-l-2 border-red-400 bg-red-500/5 px-4 py-3 text-sm text-red-200 sm:mx-5">{error}</div>}
            <footer className="flex flex-col-reverse gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs text-[var(--zyllen-muted)]">A devolução encerra o uso e libera o carro.</p>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button type="button" variant="ghost" className="min-h-11" onClick={onCancel} disabled={pending}>Cancelar</Button>
                    <Button type="submit" variant="highlight" className="min-h-11" disabled={pending || photoBusy}>{pending ? 'Registrando devolução…' : 'Confirmar devolução'}</Button>
                </div>
            </footer>
        </form>
    );
}

function OperationStatus({ type, overdue = false }: { type: 'ready' | 'in-use'; overdue?: boolean }) {
    if (overdue) return <Badge variant="warning"><AlertTriangle className="mr-1 size-3" aria-hidden="true" /> Devolução atrasada</Badge>;
    if (type === 'ready') return <Badge variant="neon"><KeyRound className="mr-1 size-3" aria-hidden="true" /> Pronto para retirada</Badge>;
    return <Badge variant="secondary"><CarFront className="mr-1 size-3" aria-hidden="true" /> Em uso</Badge>;
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
    useEffect(() => {
        if (!selected) return;
        const frame = window.requestAnimationFrame(() => {
            const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
            document.getElementById('vehicle-active-task')?.scrollIntoView({ behavior, block: 'start' });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [selected]);
    const afterSave = async () => { setSelected(null); await client.invalidateQueries({ queryKey: ['vehicles'] }); };
    if (isLoading) return <p className="text-sm text-[var(--zyllen-muted)]">Carregando acesso…</p>;
    if (!enabled) return <p className="text-sm text-[var(--zyllen-muted)]">Você não tem acesso aos carros.</p>;
    const data = operations.data;
    const selectedBooking = selected
        ? (selected.action === 'checkout' ? data?.ready : data?.inUse)?.find(row => row.id === selected.id)
        : undefined;
    const overdueCount = data?.inUse.filter(booking => Date.parse(booking.endDate) < Date.now()).length ?? 0;

    return (
        <div className="space-y-8">
            <PageHeader eyebrow="Operação · Carros" title="Retiradas e devoluções" description="A reserva planeja o uso. Registre a retirada quando pegar a chave e a devolução quando entregar o carro." />
            <VehicleWorkspaceNav />
            {operations.isError && <div role="alert" className="border-l-2 border-red-400 bg-red-500/5 px-4 py-3 text-sm text-red-200">Não foi possível carregar as movimentações. <Button variant="ghost" size="sm" onClick={() => void operations.refetch()}>Tentar novamente</Button></div>}
            {people.isError && <div role="alert" className="border-l-2 border-amber-400 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">Não foi possível carregar os colaboradores para a retirada. <Button variant="ghost" size="sm" onClick={() => void people.refetch()}>Tentar novamente</Button></div>}
            {operations.isLoading && <div role="status" className="grid animate-pulse divide-y divide-white/10 border-y border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0"><div className="h-28 bg-white/[0.02]" /><div className="h-28 bg-white/[0.02]" /><div className="h-28 bg-white/[0.02]" /><span className="sr-only">Carregando movimentações…</span></div>}
            {data && (
                <>
                    <section aria-label="Resumo das movimentações" className="grid divide-y divide-white/10 border-y border-white/10 bg-white/[0.012] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        <OperationalMetric index="01" label="Aguardando retirada" value={data.ready.length} description="Reservas prontas para iniciar" />
                        <OperationalMetric index="02" label="Em uso" value={data.inUse.length} description="Carros fora da base" />
                        <OperationalMetric index="03" label="Atenção" value={overdueCount} description="Devoluções fora do prazo" attention />
                    </section>

                    {selectedBooking && selected?.action === 'checkout' && canOperate && people.isSuccess && (
                        <section id="vehicle-active-task" aria-label="Tarefa em andamento" className="scroll-mt-20"><CheckoutForm key={selectedBooking.id} booking={selectedBooking} users={people.data?.responsibleUsers ?? []} onDone={afterSave} onCancel={() => setSelected(null)} /></section>
                    )}
                    {selectedBooking && selected?.action === 'return' && canOperate && (
                        <section id="vehicle-active-task" aria-label="Tarefa em andamento" className="scroll-mt-20"><ReturnForm key={selectedBooking.id} booking={selectedBooking} onDone={afterSave} onCancel={() => setSelected(null)} /></section>
                    )}

                    <div className="grid items-start gap-8 xl:grid-cols-2">
                        <section className="space-y-3">
                            <ListSectionHeader title="Aguardando retirada" count={data.ready.length} description="Reservas cujo período já começou e ainda não tiveram retirada." />
                            {data.ready.length ? (
                                <ul className="divide-y divide-white/10 border-y border-white/10">
                                    {data.ready.map(booking => (
                                        <li key={booking.id} className={cn('relative px-4 py-4 transition-colors', selected?.id === booking.id && selected.action === 'checkout' && 'bg-[var(--zyllen-highlight)]/[0.035] before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:bg-[var(--zyllen-highlight)]')}>
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="space-y-3"><OperationStatus type="ready" /><BookingSummary booking={booking} /></div>
                                                {canOperate && <Button className="min-h-11 w-full sm:w-auto" size="sm" variant="outline" disabled={!people.isSuccess} onClick={() => setSelected({ id: booking.id, action: 'checkout' })}>Registrar retirada</Button>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : <EmptyState icon={<CheckCircle2 className="size-5" />} title="Nenhuma retirada pendente" description="Quando começar o período de uma reserva, ela aparecerá aqui." />}
                        </section>

                        <section className="space-y-3">
                            <ListSectionHeader title="Em uso" count={data.inUse.length} description="O carro volta a ficar disponível após a devolução registrada." />
                            {data.inUse.length ? (
                                <ul className="divide-y divide-white/10 border-y border-white/10">
                                    {data.inUse.map(booking => {
                                        const overdue = Date.parse(booking.endDate) < Date.now();
                                        return (
                                            <li key={booking.id} className={cn('relative px-4 py-4 transition-colors', selected?.id === booking.id && selected.action === 'return' && 'bg-[var(--zyllen-highlight)]/[0.035] before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:bg-[var(--zyllen-highlight)]')}>
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="space-y-3">
                                                        <OperationStatus type="in-use" overdue={overdue} />
                                                        <BookingSummary booking={booking} />
                                                        <p className="flex items-center gap-2 text-xs text-[var(--zyllen-muted)]"><UserRound className="size-3.5" aria-hidden="true" /> {booking.use?.driver.name} · retirada em {booking.use && formatDateTime(booking.use.checkedOutAt)}</p>
                                                    </div>
                                                    {canOperate && <Button className="min-h-11 w-full sm:w-auto" size="sm" variant={overdue ? 'highlight-outline' : 'outline'} onClick={() => setSelected({ id: booking.id, action: 'return' })}>Registrar devolução</Button>}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : <EmptyState icon={<CarFront className="size-5" />} title="Nenhum carro em uso" description="Os carros retirados aparecerão aqui até a devolução." />}
                        </section>
                    </div>

                    <section className="space-y-3">
                        <ListSectionHeader title="Minhas devoluções recentes" count={data.recent.length} description="Comprovantes e leituras dos últimos usos encerrados por você." />
                        {data.recent.length ? (
                            <ul className="divide-y divide-white/10 border-y border-white/10">
                                {data.recent.map(booking => (
                                    <li key={booking.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                        <div>
                                            <div className="mb-3 flex flex-wrap items-center gap-2"><Badge variant="success"><CheckCircle2 className="mr-1 size-3" aria-hidden="true" /> Uso encerrado</Badge>{booking.use?.lateMinutes ? <Badge variant="warning">{booking.use.lateMinutes} min de atraso</Badge> : <Badge variant="secondary">No prazo</Badge>}</div>
                                            <BookingSummary booking={booking} />
                                            <p className="mt-3 text-xs tabular-nums text-[var(--zyllen-muted)]">Devolvido em {booking.use?.returnedAt && formatDateTime(booking.use.returnedAt)} · {booking.use?.odometerOut} → {booking.use?.odometerIn} km</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2"><VehiclePhotoViewer label="Foto da retirada" path={booking.use?.checkoutPhotoUrl} /><VehiclePhotoViewer label="Foto da devolução" path={booking.use?.returnPhotoUrl} /></div>
                                    </li>
                                ))}
                            </ul>
                        ) : <EmptyState icon={<Camera className="size-5" />} title="Nenhuma devolução recente" description="Os registros encerrados por você aparecerão neste histórico." />}
                    </section>
                </>
            )}
        </div>
    );
}
