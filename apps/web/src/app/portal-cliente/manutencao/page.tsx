"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import {
    Wrench, ArrowLeft, Calendar, MapPin, User, Phone, Building2,
    RefreshCw, PenLine, Check, Loader2, Lock,
} from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { toast } from "sonner";
import { OS_FORM_CONFIG } from "@web/components/os-forms";
import type { OsFormType } from "@web/components/os-forms";
import { getOsFieldRows } from "@web/lib/os-form-view";
import { OSFollowupSection, InlineSignaturePad } from "@web/components/os-forms/os-followup-section";

const STATUS_CONFIG: Record<string, { label: string; variant: "warning" | "default" | "success" }> = {
    OPEN: { label: "Aberta", variant: "warning" },
    IN_PROGRESS: { label: "Em Andamento", variant: "default" },
    CLOSED: { label: "Encerrada", variant: "success" },
};

function formatDate(v: string | null | undefined) {
    if (!v) return "—";
    return new Date(v).toLocaleString("pt-BR");
}

export default function ClientMaintenancePage() {
    const fetchOpts = useAuthedFetch();
    const [selectedOS, setSelectedOS] = useState<any>(null);
    const [signingWitness, setSigningWitness] = useState(false);
    const [sigValue, setSigValue] = useState("");

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["client-maintenance"],
        queryFn: () => apiClient.get<{ data: any[]; total: number }>("/client/maintenance", fetchOpts),
    });

    const osList: any[] = data?.data ?? [];

    const signWitnessMutation = useMutation({
        mutationFn: (sig: string) =>
            apiClient.put(`/client/maintenance/${selectedOS?.id}/witness-signature`, { signature: sig }, fetchOpts),
        onSuccess: () => {
            toast.success("Assinatura salva com sucesso");
            setSelectedOS((prev: any) => ({
                ...prev,
                formData: { ...(prev.formData || {}), witnessSignature: sigValue },
            }));
            setSigningWitness(false);
            setSigValue("");
        },
        onError: (e: any) => toast.error(e.message || "Erro ao salvar assinatura"),
    });

    if (selectedOS) {
        const status = STATUS_CONFIG[selectedOS.status] ?? { label: selectedOS.status, variant: "default" as const };
        const formTypeLabel = OS_FORM_CONFIG[selectedOS.formType as OsFormType]?.label || selectedOS.formType;
        const formRows = getOsFieldRows(selectedOS.formType, selectedOS.formData);
        const displayRows = formRows.filter((r) => r.key !== "witnessSignature");
        const witnessSignature = selectedOS.formData?.witnessSignature as string | null | undefined;
        const isClosed = selectedOS.status === "CLOSED";

        return (
            <div className="space-y-6">
                <button
                    onClick={() => { setSelectedOS(null); setSigningWitness(false); setSigValue(""); }}
                    className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-white">{selectedOS.osNumber}</h1>
                        <p className="text-sm text-[var(--zyllen-muted)] mt-0.5">{formTypeLabel}</p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                </div>

                {/* Info geral */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm">Informações Gerais</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-start gap-2">
                                <Building2 size={14} className="text-[var(--zyllen-muted)] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[var(--zyllen-muted)] text-xs">Empresa</p>
                                    <p className="text-white">{selectedOS.clientName || "—"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <MapPin size={14} className="text-[var(--zyllen-muted)] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[var(--zyllen-muted)] text-xs">Local</p>
                                    <p className="text-white">{selectedOS.location || [selectedOS.clientCity, selectedOS.clientState].filter(Boolean).join(" — ") || "—"}</p>
                                </div>
                            </div>
                            {selectedOS.contactName && (
                                <div className="flex items-start gap-2">
                                    <User size={14} className="text-[var(--zyllen-muted)] mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-[var(--zyllen-muted)] text-xs">Contato</p>
                                        <p className="text-white">{selectedOS.contactName}</p>
                                    </div>
                                </div>
                            )}
                            {selectedOS.contactPhone && (
                                <div className="flex items-start gap-2">
                                    <Phone size={14} className="text-[var(--zyllen-muted)] mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-[var(--zyllen-muted)] text-xs">Telefone</p>
                                        <p className="text-white">{selectedOS.contactPhone}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-2">
                                <Calendar size={14} className="text-[var(--zyllen-muted)] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[var(--zyllen-muted)] text-xs">Aberta em</p>
                                    <p className="text-white">{formatDate(selectedOS.createdAt)}</p>
                                </div>
                            </div>
                            {selectedOS.startedAt && (
                                <div className="flex items-start gap-2">
                                    <Calendar size={14} className="text-[var(--zyllen-muted)] mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-[var(--zyllen-muted)] text-xs">Início do serviço</p>
                                        <p className="text-white">{formatDate(selectedOS.startedAt)}</p>
                                    </div>
                                </div>
                            )}
                            {selectedOS.endedAt && (
                                <div className="flex items-start gap-2">
                                    <Calendar size={14} className="text-[var(--zyllen-muted)] mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-[var(--zyllen-muted)] text-xs">Fim do serviço</p>
                                        <p className="text-white">{formatDate(selectedOS.endedAt)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Detalhes do formulário (sem witnessSignature — fica na seção dedicada abaixo) */}
                {displayRows.length > 0 && (
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white text-sm">Detalhes do Serviço</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {displayRows.map((row) => (
                                <div key={row.label} className="grid grid-cols-2 gap-2 text-sm border-b border-[var(--zyllen-border)]/40 pb-2 last:border-0 last:pb-0">
                                    <span className="text-[var(--zyllen-muted)]">{row.label}</span>
                                    {row.isSignature && typeof row.rawValue === "string" ? (
                                        <div className="bg-white rounded p-1">
                                            <img src={row.rawValue} alt={row.label} className="max-h-16 object-contain" />
                                        </div>
                                    ) : (
                                        <span className={row.isEmpty ? "text-[var(--zyllen-muted)] italic" : "text-white"}>
                                            {row.displayValue}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Assinatura do Responsável (witnessSignature) */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-white text-sm flex items-center gap-2">
                            <PenLine size={14} className="text-amber-400" />
                            Assinatura do Responsável
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {witnessSignature ? (
                            <div className="space-y-2">
                                <div className="rounded-md border border-green-500/30 bg-white p-2">
                                    <img src={witnessSignature} alt="Assinatura" className="w-full h-24 object-contain" />
                                </div>
                                <p className="text-xs text-green-400 flex items-center gap-1">
                                    <Lock size={11} /> Assinatura registrada
                                </p>
                                {!isClosed && !signingWitness && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-[var(--zyllen-muted)] hover:text-white"
                                        onClick={() => { setSigValue(""); setSigningWitness(true); }}
                                    >
                                        Substituir assinatura
                                    </Button>
                                )}
                            </div>
                        ) : !signingWitness ? (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-[var(--zyllen-muted)] italic">
                                    {isClosed ? "Nenhuma assinatura registrada" : "Clique em 'Assinar' para registrar sua assinatura."}
                                </p>
                                {!isClosed && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-1"
                                        onClick={() => { setSigValue(""); setSigningWitness(true); }}
                                    >
                                        <PenLine size={12} /> Assinar
                                    </Button>
                                )}
                            </div>
                        ) : null}

                        {signingWitness && (
                            <div className="space-y-3">
                                <InlineSignaturePad value={sigValue} onChange={setSigValue} />
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="highlight"
                                        onClick={() => signWitnessMutation.mutate(sigValue)}
                                        disabled={!sigValue || signWitnessMutation.isPending}
                                        className="gap-1 text-xs"
                                    >
                                        {signWitnessMutation.isPending
                                            ? <Loader2 size={12} className="animate-spin" />
                                            : <Check size={12} />}
                                        Salvar Assinatura
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => { setSigningWitness(false); setSigValue(""); }}
                                        className="text-xs text-[var(--zyllen-muted)]"
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Acompanhamentos — show for all form types */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardContent className="pt-4">
                        <OSFollowupSection
                            osId={selectedOS.id}
                            apiBasePath="/client/maintenance"
                            fetchOpts={fetchOpts}
                            clientMode={true}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Wrench size={22} className="text-[var(--zyllen-highlight)]" />
                        Ordens de Serviço
                    </h1>
                    <p className="text-[var(--zyllen-muted)] text-sm mt-1">
                        OS vinculadas à sua empresa
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="text-xs text-[var(--zyllen-muted)] hover:text-white transition-colors flex items-center gap-1"
                >
                    <RefreshCw size={12} /> Atualizar
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 bg-[var(--zyllen-bg)]" />)}
                </div>
            ) : osList.length === 0 ? (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardContent className="py-12 text-center">
                        <Wrench size={32} className="mx-auto text-[var(--zyllen-muted)]/40 mb-3" />
                        <p className="text-[var(--zyllen-muted)] text-sm">Nenhuma ordem de serviço encontrada</p>
                        <p className="text-[var(--zyllen-muted)]/60 text-xs mt-1">
                            As OS vinculadas à sua empresa aparecerão aqui
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {osList.map((os) => {
                        const status = STATUS_CONFIG[os.status] ?? { label: os.status, variant: "default" as const };
                        const formTypeLabel = OS_FORM_CONFIG[os.formType as OsFormType]?.label || os.formType;
                        return (
                            <Card
                                key={os.id}
                                className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 transition-all cursor-pointer"
                                onClick={() => { setSelectedOS(os); setSigningWitness(false); setSigValue(""); }}
                            >
                                <CardContent className="py-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className="flex items-center justify-center size-10 rounded-lg shrink-0"
                                            style={{ backgroundColor: "color-mix(in srgb, var(--zyllen-highlight) 15%, transparent)" }}
                                        >
                                            <Wrench size={18} className="text-[var(--zyllen-highlight)]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">{os.osNumber}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)] truncate">{formTypeLabel}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)]/60 mt-0.5">
                                                {new Date(os.createdAt).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
