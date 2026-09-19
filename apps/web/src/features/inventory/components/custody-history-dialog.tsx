"use client";
import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { InventoryTransferRecord } from '@zyllen/shared';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { apiClient } from '@web/lib/api-client';
import { useDialogFocus } from '@web/lib/use-dialog-focus';
import { CUSTODY_COPY as copy } from '@web/lib/brand-voice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@web/components/ui/dialog';
import { Button } from '@web/components/ui/button';

export function CustodyHistoryDialog({ record, onClose, onSaved }: { record: InventoryTransferRecord; onClose: () => void; onSaved: () => void }) {
    const ref = useRef<HTMLDivElement>(null), opts = useAuthedFetch(), { hasPermission } = useAuth();
    const [pin, setPin] = useState(''), [error, setError] = useState('');
    const mutation = useMutation({ mutationFn: (approved: boolean) => apiClient.post(`/inventory/approvals/${record.approvalRequestId}/${approved ? 'approve' : 'reject'}`, { pin }, opts), onSuccess: () => { onSaved(); onClose(); }, onError: (e: Error) => setError(e.message) });
    useDialogFocus(ref, onClose, mutation.isPending);
    return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose(); }}><DialogContent ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={copy.history} className="outline-none"><DialogHeader><DialogTitle>{copy.history}</DialogTitle></DialogHeader><DialogBody className="space-y-3">
        <p className="break-words">{record.fromLocation.name} → {record.toLocation.name}</p><p>{record.status === 'PENDING' ? copy.pending : record.status === 'REJECTED' ? copy.rejected : copy.completed}</p>
        <p className="text-sm text-[var(--zyllen-muted)]">Solicitado: {new Date(record.createdAt).toLocaleString('pt-BR')}{record.completedAt && ` · Realizado: ${new Date(record.completedAt).toLocaleString('pt-BR')}`}</p>
        <p className="whitespace-pre-wrap break-words">{record.reason}</p><ul className="space-y-1">{record.items.map(i => <li key={i.assetId} className="text-sm">{i.asset.assetCode}</li>)}</ul>
        {record.status === 'PENDING' && (hasPermission('approvals.approve') || hasPermission('approvals.reject')) && <><p className="text-sm text-amber-200">{copy.pendingNotice}</p><label className="block text-sm">{copy.pin}<input aria-label={copy.pin} type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} className="block w-full rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-2" /></label><div className="flex gap-2">{hasPermission('approvals.approve') && <Button disabled={mutation.isPending || pin.length !== 4} onClick={() => mutation.mutate(true)}>Aprovar</Button>}{hasPermission('approvals.reject') && <Button variant="outline" disabled={mutation.isPending || pin.length !== 4} onClick={() => mutation.mutate(false)}>Rejeitar</Button>}</div></>}
        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
    </DialogBody><DialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={onClose}>{copy.close}</Button></DialogFooter></DialogContent></Dialog>;
}
