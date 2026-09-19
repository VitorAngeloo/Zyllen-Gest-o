"use client";
import { useId, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { vehicleInputSchema, type VehicleRecord } from '@zyllen/shared';
import { toast } from 'sonner';
import { useAuthedFetch } from '@web/features/auth/context/auth-context';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@web/components/ui/dialog';
import { useDialogFocus } from '@web/lib/use-dialog-focus';
import { VEHICLES_COPY as copy } from '@web/lib/brand-voice';
import { vehicleApi } from '../api/vehicle-api';
export function VehicleDialog({ editing, onClose, onSaved }: { editing?: VehicleRecord; onClose: () => void; onSaved: () => Promise<void> }) {
    const options = useAuthedFetch(), ref = useRef<HTMLDivElement>(null), titleId = useId(), nameId = useId(), plateId = useId();
    const [form, setForm] = useState({ name: editing?.name ?? '', plate: editing?.plate ?? '', active: editing?.active ?? true });
    const [error, setError] = useState(''), requestId = useRef(crypto.randomUUID());
    const save = useMutation({ mutationFn: async () => {
        const parsed = vehicleInputSchema.safeParse({ ...form, plate: form.plate.trim() || null });
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        return editing ? vehicleApi.update(editing.id, parsed.data, options) : vehicleApi.create({ ...parsed.data, requestId: requestId.current }, options);
    }, onSuccess: () => { toast.success(copy.saved); onClose(); void onSaved(); }, onError: (e: Error) => setError(e.message) });
    useDialogFocus(ref, () => { if (!save.isPending) onClose(); });
    return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose(); }}><DialogContent ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClose={save.isPending ? undefined : onClose}>
        <DialogHeader><DialogTitle id={titleId}>{editing ? copy.edit : copy.create}</DialogTitle></DialogHeader><form onSubmit={event => { event.preventDefault(); setError(''); save.mutate(); }}>
            <DialogBody className="space-y-4"><label className="block text-sm text-white" htmlFor={nameId}>{copy.name}<Input id={nameId} value={form.name} maxLength={100} required onChange={event => setForm({ ...form, name: event.target.value })} /></label>
                <label className="block text-sm text-white" htmlFor={plateId}>{copy.plate}<Input id={plateId} value={form.plate} maxLength={8} onChange={event => setForm({ ...form, plate: event.target.value.toUpperCase() })} /></label>
                <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} />{copy.active}</label>
                {error && <p role="alert" className="text-sm text-red-200">{error}</p>}</DialogBody>
            <DialogFooter><Button type="button" variant="ghost" disabled={save.isPending} onClick={onClose}>{copy.cancel}</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? copy.saving : copy.save}</Button></DialogFooter>
        </form></DialogContent></Dialog>;
}
