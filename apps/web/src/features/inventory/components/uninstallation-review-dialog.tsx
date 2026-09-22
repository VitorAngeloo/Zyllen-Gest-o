"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { CustodyOptions } from '@zyllen/shared';
import { useAuthedFetch } from '@web/features/auth/context/auth-context';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@web/components/ui/dialog';
import { custodyApi } from '../api/custody-api';

const excludedDestinations = new Set(['Baixa', 'Manutenção', 'Uso interno - Skyline', 'Outros']);

export function UninstallationReviewDialog({ locationId, options, onClose, onSubmitted }: {
    locationId: string; options: CustodyOptions; onClose: () => void; onSubmitted: () => void;
}) {
    const requestOptions = useAuthedFetch();
    const [returnedIds, setReturnedIds] = useState<string[]>([]);
    const [destinationId, setDestinationId] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [requestId, setRequestId] = useState(() => crypto.randomUUID());
    const dialogRef = useRef<HTMLDivElement>(null);
    const review = useQuery({ queryKey: ['uninstallation', locationId], queryFn: ({ signal }) => custodyApi.uninstallation(locationId, { ...requestOptions, signal }) });
    const snapshot = review.data?.data;
    const groups = useMemo(() => {
        const result = new Map<string, NonNullable<typeof snapshot>['assets']>();
        for (const asset of snapshot?.assets ?? []) result.set(asset.skuName, [...(result.get(asset.skuName) ?? []), asset]);
        return [...result.entries()];
    }, [snapshot]);
    const returned = new Set(returnedIds);
    const pending = (snapshot?.assets.length ?? 0) - returnedIds.length;
    const warehouses = options.locations.filter(location => location.kind === 'INTERNAL' && !excludedDestinations.has(location.name));
    useEffect(() => { setReturnedIds([]); setDestinationId(''); setPin(''); setRequestId(crypto.randomUUID()); }, [locationId]);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        dialogRef.current?.focus({ preventScroll: true });
        return () => previous?.focus();
    }, []);
    const submit = useMutation({
        mutationFn: () => custodyApi.requestUninstallation(locationId, { requestId, assetIds: snapshot!.assets.map(asset => asset.id),
            returnedAssetIds: returnedIds, toLocationId: returnedIds.length ? destinationId : null, pin }, requestOptions),
        onSuccess: () => { onSubmitted(); onClose(); },
        onError: (cause: Error) => setError(cause.message),
    });
    const toggle = (ids: string[], checked: boolean) => setReturnedIds(current => checked
        ? [...new Set([...current, ...ids])] : current.filter(id => !ids.includes(id)));

    return <Dialog open onOpenChange={open => { if (!open && !submit.isPending) onClose(); }}>
        <DialogContent ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Conferência da desinstalação"
            className="max-h-[90vh] max-w-3xl overflow-y-auto" onKeyDown={event => {
                if (event.key === 'Escape' && !submit.isPending) { event.preventDefault(); onClose(); }
                if (event.key === 'Tab') {
                    const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('input:not(:disabled), select:not(:disabled), button:not(:disabled)') ?? [])];
                    const first = controls[0], last = controls[controls.length - 1];
                    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
                }
            }}>
            <DialogHeader><DialogTitle>Conferência da desinstalação</DialogTitle>
                <p className="text-sm text-[var(--zyllen-muted)]">Marque somente os patrimônios que retornaram. Os demais serão registrados como perda após aprovação.</p>
            </DialogHeader>
            <DialogBody className="space-y-4">
                {review.isLoading && <p role="status" className="text-sm text-[var(--zyllen-muted)]">Carregando itens da sala...</p>}
                {review.isError && <p role="alert" className="text-sm text-red-200">Não foi possível carregar a sala. <button className="underline" onClick={() => void review.refetch()}>Tentar novamente</button></p>}
                {snapshot && <>
                    <p className="text-sm text-white">{snapshot.location.companyName} · {snapshot.location.projectName} · {snapshot.location.name}</p>
                    {snapshot.pendingApprovalId ? <p role="status" className="border-l-2 border-amber-400 px-3 py-2 text-sm text-amber-200">Esta sala já tem uma conferência aguardando aprovação. Os itens ainda não foram movimentados.</p>
                        : !snapshot.assets.length ? <p className="text-sm text-[var(--zyllen-muted)]">Nenhum patrimônio ativo neste estoque.</p> : <>
                            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-white/10 py-3 text-sm">
                                <span>{snapshot.assets.length} itens · {returnedIds.length} devolvidos · {pending} pendentes/perda</span>
                                <div className="flex gap-3"><button type="button" className="underline" onClick={() => toggle(snapshot.assets.map(asset => asset.id), true)}>Marcar todos</button><button type="button" className="underline" onClick={() => setReturnedIds([])}>Limpar</button></div>
                            </div>
                            <div className="max-h-72 space-y-4 overflow-y-auto">{groups.map(([name, assets]) => {
                                const ids = assets.map(asset => asset.id);
                                return <fieldset key={name} className="border-b border-white/10 pb-3"><legend className="text-sm font-semibold text-white">{name} · {ids.filter(id => returned.has(id)).length}/{ids.length} devolvidos</legend>
                                    <label className="mt-2 flex items-center gap-2 text-xs text-[var(--zyllen-muted)]"><input type="checkbox" checked={ids.every(id => returned.has(id))} onChange={event => toggle(ids, event.target.checked)} />Marcar este item inteiro</label>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">{assets.map(asset => <label key={asset.id} className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)]"><input type="checkbox" checked={returned.has(asset.id)} onChange={event => toggle([asset.id], event.target.checked)} /><span className="font-mono text-white">{asset.assetCode}</span><span className="text-xs">{asset.status}</span></label>)}</div>
                                </fieldset>;
                            })}</div>
                            {returnedIds.length > 0 && <label className="block space-y-1 text-sm text-[var(--zyllen-muted)]">Almoxarifado de devolução
                                <select required value={destinationId} onChange={event => setDestinationId(event.target.value)} className="w-full rounded-md border border-white/15 bg-[var(--zyllen-bg-dark)] px-3 py-2 text-white"><option value="">Selecione...</option>{warehouses.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
                            </label>}
                            <label className="block space-y-1 text-sm text-[var(--zyllen-muted)]">PIN de conferência<Input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={event => setPin(event.target.value)} /></label>
                            <p className="text-xs text-amber-200">Ao enviar, a operação aguardará aprovação. Só depois os itens marcados voltarão ao estoque e os demais receberão baixa por perda.</p>
                        </>}
                </>}
                {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
            </DialogBody>
            <DialogFooter><Button variant="outline" onClick={onClose} disabled={submit.isPending}>Fechar</Button>
                {snapshot && !snapshot.pendingApprovalId && snapshot.assets.length > 0 && <Button disabled={submit.isPending || pin.length !== 4 || (returnedIds.length > 0 && !destinationId)} onClick={() => { setError(''); submit.mutate(); }}>{submit.isPending ? 'Enviando...' : 'Enviar conferência para aprovação'}</Button>}
            </DialogFooter>
        </DialogContent>
    </Dialog>;
}
