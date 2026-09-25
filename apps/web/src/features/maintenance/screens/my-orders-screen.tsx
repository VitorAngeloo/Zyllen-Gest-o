"use client";
import { maintenanceApi } from "@web/features/maintenance/api/maintenance-api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth, useAuthedFetch } from "@web/features/auth/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Badge } from "@web/components/ui/badge";
import { PageHeader } from "@web/components/ui/page-header";
import { EmptyState, ListSectionHeader, RecordList, RecordRow, WorkspaceBar, WorkspaceGroup } from "@web/components/ui/workspace";
import { toast } from "sonner";
import { FileText, ChevronRight, ArrowLeft, Edit, CheckSquare, Printer, Lock } from "lucide-react";
import { printOsPdf } from "@web/features/maintenance/utils/os-pdf";
import { Skeleton } from "@web/components/ui/skeleton";
import { OS_FORM_CONFIG } from "@web/features/maintenance/components/os-forms";
import type { OsFormType, OsFormSubmitData } from "@web/features/maintenance/components/os-forms";
import { OsFormWizard } from "@web/features/maintenance/components/os-forms";
import { getOsFieldRows } from "@web/features/maintenance/utils/os-form-view";
import { uploadMaintenanceAttachments } from "@web/features/maintenance/utils/maintenance-attachments";
import { MediaUploader } from "@web/features/maintenance/components/os-forms/media-uploader";
import type { MediaAttachment } from "@web/features/maintenance/components/os-forms/media-uploader";
import { OSFollowupSection } from "@web/features/maintenance/components/os-forms/os-followup-section";
import { OsListPagination } from "@web/features/maintenance/components/os-list-pagination";

type View = "list" | "detail" | "edit";
type ListTab = "all" | "mine" | "collaborators" | "contractors";
const PAGE_SIZE = 50;

const STATUS_CONFIG: Record<string, { label: string; variant: "warning" | "default" | "success" }> = {
    OPEN: { label: "Aberta", variant: "warning" },
    IN_PROGRESS: { label: "Em Andamento", variant: "default" },
    CLOSED: { label: "Encerrada", variant: "success" },
};

export default function MinhasOsPage() {
    const { user } = useAuth();
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [view, setView] = useState<View>("list");
    const [selectedOS, setSelectedOS] = useState<any>(null);
    const [listTab, setListTab] = useState<ListTab>("all");
    const [statusFilter, setStatusFilter] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [detailAttachments, setDetailAttachments] = useState<MediaAttachment[]>([]);

    const fetchDetailAttachments = async (osId: string) => {
        try {
            const res = await maintenanceApi.listInternalAttachments<{ data?: MediaAttachment[] | { data?: MediaAttachment[] } }>(osId, fetchOpts);
            const list = Array.isArray(res?.data)
                ? res.data
                : Array.isArray((res?.data as any)?.data)
                    ? (res?.data as any).data
                    : [];
            setDetailAttachments(list);
        } catch {
            setDetailAttachments([]);
        }
    };

    const isManager = user?.type === "internal" && (user.role.name === "Administrador" || user.role.name === "Gestor");
    const scope = isManager ? listTab : "mine";
    const { data: osList, isLoading: loading, isError, refetch } = useQuery({
        queryKey: ["maintenance-orders", scope, statusFilter, search, page],
        queryFn: () => {
            const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
            if (statusFilter) query.set("status", statusFilter);
            if (search) query.set("search", search);
            if (scope === "mine") return maintenanceApi.listMyOrders<{ data: any[]; total: number }>(`?${query}`, fetchOpts);
            if (scope === "collaborators") query.set("origin", "INTERNAL");
            if (scope === "contractors") query.set("origin", "CONTRACTOR");
            return maintenanceApi.listFilteredOrders<{ data: any[]; total: number }>(`?${query}`, fetchOpts);
        },
        enabled: !!user,
    });
    const displayList = osList?.data ?? [];
    const selectScope = (next: ListTab) => { setListTab(next); setPage(1); };

    const handleSaveDraft = async (data: OsFormSubmitData) => {
        if (!selectedOS) return;
        setSubmitting(true);
        try {
            const { localFiles, ...payload } = data;
            const response = await maintenanceApi.updateFormData<{ data: any }>(selectedOS.id, payload, fetchOpts);
            try {
                await uploadMaintenanceAttachments("/maintenance", selectedOS.id, localFiles, fetchOpts);
            } catch (uploadError) {
                toast.warning("O rascunho foi salvo, mas os anexos não foram enviados. Eles continuam pendentes para você tentar novamente.");
                qc.invalidateQueries({ queryKey: ["maintenance-orders"] });
                return { ...response.data, attachmentsUploaded: false };
            }
            setSelectedOS((current: any) => current ? { ...current, ...response.data } : current);
            toast.success("Rascunho salvo");
            qc.invalidateQueries({ queryKey: ["maintenance-orders"] });
            return response.data;
        } catch (e: any) {
            toast.error(e.message || "Erro ao salvar");
            throw e;
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = useMutation({
        mutationFn: (params: { id: string; status: string }) =>
            maintenanceApi.updateStatus(params.id, { status: params.status, notes: params.status === "CLOSED" ? "Finalizado" : undefined }, fetchOpts),
        onSuccess: () => {
            toast.success("Status atualizado");
            qc.invalidateQueries({ queryKey: ["maintenance-orders"] });
        },
        onError: (e: any) => toast.error(e.message || "Erro ao atualizar status"),
    });

    const handleFinalize = () => {
        if (!selectedOS) return;
        if (confirm("Tem certeza que deseja finalizar esta OS? Após finalizada, ela ficará em modo somente-leitura.")) {
            updateStatus.mutate({ id: selectedOS.id, status: "CLOSED" });
        }
    };

    const handlePrintPdf = async () => {
        if (!selectedOS) return;
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        let followupBlocks: any[] = [];
        if (selectedOS.formType === "INSTALACAO_SALA") {
            try {
                const res = await maintenanceApi.listInternalFollowupBlocks<{ data: any[] }>(selectedOS.id, fetchOpts);
                followupBlocks = (res?.data ?? []).map((b: any) => ({
                    ...b,
                    attachments: (b.attachments ?? []).map((a: any) => ({
                        ...a,
                        fileUrl: `${apiBase}/media/os-followup/${encodeURIComponent(a.id)}/file`,
                    })),
                }));
            } catch { /* ignore */ }
        }
        printOsPdf({
            osNumber: selectedOS.osNumber || "OS",
            formType: OS_FORM_CONFIG[selectedOS.formType as OsFormType]?.label || selectedOS.formType,
            status: selectedOS.status,
            clientName: selectedOS.clientName,
            clientCity: selectedOS.clientCity,
            clientState: selectedOS.clientState,
            location: selectedOS.location,
            contactName: selectedOS.contactName,
            contactPhone: selectedOS.contactPhone,
            startedAt: selectedOS.startedAt,
            endedAt: selectedOS.endedAt,
            openedBy: selectedOS.openedBy?.name || selectedOS.openedByContractor?.name,
            createdAt: selectedOS.createdAt,
            formData: selectedOS.formData,
            asset: selectedOS.asset,
            attachments: detailAttachments.map((att) => ({
                id: att.id,
                fileName: att.fileName,
                mimeType: att.mimeType,
                fileUrl: `${apiBase}/media/maintenance/${encodeURIComponent(att.id)}/file`,
            })),
            followupBlocks,
        });
    };

    const handleEditSubmit = async (data: OsFormSubmitData) => {
        if (!selectedOS) return;
        setSubmitting(true);
        try {
            const { localFiles, ...payload } = data;
            const response = await maintenanceApi.updateFormData<{ data: any }>(selectedOS.id, payload, fetchOpts);
            try {
                await uploadMaintenanceAttachments("/maintenance", selectedOS.id, localFiles, fetchOpts);
            } catch (uploadError) {
                toast.warning("Os dados da OS foram salvos, mas os anexos não foram enviados. Eles continuam pendentes para você tentar novamente.");
                qc.invalidateQueries({ queryKey: ["maintenance-orders"] });
                return { ...response.data, attachmentsUploaded: false };
            }
            setSelectedOS((current: any) => current ? { ...current, ...response.data } : current);
            toast.success("OS atualizada");
            qc.invalidateQueries({ queryKey: ["maintenance-orders"] });
            setView("list");
            setSelectedOS(null);
            return response.data;
        } catch (e: any) {
            toast.error(e.message || "Erro ao atualizar");
            throw e;
        } finally {
            setSubmitting(false);
        }
    };

    // ── Edit view ──
    if (view === "edit" && selectedOS) {
        return (
            <OsFormWizard
                userContext="internal"
                editMode
                readOnly={selectedOS.status === "CLOSED" || !!(selectedOS.formData as any)?.witnessSignature || !!(selectedOS.formData as any)?.technicianSignature}
                initialData={{
                    id: selectedOS.id,
                    formType: selectedOS.formType as OsFormType,
                    clientName: selectedOS.clientName || "",
                    clientCity: selectedOS.clientCity || "",
                    clientState: selectedOS.clientState || "",
                    location: selectedOS.location || "",
                    contactName: selectedOS.contactName || "",
                    contactPhone: selectedOS.contactPhone || "",
                    startedAt: selectedOS.startedAt ? new Date(selectedOS.startedAt).toISOString().slice(0, 16) : "",
                    endedAt: selectedOS.endedAt ? new Date(selectedOS.endedAt).toISOString().slice(0, 16) : "",
                    formData: selectedOS.formData || {},
                    expectedUpdatedAt: selectedOS.updatedAt,
                }}
                onSubmit={handleEditSubmit}
                onSaveDraft={handleSaveDraft}
                onCancel={() => { setView("list"); setSelectedOS(null); }}
                submitting={submitting}
            />
        );
    }

    // ── Detail view ──
    if (view === "detail" && selectedOS) {
        const formTypeLabel = OS_FORM_CONFIG[selectedOS.formType as OsFormType]?.label || selectedOS.formType || "—";
        const statusCfg = STATUS_CONFIG[selectedOS.status] || STATUS_CONFIG.OPEN;
        const formRows = getOsFieldRows(selectedOS.formType, selectedOS.formData);
        const isInstalacaoSala = selectedOS.formType === "INSTALACAO_SALA";
        const isSignatureLocked = !!(selectedOS.formData as any)?.witnessSignature || !!(selectedOS.formData as any)?.technicianSignature;

        return (
            <div className="space-y-6">
                <button
                    onClick={() => { setView("list"); setSelectedOS(null); setDetailAttachments([]); }}
                    className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-white">{selectedOS.clientName || "Cliente"}</CardTitle>
                                <p className="text-sm text-[var(--zyllen-muted)] mt-1">
                                    {selectedOS.osNumber ? `${selectedOS.osNumber} · ${formTypeLabel}` : formTypeLabel}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                                {selectedOS.status !== "CLOSED" && !isSignatureLocked && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setView("edit")}
                                        className="border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-white"
                                    >
                                        <Edit size={14} className="mr-1" /> Editar
                                    </Button>
                                )}
                                {isSignatureLocked && (
                                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        <Lock size={11} /> Assinado
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-[var(--zyllen-muted)]">Empresa / Cliente:</span>
                                <p className="text-white">{selectedOS.clientName || "—"}</p>
                            </div>
                            <div>
                                <span className="text-[var(--zyllen-muted)]">Cidade/UF:</span>
                                <p className="text-white">{[selectedOS.clientCity, selectedOS.clientState].filter(Boolean).join("/") || "—"}</p>
                            </div>
                            <div>
                                <span className="text-[var(--zyllen-muted)]">Aberto por:</span>
                                <p className="text-white">{selectedOS.openedBy?.name || selectedOS.openedByContractor?.name || "—"}</p>
                            </div>
                            <div>
                                <span className="text-[var(--zyllen-muted)]">Criado em:</span>
                                <p className="text-white">{new Date(selectedOS.createdAt).toLocaleDateString("pt-BR")}</p>
                            </div>
                            {selectedOS.location && (
                                <div className="col-span-2">
                                    <span className="text-[var(--zyllen-muted)]">Endereço:</span>
                                    <p className="text-white">{selectedOS.location}</p>
                                </div>
                            )}
                            {(selectedOS.contactName || selectedOS.contactPhone) && (
                                <div className="col-span-2">
                                    <span className="text-[var(--zyllen-muted)]">Contato no local:</span>
                                    <p className="text-white">
                                        {[selectedOS.contactName, selectedOS.contactPhone].filter(Boolean).join(" · ")}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-[var(--zyllen-muted)]">Detalhes do serviço:</span>
                                {isSignatureLocked && (
                                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                                        <Lock size={9} /> Bloqueado após assinatura
                                    </span>
                                )}
                            </div>
                            {formRows.length > 0 ? (
                                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    {formRows.map((row) => (
                                        <div key={row.key} className="bg-[var(--zyllen-bg-dark)] rounded-md px-3 py-2 border border-[var(--zyllen-border)]/50">
                                            <span className="text-[var(--zyllen-muted)] text-xs">{row.label}:</span>
                                            {row.isSignature ? (
                                                <div className="mt-2 rounded-md border border-[var(--zyllen-border)] bg-white p-2">
                                                    <img src={row.rawValue as string} alt={row.label} className="w-full h-24 object-contain" />
                                                </div>
                                            ) : (
                                                <p className={`${row.isEmpty ? "text-[var(--zyllen-muted)] italic" : "text-white"}`}>
                                                    {row.displayValue}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[var(--zyllen-muted)] text-sm italic mt-2">Sem campos definidos para este tipo de formulário.</p>
                            )}
                        </div>

                        {detailAttachments.length > 0 && (
                            <div>
                                <span className="text-sm text-[var(--zyllen-muted)]">Fotos / Vídeos:</span>
                                <div className="mt-2">
                                    <MediaUploader
                                        osId={selectedOS.id}
                                        attachments={detailAttachments}
                                        apiBasePath="/maintenance"
                                        readOnly
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── Acompanhamento de 7 dias (INSTALACAO_SALA only) ── */}
                        {isInstalacaoSala && (
                            <div className="pt-2 border-t border-[var(--zyllen-border)]">
                                <OSFollowupSection
                                    osId={selectedOS.id}
                                    apiBasePath="/maintenance"
                                    fetchOpts={fetchOpts}
                                    readOnly={selectedOS.status === "CLOSED"}
                                />
                            </div>
                        )}

                        <div className="flex gap-2 pt-4 border-t border-[var(--zyllen-border)]">
                            {selectedOS.status !== "CLOSED" && (
                                <Button
                                    variant="highlight"
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={handleFinalize}
                                >
                                    <CheckSquare size={16} className="mr-2" />
                                    Finalizar OS
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={handlePrintPdf}
                                className="border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-white"
                            >
                                <Printer size={16} className="mr-2" />
                                Gerar PDF
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── List view ──
    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Atendimento"
                title={isManager ? "Ordens de serviço" : "Minhas ordens de serviço"}
                description="Acompanhe o andamento, consulte os registros do serviço e identifique o próximo passo de cada OS."
            />

            <WorkspaceBar>
                <WorkspaceGroup label="Visão">
                <div role="group" aria-label="Origem das ordens" className="flex flex-wrap gap-x-5 gap-y-2">
                    {isManager && (
                        <button type="button" aria-pressed={scope === "all"} onClick={() => selectScope("all")}
                            className={`border-b-2 py-1.5 text-sm font-medium transition-colors ${scope === "all" ? "border-[var(--zyllen-highlight)] text-white" : "border-transparent text-[var(--zyllen-muted)] hover:border-white/20 hover:text-white"}`}>
                            Todas as OS
                        </button>
                    )}
                    <button
                        type="button"
                        aria-pressed={scope === "mine"}
                        onClick={() => selectScope("mine")}
                        className={`border-b-2 py-1.5 text-sm font-medium transition-colors ${
                            scope === "mine"
                                ? "border-[var(--zyllen-highlight)] text-white"
                                : "border-transparent text-[var(--zyllen-muted)] hover:border-white/20 hover:text-white"
                        }`}
                    >
                        Minhas OS
                    </button>
                    {isManager && (
                        <>
                            <button
                                type="button"
                                aria-pressed={scope === "collaborators"}
                                onClick={() => selectScope("collaborators")}
                                className={`border-b-2 py-1.5 text-sm font-medium transition-colors ${
                                    scope === "collaborators"
                                        ? "border-[var(--zyllen-highlight)] text-white"
                                        : "border-transparent text-[var(--zyllen-muted)] hover:border-white/20 hover:text-white"
                                }`}
                            >
                                Colaboradores
                            </button>
                            <button
                                type="button"
                                aria-pressed={scope === "contractors"}
                                onClick={() => selectScope("contractors")}
                                className={`border-b-2 py-1.5 text-sm font-medium transition-colors ${
                                    scope === "contractors"
                                        ? "border-[var(--zyllen-highlight)] text-white"
                                        : "border-transparent text-[var(--zyllen-muted)] hover:border-white/20 hover:text-white"
                                }`}
                            >
                                Parceiros
                            </button>
                        </>
                    )}
                </div>
                </WorkspaceGroup>

                {/* Status filter */}
                <WorkspaceGroup label="Situação" className="sm:text-right">
                <div role="group" aria-label="Status da ordem" className="flex flex-wrap items-center gap-1 sm:justify-end">
                    {["", "OPEN", "IN_PROGRESS", "CLOSED"].map((s) => (
                        <button
                            type="button"
                            aria-pressed={statusFilter === s}
                            key={s}
                            onClick={() => { setStatusFilter(s); setPage(1); }}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                statusFilter === s
                                    ? "bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)]"
                                    : "text-[var(--zyllen-muted)] hover:bg-white/[0.04] hover:text-white"
                            }`}
                        >
                            {s === "" ? "Todas" : STATUS_CONFIG[s]?.label || s}
                        </button>
                    ))}
                </div>
                </WorkspaceGroup>
            </WorkspaceBar>

            <form className="flex max-w-xl flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}>
                <Input aria-label="Buscar OS por número, cliente ou projeto" placeholder="Buscar número da OS, cliente ou projeto" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="min-w-[220px] flex-1" />
                <Button type="submit" variant="outline">Buscar</Button>
                {search && <Button type="button" variant="ghost" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}>Limpar</Button>}
            </form>

            <ListSectionHeader
                title={scope === "all" ? "Todas as ordens de serviço" : scope === "mine" ? "Ordens abertas por você" : scope === "collaborators" ? "Ordens de colaboradores" : "Ordens de parceiros"}
                count={loading || isError ? undefined : (osList?.total ?? 0)}
                description={statusFilter ? `Filtro atual: ${STATUS_CONFIG[statusFilter]?.label ?? statusFilter}.` : "Todas as situações no escopo selecionado."}
            />

            {/* List */}
            {loading ? (
                <div className="divide-y divide-white/10 border-y border-white/10">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-none bg-white/[0.025]" />)}
                </div>
            ) : isError ? (
                <EmptyState icon={<FileText size={24} />} title="Não foi possível carregar as OS" description="Tente consultar a lista novamente." action={<Button type="button" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>} />
            ) : displayList.length === 0 ? (
                <EmptyState
                    icon={<FileText size={24} />}
                    title="Nenhuma OS neste recorte"
                    description="Altere a visão ou a situação para consultar outras ordens de serviço."
                />
            ) : (
                <RecordList>
                    {displayList.map((os: any) => {
                        const formLabel = OS_FORM_CONFIG[os.formType as OsFormType]?.shortLabel || os.formType;
                        const stCfg = STATUS_CONFIG[os.status] || STATUS_CONFIG.OPEN;
                        return (
                            <RecordRow
                                key={os.id}
                                aria-label={`Abrir detalhes da OS ${os.osNumber || os.clientName || "selecionada"}`}
                                onClick={() => { setSelectedOS(os); setView("detail"); fetchDetailAttachments(os.id); }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="hidden w-24 shrink-0 sm:block">
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">Número</p>
                                        <p className="mt-1 truncate font-mono text-xs text-white/70">{os.osNumber || "Sem número"}</p>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="truncate text-sm font-semibold text-white group-hover:text-[var(--zyllen-highlight)]">{os.clientName || "Cliente"}</span>
                                            <span className="sm:hidden"><Badge variant={stCfg.variant}>{stCfg.label}</Badge></span>
                                        </div>
                                        <p className="mt-1 truncate text-xs text-[var(--zyllen-muted)]">
                                            {formLabel}
                                            {(os.openedBy?.name || os.openedByContractor?.name) && scope !== "mine" && ` · ${os.openedBy?.name || os.openedByContractor?.name}`}
                                        </p>
                                        <p className="mt-1 font-mono text-[11px] text-white/45 sm:hidden">{os.osNumber || "Sem número"}</p>
                                    </div>
                                    <div className="hidden shrink-0 text-right md:block">
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">Abertura</p>
                                        <p className="mt-1 text-xs tabular-nums text-[var(--zyllen-muted)]">{new Date(os.createdAt).toLocaleDateString("pt-BR")}</p>
                                    </div>
                                    <span className="hidden shrink-0 sm:block"><Badge variant={stCfg.variant}>{stCfg.label}</Badge></span>
                                    <ChevronRight size={16} className="shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--zyllen-highlight)]" />
                                </div>
                            </RecordRow>
                        );
                    })}
                </RecordList>
            )}
            {!loading && !isError && <OsListPagination page={page} limit={PAGE_SIZE} total={osList?.total ?? 0} onPageChange={setPage} />}
        </div>
    );
}
