"use client";
import { useState } from 'react';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { apiClient } from '@web/lib/api-client';
import { SECURITY_COPY } from '@web/lib/brand-voice';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../ui/dialog';
import { toast } from 'sonner';

type Kind = 'maintenance' | 'os-followup' | 'ticket' | 'followup' | 'item';
type Link = { id: string; expiresAt: string; revokedAt?: string | null; createdAt: string };
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** The server repeats this role check and verifies access to the attachment itself. */
export function ShareAttachment({ kind, id, fileName }: { kind: Kind; id: string; fileName: string }) {
    const { user, userType } = useAuth();
    const opts = useAuthedFetch();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [links, setLinks] = useState<Link[]>([]);
    const [url, setUrl] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [error, setError] = useState('');
    const canShare = userType === 'internal' && ['Administrador', 'Gestor'].includes((user as any)?.role?.name);
    if (!canShare) return null;
    const load = async () => {
        const response = await apiClient.get<{ data: Link[] }>(`/media/${kind}/${id}/shares`, opts);
        setLinks(response.data);
    };
    const show = async () => {
        setOpen(true); setUrl(''); setConfirmed(false); setError(''); setBusy(true);
        try { await load(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
    };
    const create = async () => {
        setBusy(true); setError('');
        try {
            const response = await apiClient.post<{ data: { id: string; expiresAt: string; url: string } }>(`/media/${kind}/${id}/shares`, {}, opts);
            setUrl(`${API}${response.data.url}`);
            toast.success(SECURITY_COPY.shareCreated);
            await load();
        } catch (e: any) { setError(e.message); } finally { setBusy(false); }
    };
    const revoke = async (linkId: string) => {
        setBusy(true); setError('');
        try { await apiClient.delete(`/media/shares/${linkId}`, opts); setUrl(''); await load(); toast.success(SECURITY_COPY.shareRevoked); }
        catch (e: any) { setError(e.message); } finally { setBusy(false); }
    };
    return <>
        <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={show}>Compartilhar</Button>
        <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
            <DialogContent role="dialog" aria-modal="true" aria-label="Compartilhar anexo"><DialogHeader><DialogTitle>Compartilhar anexo</DialogTitle></DialogHeader>
                <DialogBody><div className="space-y-4">
                    <p className="break-all">{fileName}</p>
                    <p>O link permite baixar somente este arquivo, sem login, durante 24 horas. Você pode revogar novos acessos, mas não apagar cópias já baixadas.</p>
                    <label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Autorizo o acesso de quem receber este link.</label>
                    {error && <p role="alert" className="text-red-400">{error}</p>}
                    {url && <div className="space-y-2"><label>Link criado (copie antes de fechar)<Input readOnly value={url} onFocus={e => e.target.select()} /></label><Button type="button" onClick={() => navigator.clipboard.writeText(url).then(() => toast.success('Link copiado'), () => toast.error('Selecione e copie o link no campo acima.'))}>Copiar link</Button></div>}
                    <div className="max-h-52 space-y-2 overflow-y-auto">
                        {links.map(link => <div key={link.id} className="flex items-center justify-between gap-3 border-t border-[var(--zyllen-border)] pt-2 text-sm">
                            <span>{link.revokedAt ? 'Revogado' : new Date(link.expiresAt) <= new Date() ? 'Expirado' : 'Ativo'} · até {new Date(link.expiresAt).toLocaleString('pt-BR')}</span>
                            {!link.revokedAt && new Date(link.expiresAt) > new Date() && <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => revoke(link.id)}>Revogar</Button>}
                        </div>)}
                        {!busy && links.length === 0 && <p>Nenhum link criado para este anexo.</p>}
                    </div>
                </div></DialogBody>
                <DialogFooter><Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Fechar</Button><Button type="button" disabled={busy || !confirmed} onClick={create}>{busy ? 'Aguarde...' : 'Criar link por 24 horas'}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    </>;
}
