"use client";
import { useAuth, useAuthedFetch } from "@web/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { toast } from "sonner";
import { Package, ScanBarcode, Headset, Wrench, AlertCircle, CheckCircle2, XCircle, Users, Key, ShieldCheck, Database, Building2, Tag } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@web/components/ui/skeleton";
import { getGreeting, DASHBOARD_SUBTITLE, EMPTY_STATES, TOASTS } from "@web/lib/brand-voice";

export default function DashboardPage() {
    const { user, hasPermission } = useAuth();
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();

    const canViewInventory = hasPermission("inventory.view");
    const canViewAssets = hasPermission("assets.view");
    const canViewTickets = hasPermission("tickets.view");
    const canViewMaintenance = hasPermission("maintenance.view");

    const { data: balances, isLoading: loadingBalances } = useQuery({
        queryKey: ["balances"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/balances", fetchOpts),
        enabled: canViewInventory,
    });

    const { data: assets, isLoading: loadingAssets } = useQuery({
        queryKey: ["assets"],
        queryFn: () => apiClient.get<{ data: any[] }>("/assets", fetchOpts),
        enabled: canViewAssets,
    });

    const { data: tickets, isLoading: loadingTickets } = useQuery({
        queryKey: ["tickets"],
        queryFn: () => apiClient.get<{ data: any[] }>("/tickets", fetchOpts),
        enabled: canViewTickets,
    });

    const { data: maintenance, isLoading: loadingMaintenance } = useQuery({
        queryKey: ["maintenance"],
        queryFn: () => apiClient.get<{ data: any[] }>("/maintenance", fetchOpts),
        enabled: canViewMaintenance,
    });

    const { data: approvals } = useQuery({
        queryKey: ["approvals"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/approvals/pending", fetchOpts),
        enabled: canViewInventory,
    });

    const totalBalance = balances?.data?.reduce((acc: number, b: any) => acc + b.quantity, 0) ?? 0;
    const totalAssets = assets?.data?.length ?? 0;
    const openTickets = tickets?.data?.filter((t: any) => t.status !== "CLOSED").length ?? 0;
    const openMaintenance = maintenance?.data?.filter((m: any) => m.status !== "CLOSED").length ?? 0;
    const pendingApprovals = approvals?.data?.length ?? 0;

    const approveMut = useMutation({
        mutationFn: (id: string) => apiClient.post(`/inventory/approvals/${id}/approve`, {}, fetchOpts),
        onSuccess: () => { toast.success(TOASTS.approved); qc.invalidateQueries({ queryKey: ["approvals"] }); qc.invalidateQueries({ queryKey: ["balances"] }); },
        onError: (e: any) => toast.error(e.message),
    });

    const rejectMut = useMutation({
        mutationFn: (id: string) => apiClient.post(`/inventory/approvals/${id}/reject`, {}, fetchOpts),
        onSuccess: () => { toast.success(TOASTS.rejected); qc.invalidateQueries({ queryKey: ["approvals"] }); },
        onError: (e: any) => toast.error(e.message),
    });

    const statsLoading = loadingBalances || loadingAssets || loadingTickets || loadingMaintenance;

    const stats = [
        { label: "Itens em Estoque", value: totalBalance, icon: Package, color: "text-blue-400", bg: "bg-blue-400/10", loading: loadingBalances },
        { label: "Patrimônios", value: totalAssets, icon: ScanBarcode, color: "text-[var(--zyllen-highlight)]", bg: "bg-[var(--zyllen-highlight)]/10", loading: loadingAssets },
        { label: "Chamados Abertos", value: openTickets, icon: Headset, color: "text-amber-400", bg: "bg-amber-400/10", loading: loadingTickets },
        { label: "OS Abertas", value: openMaintenance, icon: Wrench, color: "text-purple-400", bg: "bg-purple-400/10", loading: loadingMaintenance },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">
                    {getGreeting()}, <span className="text-[var(--zyllen-highlight)]">{user?.name?.split(" ")[0]}</span>
                </h1>
                <p className="text-[var(--zyllen-muted)] mt-1">{DASHBOARD_SUBTITLE}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.label} className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/20 transition-all">
                        <CardContent className="flex items-center gap-4 pt-0">
                            <div className={`flex items-center justify-center size-12 rounded-xl ${stat.bg}`}>
                                <stat.icon size={24} className={stat.color} />
                            </div>
                            <div>
                                {stat.loading ? (
                                    <Skeleton className="h-8 w-14 mb-1" />
                                ) : (
                                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                                )}
                                <p className="text-xs text-[var(--zyllen-muted)]">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Pending Approvals */}
            {pendingApprovals > 0 && (
                <Card className="bg-[var(--zyllen-bg)] border-amber-500/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-white flex items-center gap-2">
                            <AlertCircle size={20} className="text-amber-400" />
                            Aprovações Pendentes
                            <Badge variant="warning">{pendingApprovals}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {approvals?.data?.slice(0, 5).map((req: any) => (
                                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]">
                                    <div className="min-w-0 flex-1">
                                        <span className="text-sm text-white">{req.requestType}</span>
                                        <p className="text-xs text-[var(--zyllen-muted)]">
                                            Solicitado por {req.requestedBy?.name}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300 hover:bg-green-400/10 h-8 w-8 p-0" onClick={() => approveMut.mutate(req.id)} disabled={approveMut.isPending || rejectMut.isPending}>
                                            <CheckCircle2 size={18} />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8 p-0" onClick={() => rejectMut.mutate(req.id)} disabled={approveMut.isPending || rejectMut.isPending}>
                                            <XCircle size={18} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Access */}
            <div>
                <h2 className="text-base font-semibold text-white mb-3">Acesso Rápido</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                        { label: "Colaboradores", href: "/dashboard/colaboradores", icon: Users, color: "text-emerald-400", bg: "bg-emerald-400/10", perm: "access.view" },
                        { label: "Permissões", href: "/dashboard/permissoes", icon: Key, color: "text-rose-400", bg: "bg-rose-400/10", perm: "access.manage" },
                        { label: "Clientes", href: "/dashboard/clientes", icon: Building2, color: "text-sky-400", bg: "bg-sky-400/10", perm: "settings.view" },
                        { label: "Cadastros", href: "/dashboard/cadastros", icon: Database, color: "text-orange-400", bg: "bg-orange-400/10", perm: "catalog.view" },
                        { label: "Etiquetas", href: "/dashboard/etiquetas", icon: Tag, color: "text-pink-400", bg: "bg-pink-400/10", perm: "labels.view" },
                        { label: "Acesso", href: "/dashboard/acesso", icon: ShieldCheck, color: "text-violet-400", bg: "bg-violet-400/10", perm: "access.view" },
                    ].filter((item) => hasPermission(item.perm)).map((item) => (
                        <Link key={item.href} href={item.href}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--zyllen-bg)] border border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 transition-all group">
                            <div className={`flex items-center justify-center size-10 rounded-lg ${item.bg} group-hover:scale-110 transition-transform`}>
                                <item.icon size={20} className={item.color} />
                            </div>
                            <span className="text-xs font-medium text-[var(--zyllen-muted)] group-hover:text-white transition-colors">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Tickets */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white text-base flex items-center gap-2">
                            <Headset size={18} className="text-amber-400" />
                            Chamados Recentes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingTickets ? (
                            <div className="space-y-2">
                                {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                            </div>
                        ) : tickets?.data?.length ? (
                            <div className="space-y-2">
                                {tickets.data.slice(0, 5).map((t: any) => (
                                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)]">
                                        <div className="min-w-0">
                                            <p className="text-sm text-white truncate">{t.title}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)]">{t.company?.name}</p>
                                        </div>
                                        <Badge variant={t.status === "OPEN" ? "warning" : t.status === "CLOSED" ? "success" : "default"}>
                                            {t.status === "OPEN" ? "Em aberto" : t.status === "CLOSED" ? "Encerrado" : "Em andamento"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Headset size={36} className="mx-auto text-[var(--zyllen-muted)]/30 mb-2" />
                                <p className="text-sm text-[var(--zyllen-muted)]">{EMPTY_STATES.tickets}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Maintenance */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white text-base flex items-center gap-2">
                            <Wrench size={18} className="text-purple-400" />
                            Manutenções Recentes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingMaintenance ? (
                            <div className="space-y-2">
                                {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                            </div>
                        ) : maintenance?.data?.length ? (
                            <div className="space-y-2">
                                {maintenance.data.slice(0, 5).map((m: any) => (
                                    <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] ${m.status === "OPEN" ? "border border-amber-500/30" : m.status === "IN_PROGRESS" ? "border border-blue-500/20" : ""}`}>
                                        <div className="min-w-0">
                                            <p className="text-sm text-white truncate font-mono">{m.osNumber || "OS"}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)]">{m.clientName || m.asset?.sku?.name || "—"}</p>
                                        </div>
                                        <Badge variant={m.status === "OPEN" ? "warning" : m.status === "CLOSED" ? "success" : "default"}>
                                            {m.status === "OPEN" ? "Em aberto" : m.status === "CLOSED" ? "Encerrada" : "Em andamento"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Wrench size={36} className="mx-auto text-[var(--zyllen-muted)]/30 mb-2" />
                                <p className="text-sm text-[var(--zyllen-muted)]">{EMPTY_STATES.maintenance}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
