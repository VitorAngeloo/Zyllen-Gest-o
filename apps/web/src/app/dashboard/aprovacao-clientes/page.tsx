"use client";

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api-client';
import { useAuth, useAuthedFetch } from '@web/lib/auth-context';
import { SECURITY_COPY } from '@web/lib/brand-voice';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@web/components/ui/dialog';
import { toast } from 'sonner';

type ClientRequest = { id: string; name: string; email: string; phone?: string; companyId?: string; companyName?: string; companyCnpj?: string; projectId?: string; status: string; createdAt: string; rejectionReason?: string };
type Option = { id: string; name: string };
const fieldClass = 'w-full rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] p-2';

export default function ClientApprovalsPage() {
    const { user, userType, isLoading: authLoading } = useAuth();
    const allowed = userType === 'internal' && ['Administrador', 'Gestor'].includes((user as any)?.role?.name);
    const opts = useAuthedFetch();
    const qc = useQueryClient();
    const [status, setStatus] = useState('PENDING');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<ClientRequest | null>(null);
    const [companyId, setCompanyId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [companyCnpj, setCompanyCnpj] = useState('');
    const [createCompany, setCreateCompany] = useState(false);
    const [reason, setReason] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const requests = useQuery({ queryKey: ['client-requests', status, page], enabled: allowed,
        queryFn: () => apiClient.get<{ data: ClientRequest[]; total: number }>(`/register/client-requests?status=${status}&page=${page}&limit=25`, opts) });
    const companies = useQuery({ queryKey: ['approval-company-options'], enabled: allowed,
        queryFn: () => apiClient.get<{ data: Option[] }>('/clients/companies/search', opts) });
    const projects = useQuery({ queryKey: ['approval-project-options', companyId], enabled: allowed && !!companyId && !createCompany,
        queryFn: () => apiClient.get<{ data: Option[] }>(`/clients/companies/${companyId}/projects-public`, opts) });

    const open = (request: ClientRequest) => {
        setSelected(request); setCompanyId(request.companyId ?? ''); setProjectId(request.projectId ?? '');
        setCompanyName(request.companyName ?? ''); setCompanyCnpj(request.companyCnpj ?? '');
        setCreateCompany(!request.companyId); setReason(''); setConfirmed(false);
    };
    const decide = async (approve: boolean) => {
        if (!selected || busy) return;
        setBusy(true);
        try {
            const body = approve ? (createCompany ? { companyName, companyCnpj: companyCnpj || undefined } : { companyId, projectId: projectId || undefined }) : { reason };
            await apiClient.post(`/register/client-requests/${selected.id}/${approve ? 'approve' : 'reject'}`, body, opts);
            toast.success(approve ? SECURITY_COPY.approved : SECURITY_COPY.rejected);
            setSelected(null);
            await qc.invalidateQueries({ queryKey: ['client-requests'] });
            await qc.invalidateQueries({ queryKey: ['external-users'] });
            await qc.invalidateQueries({ queryKey: ['approval-company-options'] });
        } catch (error: any) { toast.error(error.message); }
        finally { setBusy(false); }
    };

    if (authLoading) return <p>Carregando...</p>;
    if (!allowed) return <p>{SECURITY_COPY.managerOnly}</p>;
    return <div className="space-y-5">
        <div><h1 className="text-2xl font-semibold">{SECURITY_COPY.registrationTitle}</h1><p className="text-[var(--zyllen-muted)]">{SECURITY_COPY.registrationDescription}</p></div>
        <label className="block max-w-xs">Situação<select className={fieldClass} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="PENDING">Pendentes</option><option value="APPROVED">Aprovadas</option><option value="REJECTED">Rejeitadas</option>
        </select></label>
        {requests.isLoading && <p>Carregando solicitações...</p>}
        {requests.isError && <p role="alert">Não foi possível carregar as solicitações. <Button onClick={() => requests.refetch()}>Tentar novamente</Button></p>}
        {requests.data?.data.length === 0 && <p>{SECURITY_COPY.noPending}</p>}
        {requests.data?.data.map(request => <Card key={request.id}>
            <CardHeader><CardTitle>{request.name}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
                <p>{request.email} {request.phone && `· ${request.phone}`}</p>
                <p>Empresa solicitada: {companies.data?.data.find(c => c.id === request.companyId)?.name ?? request.companyName ?? request.companyId ?? 'Não informada'}</p>
                <p className="text-sm text-[var(--zyllen-muted)]">Enviada em {new Date(request.createdAt).toLocaleString('pt-BR')}</p>
                {request.rejectionReason && <p>Motivo: {request.rejectionReason}</p>}
                {status === 'PENDING' && <Button onClick={() => open(request)}>Analisar solicitação</Button>}
            </CardContent>
        </Card>)}
        <div className="flex items-center gap-3"><Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button><span>Página {page}</span><Button disabled={!requests.data || page * 25 >= requests.data.total} onClick={() => setPage(p => p + 1)}>Próxima</Button></div>
        <Dialog open={!!selected} onOpenChange={open => { if (!open && !busy) setSelected(null); }}>
            <DialogContent role="dialog" aria-modal="true" aria-label="Autorizar cliente"><DialogHeader><DialogTitle>Autorizar {selected?.name}</DialogTitle></DialogHeader>
                <DialogBody><div className="space-y-4">
                    <p>Confira a identidade do solicitante e o vínculo com a empresa por um canal de confiança. Os dados enviados no cadastro não comprovam autorização.</p>
                    <label className="flex gap-2"><input type="checkbox" checked={createCompany} onChange={e => { setCreateCompany(e.target.checked); setProjectId(''); setConfirmed(false); }} />Cadastrar nova empresa</label>
                    {createCompany ? <>
                        <label className="block">Nome da empresa<Input value={companyName} maxLength={200} onChange={e => { setCompanyName(e.target.value); setConfirmed(false); }} /></label>
                        <label className="block">CNPJ<Input value={companyCnpj} maxLength={30} onChange={e => setCompanyCnpj(e.target.value)} /></label>
                    </> : <>
                        <label className="block">Empresa autorizada<select className={fieldClass} value={companyId} onChange={e => { setCompanyId(e.target.value); setProjectId(''); setConfirmed(false); }}><option value="">Selecione...</option>{companies.data?.data.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                        <label className="block">Projeto (opcional)<select className={fieldClass} value={projectId} disabled={!companyId || projects.isLoading} onChange={e => { setProjectId(e.target.value); setConfirmed(false); }}><option value="">Sem projeto</option>{projects.data?.data.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                        {projects.isError && <p role="alert">Falha ao carregar projetos. Tente novamente antes de aprovar.</p>}
                    </>}
                    <label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Conferi a identidade e autorizo acesso aos dados desta empresa.</label>
                    <label className="block">Motivo, se rejeitar<Input value={reason} maxLength={500} onChange={e => setReason(e.target.value)} placeholder="Informe o motivo da rejeição" /></label>
                </div></DialogBody>
                <DialogFooter><Button variant="ghost" disabled={busy} onClick={() => setSelected(null)}>Cancelar</Button><Button variant="destructive" disabled={busy || reason.trim().length < 3} onClick={() => decide(false)}>Rejeitar</Button><Button disabled={busy || !confirmed || (createCompany ? companyName.trim().length < 2 : !companyId || projects.isError)} onClick={() => decide(true)}>{busy ? 'Salvando...' : 'Aprovar acesso'}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    </div>;
}
