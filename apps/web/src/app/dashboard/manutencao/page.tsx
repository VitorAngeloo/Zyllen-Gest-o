"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import { Wrench, Plus, List, FileText, Eye, ArrowLeft, Edit, CheckSquare, Printer } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { EMPTY_STATES, TOASTS, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";
import { OsFormWizard, OS_FORM_CONFIG } from "@web/components/os-forms";
import type { OsFormSubmitData, OsFormType } from "@web/components/os-forms";
import { printOsPdf } from "@web/lib/os-pdf";

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

    const { data: osList, isLoading: loadingOS } = useQuery({
        queryKey: ["maintenance"],
        queryFn: () => apiClient.get<{ data: any[] }>("/maintenance", fetchOpts),
    });

    const updateStatus = useMutation({
        mutationFn: (data: { id: string; status: string; notes?: string }) =>
            apiClient.put(`/maintenance/${data.id}/status`, { status: data.status, notes: data.notes }, fetchOpts),
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
        try {
            await apiClient.post("/maintenance", data, fetchOpts);
            toast.success(TOASTS.osOpened);
            qc.invalidateQueries({ queryKey: ["maintenance"] });
            setTab("list");
        } catch (e: any) {
            toast.error(e.message || "Erro ao abrir OS");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditSubmit = async (data: OsFormSubmitData) => {
        if (!selectedOS) return;
        setSubmitting(true);
        try {
            await apiClient.put(`/maintenance/${selectedOS.id}/form-data`, data, fetchOpts);
            toast.success("OS atualizada");
            qc.invalidateQueries({ queryKey: ["maintenance"] });
            setTab("list");
            setSelectedOS(null);
        } catch (e: any) {
            toast.error(e.message || "Erro ao atualizar");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveDraft = async (data: OsFormSubmitData) => {
        if (!selectedOS) return;
        setSubmitting(true);
        try {
            await apiClient.put(`/maintenance/${selectedOS.id}/form-data`, data, fetchOpts);
            toast.success("Rascunho salvo");
            qc.invalidateQueries({ queryKey: ["maintenance"] });
        } catch (e: any) {
            toast.error(e.message || "Erro ao salvar");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFinalize = () => {
        if (!selectedOS) return;
        updateStatus.mutate({ id: selectedOS.id, status: "CLOSED", notes: "Finalizado" });
    };

    const handlePrintPdf = () => {
        if (!selectedOS) return;
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
            contactRole: selectedOS.contactRole,
            startedAt: selectedOS.startedAt,
            endedAt: selectedOS.endedAt,
            createdAt: selectedOS.createdAt,
            openedBy: selectedOS.openedBy?.name,
            openedByContractor: selectedOS.openedByContractor?.name,
            formData: selectedOS.formData,
            asset: selectedOS.asset,
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
                        formType: selectedOS.formType as OsFormType,
                        notes: selectedOS.notes || "",
                        clientName: selectedOS.clientName || "",
                        clientCity: selectedOS.clientCity || "",
                        clientState: selectedOS.clientState || "",
                        location: selectedOS.location || "",
                        contactName: selectedOS.contactName || "",
                        contactPhone: selectedOS.contactPhone || "",
                        contactRole: selectedOS.contactRole || "",
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
        return (
            <div className="space-y-6">
                <button
                    onClick={() => { setTab("list"); setSelectedOS(null); }}
                    className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-white">{selectedOS.osNumber || "OS"}</CardTitle>
                                <p className="text-xs text-[var(--zyllen-muted)] mt-1">{formTypeLabel}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={stCfg.variant}>{stCfg.label}</Badge>
                                {selectedOS.status !== "CLOSED" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setTab("edit")}
                                        className="border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-white"
                                    >
                                        <Edit size={14} className="mr-1" /> Editar
                                    </Button>
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
                                        {[selectedOS.contactName, selectedOS.contactRole, selectedOS.contactPhone].filter(Boolean).join(" · ")}
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
                                    <span className="text-[var(--zyllen-muted)]">Terceirizado:</span>
                                    <p className="text-white">{selectedOS.openedByContractor.name}</p>
                                </div>
                            )}
                        </div>

                        {selectedOS.formData && typeof selectedOS.formData === "object" && Object.keys(selectedOS.formData).length > 0 && (
                            <div>
                                <span className="text-sm text-[var(--zyllen-muted)]">Dados do Formulário:</span>
                                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    {Object.entries(selectedOS.formData).map(([key, value]) => (
                                        <div key={key} className="bg-white/5 rounded-md px-3 py-2">
                                            <span className="text-[var(--zyllen-muted)] text-xs">{key}:</span>
                                            <p className="text-white text-sm">{String(value)}</p>
                                        </div>
                                    ))}
                                </div>
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Wrench className="text-[var(--zyllen-highlight)]" /> Manutenção
                    </h1>
                    <p className="text-sm text-[var(--zyllen-muted)] mt-1">{PAGE_DESCRIPTIONS.manutencao}</p>
                </div>
                <Button variant="highlight" onClick={() => setTab("new")}>
                    <Plus size={16} className="mr-2" /> Abrir OS
                </Button>
            </div>

            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardHeader><CardTitle className="text-white">Ordens de Serviço</CardTitle></CardHeader>
                <CardContent>
                    {loadingOS ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-6 w-20" />
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-8 w-16 ml-auto" />
                                </div>
                            ))}
                        </div>
                    ) : osList?.data?.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--zyllen-border)]">
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Nº OS</th>
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Tipo</th>
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Patrimônio</th>
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Cliente</th>
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Status</th>
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Data</th>
                                        <th className="text-right py-3 text-[var(--zyllen-muted)] font-medium">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {osList.data.map((os: any) => {
                                        const typeLabel = OS_FORM_CONFIG[os.formType as OsFormType]?.shortLabel || os.formType || "—";
                                        return (
                                            <tr
                                                key={os.id}
                                                className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02] cursor-pointer"
                                                onClick={() => { setSelectedOS(os); setTab("detail"); }}
                                            >
                                                <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{os.osNumber || "—"}</td>
                                                <td className="py-3 text-white text-xs">{typeLabel}</td>
                                                <td className="py-3 font-mono text-xs text-white">{os.asset?.assetCode || "—"}</td>
                                                <td className="py-3 text-white text-xs">{os.clientName || "—"}</td>
                                                <td className="py-3"><Badge variant={(STATUS_CONFIG[os.status] || STATUS_CONFIG.OPEN).variant}>{(STATUS_CONFIG[os.status] || STATUS_CONFIG.OPEN).label}</Badge></td>
                                                <td className="py-3 text-[var(--zyllen-muted)] text-xs">{new Date(os.createdAt).toLocaleDateString("pt-BR")}</td>
                                                <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <Button size="sm" variant="ghost" className="text-[var(--zyllen-muted)] text-xs" onClick={() => { setSelectedOS(os); setTab("detail"); }}>
                                                        <Eye size={14} />
                                                    </Button>
                                                    {os.status === "OPEN" && (
                                                        <Button size="sm" variant="ghost" className="text-[var(--zyllen-highlight)] text-xs" onClick={() => updateStatus.mutate({ id: os.id, status: "IN_PROGRESS" })}>Iniciar</Button>
                                                    )}
                                                    {os.status !== "CLOSED" && (
                                                        <Button size="sm" variant="ghost" className="text-emerald-400 text-xs" onClick={() => {
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
                        <div className="text-center py-12">
                            <Wrench size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" />
                            <p className="text-[var(--zyllen-muted)]">{EMPTY_STATES.maintenanceList}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
