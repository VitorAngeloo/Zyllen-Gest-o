"use client";
import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { CustodyLocation, CustodyOptions, LocationKind } from '@zyllen/shared';
import { apiClient } from '@web/lib/api-client';
import { useAuthedFetch } from '@web/features/auth/context/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@web/components/ui/dialog';
import { Button } from '@web/components/ui/button';
import { useDialogFocus } from '@web/lib/use-dialog-focus';
import { CUSTODY_COPY as copy } from '@web/lib/brand-voice';
import { custodyApi } from '../api/custody-api';

export function CustodyLocationDialog({ location, options, onClose, onSaved }: { location: CustodyLocation | null; options: CustodyOptions; onClose: () => void; onSaved: () => void }) {
    const ref = useRef<HTMLDivElement>(null), opts = useAuthedFetch();
    const [name, setName] = useState(location?.name ?? ''), [kind, setKind] = useState<LocationKind | ''>(location?.kind ?? ''), [company, setCompany] = useState(location?.companyId ?? ''), [project, setProject] = useState(location?.projectId ?? ''), [main, setMain] = useState(Boolean(location?.isMainWarehouse)), [error, setError] = useState('');
    const mutation = useMutation({ mutationFn: () => {
        const input = { name, kind: kind || null, companyId: kind === 'CLIENT' ? company || null : null, projectId: kind === 'CLIENT' ? project || null : null, isMainWarehouse: kind === 'INTERNAL' && main };
        return location ? custodyApi.updateLocation(location.id, input, opts) : apiClient.post('/locations', input, opts);
    }, onSuccess: () => { onSaved(); onClose(); }, onError: (e: Error) => setError(e.message) });
    useDialogFocus(ref, onClose, mutation.isPending);
    const control = 'w-full rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-2 text-white';
    return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose(); }}><DialogContent ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={copy.identify} className="outline-none"><DialogHeader><DialogTitle>{copy.identify}</DialogTitle></DialogHeader><form onSubmit={e => { e.preventDefault(); setError(''); mutation.mutate(); }}><DialogBody className="space-y-4"><fieldset disabled={mutation.isPending} className="space-y-4">
        <label className="block">Nome do local<input aria-label="Nome do local" required maxLength={200} value={name} onChange={e => setName(e.target.value)} className={control} /></label>
        <label className="block">Classificação<select aria-label="Classificação" value={kind} onChange={e => { setKind(e.target.value as typeof kind); setCompany(''); setProject(''); setMain(false); }} className={control}><option value="">{copy.unclassified}</option><option value="INTERNAL">{copy.internalLocation}</option><option value="CLIENT">{copy.clientLocation}</option></select></label>
        {kind === 'CLIENT' && <><label className="block">{copy.company}<select aria-label={copy.company} required value={company} onChange={e => { setCompany(e.target.value); setProject(''); }} className={control}><option value="">Selecione</option>{options.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="block">{copy.unit}<select aria-label={copy.unit} value={project} onChange={e => setProject(e.target.value)} className={control}><option value="">{copy.none}</option>{options.companies.find(c => c.id === company)?.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></>}
        {kind === 'INTERNAL' && <label className="flex gap-2 text-sm"><input type="checkbox" checked={main} onChange={e => setMain(e.target.checked)} />{copy.main}</label>}
        {location && !location.kind && <p className="text-sm text-amber-200">{copy.explicitMapping} {location._count.assets} patrimônio(s) neste local.</p>}
    </fieldset>{error && <p role="alert" className="text-red-200 text-sm">{error}</p>}</DialogBody><DialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>{copy.cancel}</Button><Button disabled={mutation.isPending}>{copy.save}</Button></DialogFooter></form></DialogContent></Dialog>;
}
