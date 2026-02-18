"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth, useAuthedFetch } from "@web/lib/auth-context";
import { apiClient } from "@web/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import { Plus, Wrench, Clock, CheckCircle2, AlertCircle, ArrowLeft, FileText, Edit, Printer } from "lucide-react";
import { OsFormWizard } from "@web/components/os-forms";
import type { OsFormSubmitData } from "@web/components/os-forms";
import { OS_FORM_CONFIG } from "@web/components/os-forms";
import type { OsFormType } from "@web/components/os-forms";
import { printOsPdf } from "@web/lib/os-pdf";

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
    contactRole: string | null;
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

    const fetchOrders = useCallback(async () => {
        if (!token) return;
        try {
            const statusFilter = searchParams.get("status");
            const query = statusFilter ? `?status=${statusFilter}` : "";
            const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await apiClient.get<{ data: MaintenanceOS[] }>(`/contractor/maintenance${query}`, { headers });
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
        try {
            await apiClient.post("/contractor/maintenance", data, authFetch);
            toast.success("OS aberta com sucesso!");
            setView("list");
            fetchOrders();
        } catch (err: any) {
            toast.error(err.message || "Erro ao abrir OS");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await apiClient.put(`/contractor/maintenance/${id}/status`, { status }, authFetch);
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
            contactRole: selectedOS.contactRole || undefined,
            openedBy: selectedOS.openedBy?.name || selectedOS.openedByContractor?.name || undefined,
            createdAt: selectedOS.createdAt,
            formData: selectedOS.formData || undefined,
        });
    };

    const handleEditSubmit = async (data: OsFormSubmitData) => {
        if (!selectedOS) return;
        setSubmitting(true);
        try {
            await apiClient.put(`/contractor/maintenance/${selectedOS.id}/form-data`, data, authFetch);
            toast.success("OS atualizada");
            fetchOrders();
            setView("list");
            setSelectedOS(null);
        } catch (err: any) {
            toast.error(err.message || "Erro ao atualizar OS");
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
                readOnly={selectedOS.status === "CLOSED"}
                initialData={{
                    formType: selectedOS.formType as OsFormType,
                    clientName: selectedOS.clientName || "",
                    clientCity: selectedOS.clientCity || "",
                    clientState: selectedOS.clientState || "",
                    location: selectedOS.location || "",
                    contactName: selectedOS.contactName || "",
                    contactPhone: selectedOS.contactPhone || "",
                    contactRole: selectedOS.contactRole || "",
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

        return (
            <div className="space-y-6">
                <button
                    onClick={() => { setView("list"); setSelectedOS(null); }}
                    className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-white">
                                    {selectedOS.osNumber}
                                </CardTitle>
                                <p className="text-xs text-[var(--zyllen-muted)] mt-1">{formTypeLabel}</p>
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
                                {selectedOS.status !== "CLOSED" && (
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
                                        <span className="text-[var(--zyllen-muted)]">SKU:</span>
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
                                        {[selectedOS.contactName, selectedOS.contactRole, selectedOS.contactPhone].filter(Boolean).join(" · ")}
                                    </p>
                                </div>
                            )}
                            <div>
                                <span className="text-[var(--zyllen-muted)]">Aberta em:</span>
                                <p className="text-white">{new Date(selectedOS.createdAt).toLocaleString("pt-BR")}</p>
                            </div>
                        </div>

                        {/* Display form-specific data */}
                        {selectedOS.formData && Object.keys(selectedOS.formData).length > 0 && (
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Minhas Ordens de Serviço</h1>
                    <p className="text-sm text-[var(--zyllen-muted)] mt-1">Acompanhe e gerencie suas OS de manutenção</p>
                </div>
                <Button variant="highlight" onClick={() => setView("new")}>
                    <Plus size={16} className="mr-2" /> Nova OS
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-[var(--zyllen-muted)]">Carregando...</div>
            ) : orders.length === 0 ? (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardContent className="py-12 text-center">
                        <Wrench size={48} className="mx-auto text-[var(--zyllen-muted)]/30 mb-4" />
                        <p className="text-[var(--zyllen-muted)]">Nenhuma OS encontrada</p>
                        <Button variant="highlight" className="mt-4" onClick={() => setView("new")}>
                            Abrir Primeira OS
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {orders.map((os) => {
                        const statusCfg = STATUS_CONFIG[os.status] || STATUS_CONFIG.OPEN;
                        const StatusIcon = statusCfg.icon;
                        const formLabel = OS_FORM_CONFIG[os.formType as OsFormType]?.shortLabel || os.formType;
                        return (
                            <Card
                                key={os.id}
                                className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 transition-all cursor-pointer"
                                onClick={() => { setSelectedOS(os); setView("detail"); }}
                            >
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <StatusIcon size={18} style={{ color: statusCfg.color }} />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-white truncate">
                                                        {os.osNumber}
                                                    </p>
                                                    <Badge variant="outline" className="text-[10px] shrink-0">
                                                        {formLabel}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-[var(--zyllen-muted)]">
                                                    {os.clientName && `${os.clientName} · `}
                                                    {new Date(os.createdAt).toLocaleDateString("pt-BR")} · {statusCfg.label}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
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