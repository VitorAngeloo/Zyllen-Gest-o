"use client";
import { maintenanceApi } from "@web/features/maintenance/api/maintenance-api";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth, useAuthedFetch } from "@web/features/auth/context/auth-context";

import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Badge } from "@web/components/ui/badge";
import { PageHeader } from "@web/components/ui/page-header";
import { EmptyState, ListSectionHeader, RecordList, RecordRow } from "@web/components/ui/workspace";
import { toast } from "sonner";
import { uploadMaintenanceAttachments } from "@web/features/maintenance/utils/maintenance-attachments";
import { Plus, Wrench, Clock, CheckCircle2, AlertCircle, ArrowLeft, ChevronRight, FileText, Edit, Printer } from "lucide-react";
import { OsFormWizard } from "@web/features/maintenance/components/os-forms";
import type { OsFormSubmitData } from "@web/features/maintenance/components/os-forms";
import { OS_FORM_CONFIG } from "@web/features/maintenance/components/os-forms";
import type { OsFormType } from "@web/features/maintenance/components/os-forms";
import { MediaUploader } from "@web/features/maintenance/components/os-forms/media-uploader";
import type { MediaAttachment } from "@web/features/maintenance/components/os-forms/media-uploader";
import { printOsPdf } from "@web/features/maintenance/utils/os-pdf";
import { getOsFieldRows } from "@web/features/maintenance/utils/os-form-view";

interface MaintenanceOS {
    id: string;
    osNumber: string;
    formType: string;
    status: string;
    notes: string | null;
    clientName: string | null;
    clientCity: string | null;
    clientState: string | null;
    location: string | null;
    contactName: string | null;
    contactPhone: string | null;
    formData: Record<string, unknown> | null;
    createdAt: string;
    closedAt: string | null;
    asset: {
        assetCode: string;
        sku: { skuCode: string; name: string };
    } | null;
    openedBy?: { name: string } | null;
    openedByContractor?: { name: string } | null;
    closedBy?: { name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    OPEN: { label: "Aberta", color: "var(--zyllen-warning)", icon: AlertCircle },
    IN_PROGRESS: { label: "Em Andamento", color: "var(--zyllen-info)", icon: Clock },
    CLOSED: { label: "Encerrada", color: "var(--zyllen-success)", icon: CheckCircle2 },
};

function ContractorMaintenanceInner() {
    const { token } = useAuth();
    const authFetch = useAuthedFetch();
    const searchParams = useSearchParams();
    const [orders, setOrders] = useState<MaintenanceOS[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"list" | "new" | "detail" | "edit">(
        searchParams.get("new") === "1" ? "new" : "list"
    );
    const [selectedOS, setSelectedOS] = useState<MaintenanceOS | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [detailAttachments, setDetailAttachments] = useState<MediaAttachment[]>([]);

    const fetchDetailAttachments = async (osId: string) => {
        try {
            const res = await maintenanceApi.listContractorAttachments<{ data?: MediaAttachment[] | { data?: MediaAttachment[] } }>(osId, authFetch);
            const list = Array.isArray(res?.data)
                ? res.data
                : Array.isArray((res?.data as any)?.data)
                    ? (res?.data as any).data
                    : [];
            setDetailAttachments(list);
        } catch { setDetailAttachments([]); }
    };

    const fetchOrders = useCallback(async () => {
        if (!token) return;
        try {
            const statusFilter = searchParams.get("status");
            const query = statusFilter ? `?status=${statusFilter}` : "";
            const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await maintenanceApi.listContractorOrders<{ data: MaintenanceOS[] }>(query, { headers });
            setOrders(res.data);
        } catch {
            toast.error("Erro ao carregar ordens de serviço");
        } finally {
            setLoading(false);
        }
    }, [token, searchParams]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleSubmitOS = async (data: OsFormSubmitData) => {
        setSubmitting(true);
        let createdId: string | undefined;
        try {
            const { localFiles, ...payload } = data;
            const created = await maintenanceApi.createContractorOrder<{ id?: string; data?: { id?: string; data?: { id?: string } } }>(payload, authFetch);
            createdId = created?.data?.id ?? created?.id ?? created?.data?.data?.id;

            await uploadMaintenanceAttachments("/contractor/maintenance", createdId, localFiles, authFetch);

            toast.success("OS aberta com sucesso!");
            setView("list");
            fetchOrders();
        } catch (err: any) {
            if (createdId) {
                // OS was created but file upload failed — navigate to list so user sees the OS
                toast.warning("OS criada! Ocorreu um erro ao enviar os arquivos. Abra a OS na lista para adicionar as fotos.");
                setView("list");
                fetchOrders();
            } else {
                toast.error(err.message || "Erro ao abrir OS");
                throw err;
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await maintenanceApi.updateContractorStatus(id, { status }, authFetch);
            toast.success("OS atualizada");
            fetchOrders();
            setView("list");
            setSelectedOS(null);
        } catch (err: any) {
            toast.error(err.message || "Erro ao atualizar OS");
        }
    };

    const handlePrintPdf = () => {
        if (!selectedOS) return;
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        printOsPdf({
            osNumber: selectedOS.osNumber || "OS",
            formType: OS_FORM_CONFIG[selectedOS.formType as OsFormType]?.label || selectedOS.formType,
            status: selectedOS.status,
            clientName: selectedOS.clientName || undefined,
            clientCity: selectedOS.clientCity || undefined,
            clientState: selectedOS.clientState || undefined,
            location: selectedOS.location || undefined,
            contactName: selectedOS.contactName || undefined,
            contactPhone: selectedOS.contactPhone || undefined,
            openedBy: selectedOS.openedBy?.name || selectedOS.openedByContractor?.name || undefined,
            createdAt: selectedOS.createdAt,
            formData: selectedOS.formData || undefined,
            asset: selectedOS.asset || undefined,
            attachments: detailAttachments.map((att) => ({
                id: att.id,
                fileName: att.fileName,
                mimeType: att.mimeType,
                fileUrl: `${apiBase}/media/maintenance/${encodeURIComponent(att.id)}/file`,
            })),
        });
    };

    const handleEditSubmit = async (data: OsFormSubmitData) => {
        if (!selectedOS) return;
        setSubmitting(true);
        try {
            const { localFiles, ...payload } = data;
            await maintenanceApi.updateContractorFormData(selectedOS.id, payload, authFetch);

            await uploadMaintenanceAttachments("/contractor/maintenance", selectedOS.id, localFiles, authFetch);

            toast.success("OS atualizada");
            fetchOrders();
            setView("list");
            setSelectedOS(null);
        } catch (err: any) {
            toast.error(err.message || "Erro ao atualizar OS");
            throw err;
        } finally {
            setSubmitting(false);
        }
    };

    // ── New OS Form (Wizard) ──
    if (view === "new") {
        return (
            <OsFormWizard
                userContext="contractor"
                onSubmit={handleSubmitOS}
                onCancel={() => setView("list")}
                submitting={submitting}
            />
        );
    }

    // ── Edit view ──
    if (view === "edit" && selectedOS) {
        return (
            <OsFormWizard
                userContext="contractor"
                editMode
                readOnly={selectedOS.status === "CLOSED" || !!(selectedOS.formData as any)?.witnessSignature}
                initialData={{
                    id: selectedOS.id,
                    formType: selectedOS.formType as OsFormType,
                    clientName: selectedOS.clientName || "",
                    clientCity: selectedOS.clientCity || "",
                    clientState: selectedOS.clientState || "",
                    location: selectedOS.location || "",
                    contactName: selectedOS.contactName || "",
                    contactPhone: selectedOS.contactPhone || "",
                    formData: selectedOS.formData || {},
                }}
                onSubmit={handleEditSubmit}
                onCancel={() => { setView("list"); setSelectedOS(null); }}
                submitting={submitting}
            />
        );
    }

    // ── OS Detail View ──
    if (view === "detail" && selectedOS) {
        const statusCfg = STATUS_CONFIG[selectedOS.status] || STATUS_CONFIG.OPEN;
        const formTypeLabel = OS_FORM_CONFIG[selectedOS.formType as OsFormType]?.label || selectedOS.formType;
        const formRows = getOsFieldRows(selectedOS.formType, selectedOS.formData);

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
                                <CardTitle className="text-white">
                                    {selectedOS.clientName || "Cliente"}
                                </CardTitle>
                                <p className="text-xs text-[var(--zyllen-muted)] mt-1">
                                    {selectedOS.osNumber ? `${selectedOS.osNumber} · ${formTypeLabel}` : formTypeLabel}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-xs px-2 py-1 rounded-full font-medium"
                                    style={{
                                        backgroundColor: `color-mix(in srgb, ${statusCfg.color} 15%, transparent)`,
                                        color: statusCfg.color,
                                    }}
                                >
                                    {statusCfg.label}
                                </span>
                                {selectedOS.status !== "CLOSED" && !(selectedOS.formData as any)?.witnessSignature && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setView("edit")}
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
                                        <span className="text-[var(--zyllen-muted)]">Código do item:</span>
                                        <p className="text-white font-medium">{selectedOS.asset.sku.skuCode}</p>
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
                        </div>

                        {/* Display form-specific data */}
                        {formRows.length > 0 && (
                            <div>
                                <span className="text-sm text-[var(--zyllen-muted)]">Dados do Formulário:</span>
                                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    {formRows.map((row) => (
                                        <div key={row.key} className="bg-white/5 rounded-md px-3 py-2">
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
                            </div>
                        )}

                        {/* ── Attachments ── */}
                        {detailAttachments.length > 0 && (
                            <div>
                                <span className="text-sm text-[var(--zyllen-muted)]">Fotos / Vídeos:</span>
                                <div className="mt-2">
                                    <MediaUploader
                                        osId={selectedOS.id}
                                        attachments={detailAttachments}
                                        apiBasePath="/contractor/maintenance"
                                        readOnly
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-4 border-t border-[var(--zyllen-border)]">
                            {selectedOS.status === "OPEN" && (
                                <Button
                                    variant="highlight"
                                    onClick={() => handleUpdateStatus(selectedOS.id, "IN_PROGRESS")}
                                >
                                    Iniciar Execução
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

    // ── OS List ──
    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Portal do parceiro"
                title="Minhas Ordens de Serviço"
                description="Acompanhe e gerencie suas OS de manutenção"
                actions={<Button variant="highlight" onClick={() => setView("new")}>
                    <Plus size={16} className="mr-2" /> Nova OS
                </Button>}
            />

            <ListSectionHeader
                title="Ordens registradas"
                count={orders.length}
                description="Abra uma ordem para continuar o preenchimento ou consultar o serviço."
            />

            {loading ? (
                <div className="text-center py-12 text-[var(--zyllen-muted)]">Carregando...</div>
            ) : orders.length === 0 ? (
                <EmptyState
                    icon={<Wrench size={28} />}
                    title="Nenhuma OS encontrada"
                    description="Registre a primeira ordem para iniciar o histórico de serviços."
                    action={<Button variant="highlight" onClick={() => setView("new")}>Abrir primeira OS</Button>}
                />
            ) : (
                <RecordList>
                    {orders.map((os) => {
                        const statusCfg = STATUS_CONFIG[os.status] || STATUS_CONFIG.OPEN;
                        const StatusIcon = statusCfg.icon;
                        const formLabel = OS_FORM_CONFIG[os.formType as OsFormType]?.shortLabel || os.formType;
                        return (
                            <RecordRow
                                key={os.id}
                                onClick={() => { setSelectedOS(os); setView("detail"); fetchDetailAttachments(os.id); }}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <StatusIcon size={18} className="shrink-0" style={{ color: statusCfg.color }} />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm font-medium text-white">{os.clientName || "Cliente"}</p>
                                                <Badge variant="outline" className="shrink-0 text-[10px]">{formLabel}</Badge>
                                            </div>
                                            <p className="mt-1 text-xs text-[var(--zyllen-muted)]">
                                                {os.osNumber && `${os.osNumber} · `}
                                                {new Date(os.createdAt).toLocaleDateString("pt-BR")} · {statusCfg.label}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--zyllen-highlight)]" />
                                </div>
                            </RecordRow>
                        );
                    })}
                </RecordList>
            )}
        </div>
    );
}

export default function ContractorMaintenancePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="size-8 border-2 border-[var(--zyllen-highlight)] border-t-transparent rounded-full animate-spin" /></div>}>
            <ContractorMaintenanceInner />
        </Suspense>
    );
}
