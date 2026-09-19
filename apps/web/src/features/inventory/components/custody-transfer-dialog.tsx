"use client";
import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { inventoryTransferSchema, type CustodyAsset, type CustodyOptions, type InventoryTransferRecord, type InventoryTransferInput } from '@zyllen/shared';
import { useAuthedFetch } from '@web/features/auth/context/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@web/components/ui/dialog';
import { Button } from '@web/components/ui/button';
import { useDialogFocus } from '@web/lib/use-dialog-focus';
import { CUSTODY_COPY as copy } from '@web/lib/brand-voice';
import { custodyApi } from '../api/custody-api';

export function CustodyTransferDialog({ kind, options, onClose, onSaved }: { kind: InventoryTransferInput['kind']; options: CustodyOptions; onClose: () => void; onSaved: () => void }) {
    const opts = useAuthedFetch();
    const ref = useRef<HTMLDivElement>(null), submitting = useRef(false);
    const [from, setFrom] = useState(''), [to, setTo] = useState(''), [type, setType] = useState(''), [reason, setReason] = useState(''), [pin, setPin] = useState(''), [condition, setCondition] = useState<'ATIVO' | 'EM_MANUTENCAO'>('ATIVO');
    const [search, setSearch] = useState(''), [page, setPage] = useState(1), [selected, setSelected] = useState<Map<string, CustodyAsset>>(new Map()), [error, setError] = useState(''), [result, setResult] = useState<InventoryTransferRecord | null>(null);
    const signature = JSON.stringify([kind, from, to, type, reason.trim(), kind === 'RETURN' ? condition : null, [...selected.keys()].sort()]);
    const requestId = useMemo(() => crypto.randomUUID(), [signature]);
    const assets = useQuery({ queryKey: ['custody', 'selection', from, search, page], queryFn: () => custodyApi.assets(new URLSearchParams({ locationId: from, search, page: String(page), limit: '50' }), opts), enabled: Boolean(from), refetchInterval: 30000 });
    const mutation = useMutation({ mutationFn: (value: InventoryTransferInput) => custodyApi.transfer(value, opts), onSuccess: value => { setResult(value.data); setPin(''); onSaved(); }, onError: (e: Error) => setError(e.message), onSettled: () => { submitting.current = false; } });
    useDialogFocus(ref, onClose, mutation.isPending);
    const origins = options.locations.filter(l => l.kind === (kind === 'RETURN' ? 'CLIENT' : 'INTERNAL'));
    const destinations = options.locations.filter(l => l.id !== from && l.kind === (kind === 'SHIPMENT' ? 'CLIENT' : 'INTERNAL'));
    const title = kind === 'SHIPMENT' ? copy.shipment : kind === 'RETURN' ? copy.return : copy.internal;
    const control = 'w-full min-w-0 rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] px-3 py-2 text-white';
    function toggle(asset: CustodyAsset) { setSelected(previous => { const next = new Map(previous); if (next.has(asset.id)) next.delete(asset.id); else if (next.size < 100) next.set(asset.id, asset); return next; }); }
    function submit(event: React.FormEvent) {
        event.preventDefault(); if (submitting.current) return;
        const value = inventoryTransferSchema.safeParse({ requestId, kind, fromLocationId: from, toLocationId: to, movementTypeId: type, assetIds: [...selected.keys()], reason, pin, ...(kind === 'RETURN' ? { returnStatus: condition } : {}) });
        if (!value.success) { setError(value.error.issues[0]?.message ?? copy.noSelection); return; }
        submitting.current = true; setError(''); mutation.mutate(value.data);
    }
    return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose(); }}><DialogContent ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="max-w-3xl outline-none"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {result ? <><DialogBody><p role="status">{result.status === 'PENDING' ? copy.pendingNotice : result.status === 'REJECTED' ? copy.rejected : copy.doneNotice}</p><p className="mt-3 text-sm text-[var(--zyllen-muted)]">{result.items.length} patrimônio(s) · {result.fromLocation.name} → {result.toLocation.name}</p></DialogBody><DialogFooter><Button onClick={onClose}>{copy.close}</Button></DialogFooter></> : <form onSubmit={submit}><DialogBody className="space-y-4"><fieldset disabled={mutation.isPending} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2"><label>{copy.origin}<select required aria-label={copy.origin} value={from} onChange={e => { setFrom(e.target.value); setTo(''); setSelected(new Map()); setPage(1); }} className={control}><option value="">Selecione</option>{origins.map(l => <option key={l.id} value={l.id}>{l.name}{l.company ? ` · ${l.company.name}` : ''}</option>)}</select></label>
                <label>{copy.destination}<select required aria-label={copy.destination} value={to} onChange={e => setTo(e.target.value)} className={control}><option value="">Selecione</option>{destinations.map(l => <option key={l.id} value={l.id}>{l.name}{l.company ? ` · ${l.company.name}` : ''}</option>)}</select></label></div>
            <label className="block">{copy.type}<select required aria-label={copy.type} value={type} onChange={e => setType(e.target.value)} className={control}><option value="">Selecione</option>{options.movementTypes.map(t => <option key={t.id} value={t.id}>{t.name}{t.requiresApproval ? ` · ${copy.pending}` : ''}</option>)}</select></label>
            {kind === 'RETURN' && <label className="block">{copy.returnCondition}<select aria-label={copy.returnCondition} value={condition} onChange={e => setCondition(e.target.value as typeof condition)} className={control}><option value="ATIVO">{copy.available}</option><option value="EM_MANUTENCAO">{copy.maintenance}</option></select></label>}
            {from && <section aria-label={copy.select} className="space-y-2"><label className="block text-sm">Buscar por código ou produto<input aria-label="Buscar por código ou produto" className={control} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
                {assets.isError && <p role="alert" className="text-red-200">{copy.error} <button type="button" onClick={() => void assets.refetch()}>{copy.retry}</button></p>}
                {assets.isPending ? <p>Carregando patrimônios…</p> : assets.data?.data.length === 0 ? <p>{copy.empty}</p> : <div className="max-h-60 overflow-y-auto space-y-1">{assets.data?.data.map(a => <label key={a.id} className="flex gap-3 rounded-lg border border-[var(--zyllen-border)] p-3 text-sm"><input type="checkbox" checked={selected.has(a.id)} disabled={kind !== 'RETURN' && a.status !== 'ATIVO' || selected.size >= 100 && !selected.has(a.id)} onChange={() => toggle(a)} /><span className="min-w-0 break-words">{a.assetCode} · {a.sku.name}<span className="block text-[var(--zyllen-muted)]">{a.status === 'ATIVO' ? copy.available : a.status === 'EM_MANUTENCAO' ? copy.maintenance : copy.inUse}</span></span></label>)}</div>}
                <div className="flex items-center justify-between gap-2 text-sm"><Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>{copy.previous}</Button><span>{page} / {Math.max(1, Math.ceil((assets.data?.total ?? 0) / 50))}</span><Button type="button" variant="outline" disabled={!assets.data || page * 50 >= assets.data.total} onClick={() => setPage(page + 1)}>{copy.next}</Button></div>
            </section>}
            <p className="text-sm">{copy.selected}: {selected.size} / 100</p>{selected.size > 0 && <div className="flex gap-2 flex-wrap">{[...selected.values()].map(a => <button type="button" key={a.id} onClick={() => toggle(a)} aria-label={`Remover ${a.assetCode}`} className="rounded border border-[var(--zyllen-border)] px-2 py-1 text-xs">{a.assetCode} ×</button>)}</div>}
            <label className="block">{copy.reason}<textarea aria-label={copy.reason} required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} className={control} /></label>
            <label className="block">{copy.pin}<input aria-label={copy.pin} required type="password" inputMode="numeric" autoComplete="off" maxLength={4} pattern="[0-9]{4}" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} className={control} /></label>
        </fieldset>{error && <p role="alert" className="text-sm text-red-200">{error}</p>}</DialogBody><DialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>{copy.cancel}</Button><Button type="submit" disabled={mutation.isPending || selected.size === 0}>{mutation.isPending ? 'Registrando…' : copy.confirm}</Button></DialogFooter></form>}
    </DialogContent></Dialog>;
}
