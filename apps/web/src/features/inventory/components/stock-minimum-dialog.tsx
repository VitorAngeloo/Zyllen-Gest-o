"use client";
import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { stockMinimumSchema, type StockMinimumInput } from '@zyllen/shared';
import { useAuthedFetch } from '@web/features/auth/context/auth-context';
import { INVENTORY_DASHBOARD_COPY as copy } from '@web/lib/brand-voice';
import { useDialogFocus } from '@web/lib/use-dialog-focus';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@web/components/ui/dialog';
import { Button } from '@web/components/ui/button';
import { inventoryStatisticsApi as api } from '../api/inventory-statistics-api';
export function StockMinimumDialog({ location, onClose, onSaved }: { location: { id: string; name: string }; onClose: () => void; onSaved: () => void }) {
    const ref = useRef<HTMLDivElement>(null), opts = useAuthedFetch();
    const [sku, setSku] = useState(''), [minimum, setMinimum] = useState(''), [high, setHigh] = useState(''), [error, setError] = useState('');
    const options = useQuery({ queryKey: ['minimum-options'], queryFn: () => api.options(opts) }), reserves = useQuery({ queryKey: ['stock-minimums', location.id], queryFn: () => api.minimums(location.id, opts) });
    const mutation = useMutation({ mutationFn: (apiInput: StockMinimumInput) => api.save(apiInput, opts), onSuccess: () => { onSaved(); onClose(); }, onError: (e: Error) => setError(e.message) });
    useDialogFocus(ref, onClose, mutation.isPending);
    const control = 'w-full rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-2';
    const loading = options.isPending || reserves.isPending, failed = options.isError || reserves.isError;
    return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose(); }}><DialogContent ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={copy.minimums} className="outline-none"><DialogHeader><DialogTitle>{copy.minimums}</DialogTitle></DialogHeader><form onSubmit={e => { e.preventDefault(); const result = stockMinimumSchema.safeParse({ skuId: sku, locationId: location.id, minimum: Number(minimum), highOutputThreshold: high === '' ? null : Number(high) }); if (!result.success) { setError(result.error.issues[0].message); return; } setError(''); mutation.mutate(result.data); }}><DialogBody className="space-y-4"><p className="text-sm">{location.name}</p>
        {loading ? <p>Carregando…</p> : failed ? <p role="alert" className="text-red-200">{copy.error} <button type="button" onClick={() => { void options.refetch(); void reserves.refetch(); }}>{copy.retry}</button></p> : <fieldset disabled={mutation.isPending} className="space-y-4"><label className="block text-sm">Produto<select aria-label="Produto" required value={sku} onChange={e => { setSku(e.target.value); const row = reserves.data?.data.find(r => r.skuId === e.target.value); setMinimum(row ? String(row.minimum) : ''); setHigh(row?.highOutputThreshold ? String(row.highOutputThreshold) : ''); }} className={control}><option value="">Selecione</option>{options.data?.data.map(s => <option value={s.id} key={s.id}>{s.name} · {s.skuCode}</option>)}</select></label>
            <label className="block text-sm">{copy.minimum}<input aria-label={copy.minimum} required type="number" min={0} max={1000000} step={1} value={minimum} onChange={e => setMinimum(e.target.value)} className={control} /></label><label className="block text-sm">{copy.highOutput}<input aria-label={copy.highOutput} type="number" min={1} max={1000000} step={1} value={high} onChange={e => setHigh(e.target.value)} className={control} /></label><p className="text-xs text-[var(--zyllen-muted)]">Sem limite de alta saída informado, o sistema usa giro somente para ordenar prioridades existentes. Ajuste o limite conforme a natureza do produto.</p>
        </fieldset>}{error && <p role="alert" className="text-sm text-red-200">{error}</p>}</DialogBody><DialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>Cancelar</Button><Button disabled={mutation.isPending || loading || failed}>Salvar reserva</Button></DialogFooter></form></DialogContent></Dialog>;
}
