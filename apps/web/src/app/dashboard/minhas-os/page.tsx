"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuth, useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import { FileText, Eye, ArrowLeft, Clock, CheckCircle2, AlertCircle, Edit, CheckSquare, Printer } from "lucide-react";
import { printOsPdf } from "@web/lib/os-pdf";
import { Skeleton } from "@web/components/ui/skeleton";
import { OS_FORM_CONFIG } from "@web/components/os-forms";
import type { OsFormType, OsFormSubmitData } from "@web/components/os-forms";
import { OsFormWizard } from "@web/components/os-forms";

type View = "list" | "detail" | "edit";
type ListTab = "mine" | "collaborators" | "contractors";

const STATUS_CONFIG: Record<string, { label: string; variant: "warning" | "default" | "success" }> = {
    OPEN: { label: "Aberta", variant: "warning" },
    IN_PROGRESS: { label: "Em Andamento", variant: "default" },
    CLOSED: { label: "Encerrada", variant: "success" },
};

export default function MinhasOsPage() {
    const { user, hasPermission } = useAuth();
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [view, setView] = useState<View>("list");
    const [selectedOS, setSelectedOS] = useState<any>(null);
    const [listTab, setListTab] = useState<ListTab>("mine");
    const [statusFilter, setStatusFilter] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const isAdmin = hasPermission("access.manage");

    // My OS
    const { data: myOsList, isLoading: loadingMy } = useQuery({
        queryKey: ["my-orders", statusFilter],
        queryFn: () => apiClient.get<{ data: any[] }>(
            `/maintenance/my-orders${statusFilter ? `?status=${statusFilter}` : ""}`,
            fetchOpts,
        ),
    });

    // All OS (admin/manager) — separated by collaborators vs contractors
    const { data: allOsList, isLoading: loadingAll } = useQuery({
        queryKey: ["maintenance-all", statusFilter],
        queryFn: () => apiClient.get<{ data: any[] }>(
            `/maintenance${statusFilter ? `?status=${statusFilter}` : ""}`,
            fetchOpts,
        ),
        enabled: isAdmin,
    });

    const collaboratorOrders = allOsList?.data.filter((os: any) => os.openedById && !os.openedByContractorId) || [];
    const contractorOrders = allOsList?.data.filter((os: any) => os.openedByContractorId) || [];

    const getDisplayList = () => {
        if (listTab === "mine") return myOsList?.data || [];
        if (listTab === "collaborators") return collaboratorOrders;
        if (listTab === "contractors") return contractorOrders;
        return [];
    };

    const handleSaveDraft = async (data: OsFormSubmitData) => {
        if (!selectedOS) return;
        setSubmitting(true);
        try {
            await apiClient.put(`/maintenance/${selectedOS.id}/form-data`, data, fetchOpts);
            toast.success("Rascunho salvo");
            qc.invalidateQueries({ queryKey: ["my-orders"] });
            qc.invalidateQueries({ queryKey: ["maintenance-all"] });
        } catch (e: any) {
            toast.error(e.message || "Erro ao salvar");
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = useMutation({
        mutationFn: (params: { id: string; status: string }) =>
            apiClient.put(`/maintenance/${params.id}/status`, { status: params.status, notes: params.status === "CLOSED" ? "Finalizado" : undefined }, fetchOpts),
        onSuccess: () => {
            toast.success("Status atualizado");
            qc.invalidateQueries({ queryKey: ["my-orders"] });
            qc.invalidateQueries({ queryKey: ["maintenance-all"] });
        },
        onError: (e: any) => toast.error(e.message || "Erro ao atualizar status"),
    });

    const handleFinalize = () => {
        if (!selectedOS) return;
        if (confirm("Tem certeza que deseja finalizar esta OS? Após finalizada, ela ficará em modo somente-leitura.")) {
            updateStatus.mutate({ id: selectedOS.id, status: "CLOSED" });
        }
    };

    const handlePrintPdf = () => {
        if (!selectedOS) return;
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
            contactRole: selectedOS.contactRole,
            openedBy: selectedOS.openedBy?.name || selectedOS.openedByContractor?.name,
            createdAt: selectedOS.createdAt,
            formData: selectedOS.formData,
        });
    };

    const handleEditSubmit = async (data: OsFormSubmitData) => {
        if (!selectedOS) return;
        setSubmitting(true);
        try {
            await apiClient.put(`/maintenance/${selectedOS.id}/form-data`, data, fetchOpts);
            toast.success("OS atualizada");
            qc.invalidateQueries({ queryKey: ["my-orders"] });
            qc.invalidateQueries({ queryKey: ["maintenance-all"] });
            setView("list");
            setSelectedOS(null);
        } catch (e: any) {
            toast.error(e.message || "Erro ao atualizar");
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
                    startedAt: selectedOS.startedAt ? new Date(selectedOS.startedAt).toISOString().slice(0, 16) : "",
                    endedAt: selectedOS.endedAt ? new Date(selectedOS.endedAt).toISOString().slice(0, 16) : "",
                    formData: selectedOS.formData || {},
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
                                <CardTitle className="text-white">{selectedOS.osNumber}</CardTitle>
                                <p className="text-sm text-[var(--zyllen-muted)] mt-1">{formTypeLabel}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
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
                                        {[selectedOS.contactName, selectedOS.contactRole, selectedOS.contactPhone].filter(Boolean).join(" · ")}
                                    </p>
                                </div>
                            )}
                        </div>

                        {selectedOS.formData && Object.keys(selectedOS.formData).length > 0 && (
                            <div>
                                <span className="text-sm text-[var(--zyllen-muted)]">Dados do Formulário:</span>
                                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                    {Object.entries(selectedOS.formData).map(([k, v]) => (
                                        <div key={k} className="bg-[var(--zyllen-bg-dark)] rounded p-2">
                                            <span className="text-[var(--zyllen-muted)] text-xs">{k}:</span>
                                            <p className="text-white truncate">{String(v)}</p>
                                        </div>
                                    ))}
                                </div>
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
    const displayList = getDisplayList();
    const loading = listTab === "mine" ? loadingMy : loadingAll;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <FileText size={24} className="text-[var(--zyllen-highlight)]" />
                    Minhas Ordens de Serviço
                </h1>
                <p className="text-sm text-[var(--zyllen-muted)] mt-1">
                    Acompanhe suas OS abertas e finalizadas
                </p>
            </div>

            {/* Tab selector (admin/manager sees extra tabs) */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setListTab("mine")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        listTab === "mine"
                            ? "bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)] border-[var(--zyllen-highlight)]/30"
                            : "text-[var(--zyllen-muted)] border-[var(--zyllen-border)] hover:text-white hover:bg-white/5"
                    }`}
                >
                    Minhas OS
                </button>
                {isAdmin && (
                    <>
                        <button
                            onClick={() => setListTab("collaborators")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                                listTab === "collaborators"
                                    ? "bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)] border-[var(--zyllen-highlight)]/30"
                                    : "text-[var(--zyllen-muted)] border-[var(--zyllen-border)] hover:text-white hover:bg-white/5"
                            }`}
                        >
                            Colaboradores
                        </button>
                        <button
                            onClick={() => setListTab("contractors")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                                listTab === "contractors"
                                    ? "bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)] border-[var(--zyllen-highlight)]/30"
                                    : "text-[var(--zyllen-muted)] border-[var(--zyllen-border)] hover:text-white hover:bg-white/5"
                            }`}
                        >
                            Terceirizados
                        </button>
                    </>
                )}
            </div>

            {/* Status filter */}
            <div className="flex gap-2">
                {["", "OPEN", "IN_PROGRESS", "CLOSED"].map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            statusFilter === s
                                ? "bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)]"
                                : "text-[var(--zyllen-muted)] hover:text-white"
                        }`}
                    >
                        {s === "" ? "Todas" : STATUS_CONFIG[s]?.label || s}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 bg-[var(--zyllen-bg)]" />)}
                </div>
            ) : displayList.length === 0 ? (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardContent className="py-12 text-center">
                        <FileText size={40} className="mx-auto text-[var(--zyllen-muted)]/30 mb-3" />
                        <p className="text-[var(--zyllen-muted)]">Nenhuma OS encontrada</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {displayList.map((os: any) => {
                        const formLabel = OS_FORM_CONFIG[os.formType as OsFormType]?.shortLabel || os.formType;
                        const stCfg = STATUS_CONFIG[os.status] || STATUS_CONFIG.OPEN;
                        return (
                            <Card
                                key={os.id}
                                className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 cursor-pointer transition-colors"
                                onClick={() => { setSelectedOS(os); setView("detail"); }}
                            >
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-semibold text-sm">{os.osNumber}</span>
                                                    <Badge variant={stCfg.variant} className="text-xs">{stCfg.label}</Badge>
                                                </div>
                                                <p className="text-xs text-[var(--zyllen-muted)] mt-1">
                                                    {formLabel}
                                                    {os.clientName && ` · ${os.clientName}`}
                                                    {(os.openedBy?.name || os.openedByContractor?.name) && listTab !== "mine" && ` · ${os.openedBy?.name || os.openedByContractor?.name}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-[var(--zyllen-muted)]">
                                                {new Date(os.createdAt).toLocaleDateString("pt-BR")}
                                            </span>
                                            <Eye size={16} className="text-[var(--zyllen-muted)]" />
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
