"use client";

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api-client';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { SECURITY_COPY } from '@web/lib/brand-voice';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Select } from '@web/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@web/components/ui/dialog';
import { PageHeader } from '@web/components/ui/page-header';
import { EmptyState, ListSectionHeader, WorkspaceBar, WorkspaceGroup } from '@web/components/ui/workspace';
import { ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

type ClientRequest = { id: string; name: string; email: string; phone?: string; companyId?: string; companyName?: string; companyCnpj?: string; projectId?: string; status: string; createdAt: string; rejectionReason?: string };
type Option = { id: string; name: string };

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
    return <div className="space-y-6">
        <PageHeader
            eyebrow="Gestão de acesso"
            title={SECURITY_COPY.registrationTitle}
            description={SECURITY_COPY.registrationDescription}
        />

        <WorkspaceBar>
            <WorkspaceGroup label="Filtrar solicitações" className="w-full max-w-xs">
            <label className="block space-y-1.5 text-sm text-[var(--zyllen-muted)]">
                <span className="sr-only">Situação</span>
                <Select value={status} onValueChange={value => { setStatus(value); setPage(1); }} aria-label="Situação das solicitações">
                    <option value="PENDING">Pendentes</option>
                    <option value="APPROVED">Aprovadas</option>
                    <option value="REJECTED">Rejeitadas</option>
                </Select>
            </label>
            </WorkspaceGroup>
        </WorkspaceBar>

        <ListSectionHeader
            title="Solicitações"
            count={requests.data?.total}
            description="Revise a identidade, a empresa e o projeto antes de liberar o acesso."
        />

        {requests.isLoading && <p role="status" className="text-sm text-[var(--zyllen-muted)]">Carregando solicitações...</p>}
        {requests.isError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-red-400/30 bg-red-400/[0.06] p-4 text-sm text-red-100"><p>Não foi possível carregar as solicitações.</p><Button variant="outline" size="sm" onClick={() => requests.refetch()}>Tentar novamente</Button></div>}
        {requests.data?.data.length === 0 && <EmptyState icon={<ClipboardCheck size={22} />} title={SECURITY_COPY.noPending} description="Altere a situação acima para consultar solicitações já analisadas." />}
        <div className="divide-y divide-white/10 border-y border-white/10">
            {requests.data?.data.map(request => <article key={request.id} className="py-5">
                <div className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
                    <div>
                        <h3 className="text-base font-semibold text-white">{request.name}</h3>
                        <p className="mt-1 text-sm text-[var(--zyllen-muted)]">{request.email} {request.phone && `· ${request.phone}`}</p>
                    </div>
                    {status === 'PENDING' && <Button size="sm" onClick={() => open(request)}>Analisar solicitação</Button>}
                </div>
                <div className="space-y-1 text-sm">
                    <p>Empresa solicitada: <span className="text-white">{companies.data?.data.find(c => c.id === request.companyId)?.name ?? request.companyName ?? request.companyId ?? 'Não informada'}</span></p>
                    <p className="text-[var(--zyllen-muted)]">Enviada em {new Date(request.createdAt).toLocaleString('pt-BR')}</p>
                    {request.rejectionReason && <p>Motivo: {request.rejectionReason}</p>}
                </div>
            </article>)}
        </div>
        <nav aria-label="Paginação das solicitações" className="flex items-center justify-between gap-3 text-sm text-[var(--zyllen-muted)]"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button><span>Página {page}</span><Button size="sm" variant="outline" disabled={!requests.data || page * 25 >= requests.data.total} onClick={() => setPage(p => p + 1)}>Próxima</Button></nav>
        <Dialog open={!!selected} onOpenChange={open => { if (!open && !busy) setSelected(null); }}>
            <DialogContent role="dialog" aria-modal="true" aria-label="Autorizar cliente"><DialogHeader><DialogTitle>Autorizar {selected?.name}</DialogTitle></DialogHeader>
                <DialogBody><div className="space-y-4">
                    <p>Confira a identidade do solicitante e o vínculo com a empresa por um canal de confiança. Os dados enviados no cadastro não comprovam autorização.</p>
                    <label className="flex gap-2"><input className="mt-0.5 size-4 accent-[var(--zyllen-highlight)]" type="checkbox" checked={createCompany} onChange={e => { setCreateCompany(e.target.checked); setProjectId(''); setConfirmed(false); }} />Cadastrar nova empresa</label>
                    {createCompany ? <>
                        <label className="block space-y-1.5">Nome da empresa<Input value={companyName} maxLength={200} onChange={e => { setCompanyName(e.target.value); setConfirmed(false); }} /></label>
                        <label className="block space-y-1.5">CNPJ<Input value={companyCnpj} maxLength={30} onChange={e => setCompanyCnpj(e.target.value)} /></label>
                    </> : <>
                        <label className="block space-y-1.5">Empresa autorizada<Select value={companyId} onValueChange={value => { setCompanyId(value); setProjectId(''); setConfirmed(false); }}><option value="">Selecione...</option>{companies.data?.data.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></label>
                        <label className="block space-y-1.5">Projeto (opcional)<Select value={projectId} disabled={!companyId || projects.isLoading} onValueChange={value => { setProjectId(value); setConfirmed(false); }}><option value="">Sem projeto</option>{projects.data?.data.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></label>
                        {projects.isError && <p role="alert">Falha ao carregar projetos. Tente novamente antes de aprovar.</p>}
                    </>}
                    <label className="flex gap-2"><input className="mt-0.5 size-4 accent-[var(--zyllen-highlight)]" type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Conferi a identidade e autorizo acesso aos dados desta empresa.</label>
                    <label className="block space-y-1.5">Motivo, se rejeitar<Input value={reason} maxLength={500} onChange={e => setReason(e.target.value)} placeholder="Informe o motivo da rejeição" /></label>
                </div></DialogBody>
                <DialogFooter><Button variant="ghost" disabled={busy} onClick={() => setSelected(null)}>Cancelar</Button><Button variant="destructive" disabled={busy || reason.trim().length < 3} onClick={() => decide(false)}>Rejeitar</Button><Button disabled={busy || !confirmed || (createCompany ? companyName.trim().length < 2 : !companyId || projects.isError)} onClick={() => decide(true)}>{busy ? 'Salvando...' : 'Aprovar acesso'}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    </div>;
}
