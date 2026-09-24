"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink } from 'lucide-react';
import type { PanelId } from '@zyllen/shared';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@web/components/ui/dialog';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { useDialogFocus } from '@web/lib/use-dialog-focus';
import { MONITORING_PANEL_COPY as copy } from '@web/lib/brand-voice';
import { panelApi } from '../api/panel-api';
export function PanelMirrorDialog({ views, onClose }: { views: PanelId[]; onClose: () => void }) {
    const options = useAuthedFetch(), { user } = useAuth(), client = useQueryClient();
    const [selected, setSelected] = useState(views), [url, setUrl] = useState(''), [message, setMessage] = useState('');
    const ref = useRef<HTMLDivElement>(null), titleId = useId();
    const statusKey = ['panel-mirror-status', user?.id] as const;
    const status = useQuery({ queryKey: statusKey, queryFn: () => panelApi.status(options) });
    const generate = useMutation({ mutationFn: () => panelApi.generate(selected, options), onSuccess: async result => { setUrl(new URL(result.path, window.location.origin).href); setMessage(''); await client.invalidateQueries({ queryKey: ['panel-mirror-status'] }); }, onError: (error: Error) => setMessage(error.message) });
    const update = useMutation({ mutationFn: () => panelApi.updateMirror(selected, options), onSuccess: result => { client.setQueryData(statusKey, result); setMessage(copy.updated); }, onError: (error: Error) => setMessage(error.message) });
    const revoke = useMutation({ mutationFn: () => panelApi.revoke(options), onSuccess: async () => { setUrl(''); setMessage(copy.revoked); await client.invalidateQueries({ queryKey: ['panel-mirror-status'] }); }, onError: (error: Error) => setMessage(error.message) });
    const busy = generate.isPending || update.isPending || revoke.isPending;
    const availableKey = views.join('|');
    useDialogFocus(ref, onClose, busy);
    useEffect(() => {
        if (!status.data) return;
        setSelected(status.data.active ? status.data.views : availableKey.split('|').filter(Boolean) as PanelId[]);
    }, [availableKey, status.data?.active, status.data?.updatedAt]);
    useEffect(() => {
        // Revocation removes its focused button; keep keyboard interaction inside the dialog.
        if (!busy && !ref.current?.contains(document.activeElement)) ref.current?.focus({ preventScroll: true });
    }, [busy]);
    return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent ref={ref} role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby={titleId}>
        <DialogHeader><DialogTitle id={titleId}>{copy.mirror}</DialogTitle></DialogHeader><DialogBody className="space-y-4"><p className="text-sm text-[var(--zyllen-muted)]">{copy.mirrorContext}</p>
            {status.isError ? <div role="alert" className="space-y-2"><p>{copy.mirrorFailure}</p><Button size="sm" variant="outline" onClick={() => { void status.refetch(); }}>{copy.retry}</Button></div> : status.isLoading ? <p role="status">{copy.loading}</p> : <p className="text-xs text-[var(--zyllen-muted)]">{status.data?.active ? copy.activeLink : copy.noLink}</p>}
            <fieldset disabled={busy || status.isError || status.isLoading} className="space-y-2"><legend className="mb-2 text-sm font-medium">{copy.mirrorViews}</legend>{views.map(view => <label key={view} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(view)} onChange={() => setSelected(values => values.includes(view) ? values.filter(value => value !== view) : [...values, view])} />{copy.panels[view]}</label>)}</fieldset>
            {url && <div className="space-y-2"><label className="text-xs text-[var(--zyllen-muted)]">{copy.mirrorUrl}<Input aria-label={copy.mirrorUrl} readOnly value={url} onFocus={event => event.target.select()} /></label><div className="flex gap-3"><Button variant="outline" size="sm" aria-label={copy.copyMirror} onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage(copy.copied); } catch { setMessage(copy.copyError); } }}><Copy className="mr-2 h-4 w-4" />{copy.copyMirror}</Button><a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-[var(--zyllen-highlight)]"><ExternalLink className="h-4 w-4" />{copy.openMirror}</a></div></div>}
            {message && <p role="status" className="text-sm">{message}</p>}
        </DialogBody><DialogFooter className="flex-wrap"><Button variant="outline" disabled={busy} onClick={onClose}>{copy.close}</Button>{status.data?.active && <><Button variant="outline" disabled={busy} onClick={() => revoke.mutate()}>{copy.revoke}</Button><Button variant="outline" disabled={busy || !selected.length} onClick={() => generate.mutate()}>{copy.regenerate}</Button></>}<Button disabled={busy || !selected.length || !status.data || status.isError} onClick={() => status.data?.active ? update.mutate() : generate.mutate()}>{busy ? copy.saving : status.data?.active ? copy.update : copy.generate}</Button></DialogFooter>
    </DialogContent></Dialog>;
}
