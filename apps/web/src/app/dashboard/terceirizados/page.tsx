"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch, useAuth } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import { HardHat, Mail, Phone, MapPin, FileText, Power, Trash2 } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { EMPTY_STATES } from "@web/lib/brand-voice";

interface Contractor {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
    state: string | null;
    cpf: string | null;
    isActive: boolean;
    createdAt: string;
    _count: { maintenanceOrders: number };
}

export default function TerceirizadosPage() {
    const fetchOpts = useAuthedFetch();
    const { hasPermission } = useAuth();
    const qc = useQueryClient();
    const canManage = hasPermission("settings.manage");

    const { data, isLoading } = useQuery({
        queryKey: ["contractors"],
        queryFn: () => apiClient.get<{ data: Contractor[] }>("/clients/contractors", fetchOpts),
    });

    const toggleActive = useMutation({
        mutationFn: (params: { id: string; isActive: boolean }) =>
            apiClient.put(`/clients/contractors/${params.id}`, { isActive: params.isActive }, fetchOpts),
        onSuccess: () => {
            toast.success("Status atualizado");
            qc.invalidateQueries({ queryKey: ["contractors"] });
        },
        onError: (e: any) => toast.error(e.message || "Erro ao atualizar"),
    });

    const deleteContractor = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/clients/contractors/${id}`, fetchOpts),
        onSuccess: () => {
            toast.success("Terceirizado excluído");
            qc.invalidateQueries({ queryKey: ["contractors"] });
        },
        onError: (e: any) => toast.error(e.message || "Erro ao excluir"),
    });

    const handleDelete = (c: Contractor) => {
        if (confirm(`Tem certeza que deseja excluir "${c.name}"? Esta ação é irreversível.\n\nSe o terceirizado possui OS vinculadas, desative-o ao invés de excluir.`)) {
            deleteContractor.mutate(c.id);
        }
    };

    const contractors = data?.data || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <HardHat size={24} className="text-[var(--zyllen-highlight)]" />
                    Cadastro de Terceirizados
                </h1>
                <p className="text-sm text-[var(--zyllen-muted)] mt-1">
                    Gerencie os terceirizados cadastrados no sistema
                </p>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 bg-[var(--zyllen-bg)]" />)}
                </div>
            ) : contractors.length === 0 ? (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardContent className="py-12 text-center">
                        <HardHat size={40} className="mx-auto text-[var(--zyllen-muted)]/30 mb-3" />
                        <p className="text-[var(--zyllen-muted)]">Nenhum terceirizado cadastrado</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {contractors.map((c) => (
                        <Card key={c.id} className={`bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] ${!c.isActive ? "opacity-60" : ""}`}>
                            <CardContent className="py-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-semibold text-sm">{c.name}</h3>
                                    <Badge variant={c.isActive ? "success" : "default"}>
                                        {c.isActive ? "Ativo" : "Desativado"}
                                    </Badge>
                                </div>

                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center gap-2 text-[var(--zyllen-muted)]">
                                        <Mail size={12} />
                                        <span>{c.email}</span>
                                    </div>
                                    {c.cpf && (
                                        <div className="flex items-center gap-2 text-[var(--zyllen-muted)]">
                                            <FileText size={12} />
                                            <span>CPF: {c.cpf}</span>
                                        </div>
                                    )}
                                    {c.phone && (
                                        <div className="flex items-center gap-2 text-[var(--zyllen-muted)]">
                                            <Phone size={12} />
                                            <span>{c.phone}</span>
                                        </div>
                                    )}
                                    {(c.city || c.state) && (
                                        <div className="flex items-center gap-2 text-[var(--zyllen-muted)]">
                                            <MapPin size={12} />
                                            <span>{[c.city, c.state].filter(Boolean).join("/")}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-[var(--zyllen-border)]">
                                    <div className="flex items-center gap-1 text-xs text-[var(--zyllen-muted)]">
                                        <span>{c._count.maintenanceOrders} OS</span>
                                        <span className="mx-1">·</span>
                                        <span>Desde {new Date(c.createdAt).toLocaleDateString("pt-BR")}</span>
                                    </div>

                                    {canManage && (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={c.isActive
                                                    ? "text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                                                    : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                                                }
                                                onClick={() => toggleActive.mutate({ id: c.id, isActive: !c.isActive })}
                                                disabled={toggleActive.isPending}
                                                title={c.isActive ? "Desativar conta" : "Reativar conta"}
                                            >
                                                <Power size={14} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                onClick={() => handleDelete(c)}
                                                disabled={deleteContractor.isPending}
                                                title="Excluir terceirizado"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
