"use client";
import { useAuth, useAuthedFetch } from "@web/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Badge } from "@web/components/ui/badge";
import { Package, ScanBarcode, Headset, Wrench, ArrowDownCircle, ArrowUpCircle, AlertCircle, BarChart3 } from "lucide-react";

export default function DashboardPage() {
    const { user } = useAuth();
    const fetchOpts = useAuthedFetch();

    const { data: balances } = useQuery({
        queryKey: ["balances"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/balances", fetchOpts),
    });

    const { data: assets } = useQuery({
        queryKey: ["assets"],
        queryFn: () => apiClient.get<{ data: any[] }>("/assets", fetchOpts),
    });

    const { data: tickets } = useQuery({
        queryKey: ["tickets"],
        queryFn: () => apiClient.get<{ data: any[] }>("/tickets", fetchOpts),
    });

    const { data: maintenance } = useQuery({
        queryKey: ["maintenance"],
        queryFn: () => apiClient.get<{ data: any[] }>("/maintenance", fetchOpts),
    });

    const { data: approvals } = useQuery({
        queryKey: ["approvals"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/approvals/pending", fetchOpts),
    });

    const totalBalance = balances?.data?.reduce((acc: number, b: any) => acc + b.quantity, 0) ?? 0;
    const totalAssets = assets?.data?.length ?? 0;
    const openTickets = tickets?.data?.filter((t: any) => t.status !== "CLOSED").length ?? 0;
    const openMaintenance = maintenance?.data?.filter((m: any) => m.status !== "CLOSED").length ?? 0;
    const pendingApprovals = approvals?.data?.length ?? 0;

    const stats = [
        { label: "Itens em Estoque", value: totalBalance, icon: Package, color: "text-blue-400", bg: "bg-blue-400/10" },
        { label: "Patrimônios", value: totalAssets, icon: ScanBarcode, color: "text-[var(--zyllen-highlight)]", bg: "bg-[var(--zyllen-highlight)]/10" },
        { label: "Chamados Abertos", value: openTickets, icon: Headset, color: "text-amber-400", bg: "bg-amber-400/10" },
        { label: "OS Abertas", value: openMaintenance, icon: Wrench, color: "text-purple-400", bg: "bg-purple-400/10" },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">
                    Olá, <span className="text-[var(--zyllen-highlight)]">{user?.name?.split(" ")[0]}</span>
                </h1>
                <p className="text-[var(--zyllen-muted)] mt-1">Aqui está uma visão geral do sistema</p>
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
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
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
                                    <div>
                                        <span className="text-sm text-white">{req.requestType}</span>
                                        <p className="text-xs text-[var(--zyllen-muted)]">
                                            Solicitado por {req.requestedBy?.name}
                                        </p>
                                    </div>
                                    <Badge variant="warning">Pendente</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

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
                        {tickets?.data?.length ? (
                            <div className="space-y-2">
                                {tickets.data.slice(0, 5).map((t: any) => (
                                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)]">
                                        <div className="min-w-0">
                                            <p className="text-sm text-white truncate">{t.title}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)]">{t.company?.name}</p>
                                        </div>
                                        <Badge variant={t.status === "OPEN" ? "warning" : t.status === "CLOSED" ? "success" : "default"}>
                                            {t.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--zyllen-muted)] text-center py-4">Nenhum chamado</p>
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
                        {maintenance?.data?.length ? (
                            <div className="space-y-2">
                                {maintenance.data.slice(0, 5).map((m: any) => (
                                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)]">
                                        <div className="min-w-0">
                                            <p className="text-sm text-white truncate">{m.asset?.sku?.name}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)]">{m.asset?.sku?.skuCode}</p>
                                        </div>
                                        <Badge variant={m.status === "OPEN" ? "warning" : m.status === "CLOSED" ? "success" : "default"}>
                                            {m.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--zyllen-muted)] text-center py-4">Nenhuma OS</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
