"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch, useAuth } from "@web/features/auth/context/auth-context";
import { Button } from "@web/components/ui/button";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import { HardHat, Mail, Phone, MapPin, FileText, Power, Trash2 } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { PageHeader } from "@web/components/ui/page-header";
import { EmptyState, ListSectionHeader } from "@web/components/ui/workspace";

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
            toast.success("Parceiro excluído");
            qc.invalidateQueries({ queryKey: ["contractors"] });
        },
        onError: (e: any) => toast.error(e.message || "Erro ao excluir"),
    });

    const handleDelete = (c: Contractor) => {
        if (confirm(`Tem certeza que deseja excluir "${c.name}"? Esta ação é irreversível.\n\nSe o parceiro possui OS vinculadas, desative-o ao invés de excluir.`)) {
            deleteContractor.mutate(c.id);
        }
    };

    const contractors = data?.data || [];

    return (
        <div className="space-y-6">
            <PageHeader eyebrow="Gestão" title="Cadastro de Parceiros" description="Gerencie os parceiros cadastrados no sistema" />

            <ListSectionHeader
                title="Parceiros"
                count={contractors.length}
                description="Contas externas que executam ordens de serviço em nome da operação."
            />

            {isLoading ? (
                <div className="divide-y divide-white/10 border-y border-white/10">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="my-3 h-20 bg-white/[0.035]" />)}
                </div>
            ) : contractors.length === 0 ? (
                <EmptyState icon={<HardHat size={22} />} title="Nenhum parceiro cadastrado" description="Novos parceiros aparecem aqui depois da criação da conta." />
            ) : (
                <div className="divide-y divide-white/10 border-y border-white/10">
                    {contractors.map((c) => (
                        <article key={c.id} className={`grid gap-4 py-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(220px,1fr)_auto] sm:items-center ${!c.isActive ? "opacity-60" : ""}`}>
                            <div className="min-w-0 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-semibold text-white">{c.name}</h3>
                                    <Badge variant={c.isActive ? "success" : "default"}>
                                        {c.isActive ? "Ativo" : "Desativado"}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--zyllen-muted)]">
                                    <span className="flex items-center gap-1.5">
                                        <Mail size={12} />
                                        <span>{c.email}</span>
                                    </span>
                                    {c.cpf && (
                                        <span className="flex items-center gap-1.5">
                                            <FileText size={12} />
                                            <span>CPF: {c.cpf}</span>
                                        </span>
                                    )}
                                    {c.phone && (
                                        <span className="flex items-center gap-1.5">
                                            <Phone size={12} />
                                            <span>{c.phone}</span>
                                        </span>
                                    )}
                                    {(c.city || c.state) && (
                                        <span className="flex items-center gap-1.5">
                                            <MapPin size={12} />
                                            <span>{[c.city, c.state].filter(Boolean).join("/")}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-[var(--zyllen-muted)]">
                                <span className="font-mono tabular-nums text-white">{c._count.maintenanceOrders}</span>
                                <span>OS · parceiro desde {new Date(c.createdAt).toLocaleDateString("pt-BR")}</span>
                            </div>

                            {canManage && (
                                        <div className="flex items-center gap-1 sm:justify-end">
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
                                                title="Excluir parceiro"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
