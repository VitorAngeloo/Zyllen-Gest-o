"use client";
import { useId, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { VehicleDashboard } from '@zyllen/shared';
import { toast } from 'sonner';
import { useAuthedFetch } from '@web/features/auth/context/auth-context';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@web/components/ui/dialog';
import { useDialogFocus } from '@web/lib/use-dialog-focus';
import { vehicleApi } from '../api/vehicle-api';

type VehicleUsage = VehicleDashboard['byVehicle'][number];

export function VehicleServiceDialog({ vehicle, onClose, onSaved }: { vehicle: VehicleUsage; onClose: () => void; onSaved: () => Promise<void> }) {
    const options = useAuthedFetch(), ref = useRef<HTMLDivElement>(null), titleId = useId(), odometerId = useId();
    const [odometer, setOdometer] = useState(vehicle.currentOdometer === null ? '' : String(vehicle.currentOdometer));
    const [error, setError] = useState('');
    const save = useMutation({ mutationFn: () => vehicleApi.registerService(vehicle.id, { odometer: Number(odometer) }, options), onSuccess: () => { toast.success('Revisão registrada. A contagem de 5.000 km foi reiniciada.'); onClose(); void onSaved(); }, onError: (failure: Error) => setError(failure.message) });
    useDialogFocus(ref, () => { if (!save.isPending) onClose(); });
    return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose(); }}><DialogContent ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClose={save.isPending ? undefined : onClose}>
        <DialogHeader><DialogTitle id={titleId}>Registrar revisão · {vehicle.name}</DialogTitle><DialogDescription>Use esta ação depois que a revisão for concluída. O hodômetro informado vira o início do próximo ciclo de 5.000 km.</DialogDescription></DialogHeader>
        <form onSubmit={event => { event.preventDefault(); setError(''); save.mutate(); }}><DialogBody className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3 text-sm text-[var(--zyllen-muted)]">Leitura mais recente: <strong className="text-white">{vehicle.currentOdometer === null ? 'ainda não registrada' : `${vehicle.currentOdometer.toLocaleString('pt-BR')} km`}</strong></div>
            <label className="block text-sm text-white" htmlFor={odometerId}>Hodômetro no momento da revisão *<Input id={odometerId} type="number" inputMode="numeric" step="1" min={vehicle.currentOdometer ?? 0} max="9999999" required value={odometer} onChange={event => setOdometer(event.target.value)} disabled={save.isPending} /></label>
            {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
        </DialogBody><DialogFooter><Button type="button" variant="ghost" disabled={save.isPending} onClick={onClose}>Cancelar</Button><Button type="submit" variant="highlight" disabled={save.isPending || odometer === ''}>{save.isPending ? 'Registrando…' : 'Confirmar revisão concluída'}</Button></DialogFooter></form>
    </DialogContent></Dialog>;
}
