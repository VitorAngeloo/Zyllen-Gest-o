"use client";
import { maintenanceApi } from "@web/features/maintenance/api/maintenance-api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuthedFetch } from "@web/features/auth/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Badge } from "@web/components/ui/badge";
import { PageHeader } from "@web/components/ui/page-header";
import { EmptyState, ListSectionHeader } from "@web/components/ui/workspace";
import { toast } from "sonner";
import { Wrench, Plus, Eye, ArrowLeft, Edit, CheckSquare, Printer, Lock } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { EMPTY_STATES, TOASTS, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";
import { OsFormWizard, OS_FORM_CONFIG } from "@web/features/maintenance/components/os-forms";
import type { OsFormSubmitData, OsFormType } from "@web/features/maintenance/components/os-forms";
import { MediaUploader } from "@web/features/maintenance/components/os-forms/media-uploader";
import type { MediaAttachment } from "@web/features/maintenance/components/os-forms/media-uploader";
import { printOsPdf } from "@web/features/maintenance/utils/os-pdf";
import { getOsFieldRows } from "@web/features/maintenance/utils/os-form-view";
import { uploadMaintenanceAttachments } from "@web/features/maintenance/utils/maintenance-attachments";
import { OSFollowupSection } from "@web/features/maintenance/components/os-forms/os-followup-section";

type Tab = "list" | "new" | "detail" | "edit";

const STATUS_CONFIG: Record<string, { label: string; variant: "warning" | "default" | "success" }> = {
    OPEN: { label: "Aberta", variant: "warning" },
    IN_PROGRESS: { label: "Em Andamento", variant: "default" },
    CLOSED: { label: "Encerrada", variant: "success" },
};

export default function ManutencaoPage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("list");
    const [selectedOS, setSelectedOS] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [detailAttachments, setDetailAttachments] = useState<MediaAttachment[]>([]);

    // Fetch attachments when viewing detail
    const fetchDetailAttachments = async (osId: string) => {
        try {
            const res = await maintenanceApi.listInternalAttachments<{ data?: MediaAttachment[] | { data?: MediaAttachment[] } }>(osId, fetchOpts);
            const list = Array.isArray(res?.data)
                ? res.data
                : Array.isArray((res?.data as any)?.data)
                    ? (res?.data as any).data
                    : [];
            setDetailAttachments(list);
        } catch { setDetailAttachments([]); }
    };

    const { data: osList, isLoading: loadingOS } = useQuery({
        queryKey: ["maintenance"],
        queryFn: () => maintenanceApi.listOrders<{ data: any[] }>(fetchOpts),
    });

    const updateStatus = useMutation({
        mutationFn: (data: { id: string; status: string; notes?: string }) =>
            maintenanceApi.updateStatus(data.id, { status: data.status, notes: data.notes }, fetchOpts),
        onSuccess: () => {
            toast.success(TOASTS.osStatusUpdated);
            qc.invalidateQueries({ queryKey: ["maintenance"] });
            setTab("list");
            setSelectedOS(null);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const handleSubmitOS = async (data: OsFormSubmitData) => {
        setSubmitting(true);
        let createdId: string | undefined;
        try {
            const { localFiles, ...payload } = data;
            const created = await maintenanceApi.createOrder<{ id?: string; data?: { id?: string; data?: { id?: string } } }>(payload, fetchOpts);
            createdId = created?.data?.id ?? created?.id ?? created?.data?.data?.id;

            await uploadMaintenanceAttachments("/maintenance", createdId, localFiles, fetchOpts);

            toast.success(TOASTS.osOpened);
            qc.invalidateQueries({ queryKey: ["maintenance"] });
            setTab("list");
        } catch (e: any) {
            if (createdId) {
                // OS was created but file upload failed — navigate to list so user sees the OS
                toast.warning("OS criada! Ocorreu um erro ao enviar os arquivos. Abra a OS na lista para adicionar as fotos.");
                qc.invalidateQueries({ queryKey: ["maintenance"] });
                setTab("list");
            } else {
                toast.error(e.message || "Erro ao abrir OS");
                throw e;
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditSubmit = async (data: OsFormSubmitData) => {
        if (!selectedOS) return;
        setSubmitting(true);
        try {
            const { localFiles, ...payload } = data;
            await maintenanceApi.updateFormData(selectedOS.id, payload, fetchOpts);

            await uploadMaintenanceAttachments("/maintenance", selectedOS.id, localFiles, fetchOpts);

            toast.success("OS atualizada");
            qc.invalidateQueries({ queryKey: ["maintenance"] });
            setTab("list");
            setSelectedOS(null);
        } catch (e: any) {
            toast.error(e.message || "Erro ao atualizar");
            throw e;
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveDraft = async (data: OsFormSubmitData) => {
        if (!selectedOS) return;
        setSubmitting(true);
        try {
            const { localFiles, ...payload } = data;
            await maintenanceApi.updateFormData(selectedOS.id, payload, fetchOpts);

            await uploadMaintenanceAttachments("/maintenance", selectedOS.id, localFiles, fetchOpts);

            toast.success("Rascunho salvo");
            qc.invalidateQueries({ queryKey: ["maintenance"] });
        } catch (e: any) {
            toast.error(e.message || "Erro ao salvar");
            throw e;
        } finally {
            setSubmitting(false);
        }
    };

    const handleFinalize = () => {
        if (!selectedOS) return;
        updateStatus.mutate({ id: selectedOS.id, status: "CLOSED", notes: "Finalizado" });
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
            formType: OS_FORM_CONFIG[selectedOS.formType as OsFormType]?.label || selectedOS.formType || "",
            status: selectedOS.status,
            clientName: selectedOS.clientName,
            clientCity: selectedOS.clientCity,
            clientState: selectedOS.clientState,
            location: selectedOS.location,
            contactName: selectedOS.contactName,
            contactPhone: selectedOS.contactPhone,
            startedAt: selectedOS.startedAt,
            endedAt: selectedOS.endedAt,
            createdAt: selectedOS.createdAt,
            openedBy: selectedOS.openedBy?.name,
            openedByContractor: selectedOS.openedByContractor?.name,
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

    const statusColor: Record<string, "warning" | "default" | "success"> = {
        OPEN: "warning", IN_PROGRESS: "default", CLOSED: "success",
    };

    // ── Abrir OS (Wizard) ──
    if (tab === "new") {
        return (
            <div className="space-y-6">
                <OsFormWizard
                    userContext="internal"
                    onSubmit={handleSubmitOS}
                    onCancel={() => setTab("list")}
                    submitting={submitting}
                />
            </div>
        );
    }

    // ── Editar OS (Wizard editMode) ──
    if (tab === "edit" && selectedOS) {
        return (
            <div className="space-y-6">
                <OsFormWizard
                    userContext="internal"
                    editMode
                    readOnly={selectedOS.status === "CLOSED"}
                    initialData={{
                        id: selectedOS.id,
                        formType: selectedOS.formType as OsFormType,
                        notes: selectedOS.notes || "",
                        companyId: selectedOS.companyId || "",
                        projectId: selectedOS.projectId || "",
                        clientName: selectedOS.clientName || "",
                        clientCity: selectedOS.clientCity || "",
                        clientState: selectedOS.clientState || "",
                        location: selectedOS.location || "",
                        contactName: selectedOS.contactName || "",
                        contactPhone: selectedOS.contactPhone || "",
                        startedAt: selectedOS.startedAt ? new Date(selectedOS.startedAt).toISOString().slice(0, 16) : "",
                        endedAt: selectedOS.endedAt ? new Date(selectedOS.endedAt).toISOString().slice(0, 16) : "",
                        formData: selectedOS.formData || {},
                    }}
                    onSubmit={handleEditSubmit}
                    onSaveDraft={handleSaveDraft}
                    onCancel={() => { setTab("list"); setSelectedOS(null); }}
                    submitting={submitting}
                />
            </div>
        );
    }

    // ── OS Detail ──
    if (tab === "detail" && selectedOS) {
        const formTypeLabel = OS_FORM_CONFIG[selectedOS.formType as OsFormType]?.label || selectedOS.formType || "—";
        const stCfg = STATUS_CONFIG[selectedOS.status] || STATUS_CONFIG.OPEN;
        const formRows = getOsFieldRows(selectedOS.formType, selectedOS.formData);
        const isInstalacaoSala = selectedOS.formType === "INSTALACAO_SALA";
        const isSignatureLocked = !!(selectedOS.formData as any)?.witnessSignature;
        return (
            <div className="space-y-6">
                <button
                    className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors"
                    onClick={() => { setTab("list"); setSelectedOS(null); setDetailAttachments([]); }}
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-white">{selectedOS.clientName || "Cliente"}</CardTitle>
                                <p className="text-xs text-[var(--zyllen-muted)] mt-1">
                                    {selectedOS.osNumber ? `${selectedOS.osNumber} · ${formTypeLabel}` : formTypeLabel}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={stCfg.variant}>{stCfg.label}</Badge>
                                {selectedOS.status !== "CLOSED" && !isSignatureLocked && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setTab("edit")}
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
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {selectedOS.asset && (
                                <>
                                    <div>
                                        <span className="text-[var(--zyllen-muted)]">Patrimônio:</span>
                                        <p className="text-white font-medium">{selectedOS.asset.assetCode}</p>
                                    </div>
                                    <div>
                                        <span className="text-[var(--zyllen-muted)]">Item:</span>
                                        <p className="text-white font-medium">{selectedOS.asset.sku?.name}</p>
                                    </div>
                                </>
                            )}
                            {selectedOS.clientName && (
                                <div>
                                    <span className="text-[var(--zyllen-muted)]">Empresa / Cliente:</span>
                                    <p className="text-white font-medium">{selectedOS.clientName}</p>
                                </div>
                            )}
                            {selectedOS.clientCity && (
                                <div>
                                    <span className="text-[var(--zyllen-muted)]">Local:</span>
                                    <p className="text-white">{selectedOS.clientCity}{selectedOS.clientState ? ` — ${selectedOS.clientState}` : ""}</p>
                                </div>
                            )}
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
                            <div>
                                <span className="text-[var(--zyllen-muted)]">Aberta em:</span>
                                <p className="text-white">{new Date(selectedOS.createdAt).toLocaleString("pt-BR")}</p>
                            </div>
                            {selectedOS.openedBy?.name && (
                                <div>
                                    <span className="text-[var(--zyllen-muted)]">Aberta por:</span>
                                    <p className="text-white">{selectedOS.openedBy.name}</p>
                                </div>
                            )}
                            {selectedOS.openedByContractor?.name && (
                                <div>
                                    <span className="text-[var(--zyllen-muted)]">Parceiro:</span>
                                    <p className="text-white">{selectedOS.openedByContractor.name}</p>
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
                                        <div key={row.key} className="bg-white/5 rounded-md px-3 py-2 border border-[var(--zyllen-border)]/50">
                                            <span className="text-[var(--zyllen-muted)] text-xs">{row.label}:</span>
                                            {row.isSignature ? (
                                                <div className="mt-2 rounded-md border border-[var(--zyllen-border)] bg-white p-2">
                                                    <img src={row.rawValue as string} alt={row.label} className="w-full h-24 object-contain" />
                                                </div>
                                            ) : (
                                                <p className={`text-sm ${row.isEmpty ? "text-[var(--zyllen-muted)] italic" : "text-white"}`}>
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

                        {/* ── Attachments ── */}
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
                            {selectedOS.status === "OPEN" && (
                                <Button variant="highlight" onClick={() => updateStatus.mutate({ id: selectedOS.id, status: "IN_PROGRESS" })}>
                                    Iniciar Execução
                                </Button>
                            )}
                            {selectedOS.status !== "CLOSED" && (
                                <Button
                                    variant="highlight"
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={handleFinalize}
                                    disabled={updateStatus.isPending}
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

    // ── OS List (default) ──
    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Ordens de serviço"
                title="Manutenção"
                description={PAGE_DESCRIPTIONS.manutencao}
                actions={<Button variant="highlight" onClick={() => setTab("new")}>
                    <Plus size={16} className="mr-2" /> Abrir OS
                </Button>}
            />

            <ListSectionHeader
                title="Ordens de serviço"
                count={loadingOS ? undefined : (osList?.data?.length ?? 0)}
                description="Selecione uma OS para consultar todos os dados ou use as ações rápidas para avançar o atendimento."
            />

            {loadingOS ? (
                <div className="divide-y divide-white/10 border-y border-white/10">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-none bg-white/[0.025]" />)}
                </div>
            ) : osList?.data?.length ? (
                <div className="overflow-x-auto border-y border-white/10">
                    <table className="w-full min-w-[760px] text-sm">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.015]">
                                <th scope="col" className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Cliente / Nº OS</th>
                                <th scope="col" className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Tipo</th>
                                <th scope="col" className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Patrimônio</th>
                                <th scope="col" className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Situação</th>
                                <th scope="col" className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Abertura</th>
                                <th scope="col" className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {osList.data.map((os: any) => {
                                const typeLabel = OS_FORM_CONFIG[os.formType as OsFormType]?.shortLabel || os.formType || "—";
                                const openDetails = () => { setSelectedOS(os); setTab("detail"); fetchDetailAttachments(os.id); };
                                return (
                                    <tr
                                        key={os.id}
                                        tabIndex={0}
                                        aria-label={`Abrir detalhes da OS ${os.osNumber || os.clientName || "selecionada"}`}
                                        className="cursor-pointer transition-colors hover:bg-white/[0.025] focus-visible:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--zyllen-highlight)]/35"
                                        onClick={openDetails}
                                        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetails(); } }}
                                    >
                                        <td className="px-3 py-3 text-xs">
                                            <p className="max-w-[220px] truncate font-semibold text-white" title={os.clientName || "—"}>{os.clientName || "—"}</p>
                                            {os.project?.name && <p className="max-w-[220px] truncate text-[var(--zyllen-muted)]" title={os.project.name}>{os.project.name}</p>}
                                            <p className="font-mono text-[11px] text-white/45">{os.osNumber || "—"}</p>
                                        </td>
                                        <td className="px-3 py-3 text-xs text-white">{typeLabel}</td>
                                        <td className="px-3 py-3 font-mono text-xs text-white/70">{os.asset?.assetCode || "—"}</td>
                                        <td className="px-3 py-3"><Badge variant={(STATUS_CONFIG[os.status] || STATUS_CONFIG.OPEN).variant}>{(STATUS_CONFIG[os.status] || STATUS_CONFIG.OPEN).label}</Badge></td>
                                        <td className="px-3 py-3 text-xs tabular-nums text-[var(--zyllen-muted)]">{new Date(os.createdAt).toLocaleDateString("pt-BR")}</td>
                                        <td className="px-3 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                                            <Button size="sm" variant="ghost" aria-label="Ver detalhes" className="text-[var(--zyllen-muted)]" onClick={openDetails}><Eye size={14} /></Button>
                                            {os.status === "OPEN" && <Button size="sm" variant="ghost" className="text-[var(--zyllen-highlight)]" onClick={() => updateStatus.mutate({ id: os.id, status: "IN_PROGRESS" })}>Iniciar</Button>}
                                            {os.status !== "CLOSED" && (
                                                <Button size="sm" variant="ghost" className="text-emerald-400" onClick={() => {
                                                    if (confirm("Tem certeza que deseja finalizar esta OS? Após finalizada, ela ficará em modo somente-leitura.")) {
                                                        updateStatus.mutate({ id: os.id, status: "CLOSED", notes: "Finalizado" });
                                                    }
                                                }}>Finalizar</Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState icon={<Wrench size={24} />} title="Nenhuma ordem de serviço" description={EMPTY_STATES.maintenanceList} />
            )}
        </div>
    );
}
