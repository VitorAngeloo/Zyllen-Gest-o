"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth, useAuthedFetch } from "@web/lib/auth-context";
import { apiClient } from "@web/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import {
    Headset, Clock, CheckCircle2, AlertCircle, List,
    User, RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface CurrentTicket {
    id: string;
    title: string;
    status: string;
    statusLabel: string;
    createdAt: string;
    assignedTo?: { name: string };
}

const STATUS_STYLE: Record<string, { color: string; icon: typeof Clock }> = {
    OPEN: { color: "var(--zyllen-info)", icon: AlertCircle },
    IN_PROGRESS: { color: "var(--zyllen-warning)", icon: Clock },
    WAITING_CLIENT: { color: "var(--zyllen-highlight)", icon: Headset },
};

export default function ClientPortalHome() {
    const { user } = useAuth();
    const authFetch = useAuthedFetch();
    const [currentTicket, setCurrentTicket] = useState<CurrentTicket | null>(null);
    const [loadingTicket, setLoadingTicket] = useState(true);

    const fetchCurrentTicket = useCallback(async () => {
        try {
            const res = await apiClient.get<{ data: CurrentTicket | null }>("/client/tickets/current", authFetch);
            setCurrentTicket(res.data);
        } catch {
            // No current ticket or error
            setCurrentTicket(null);
        } finally {
            setLoadingTicket(false);
        }
    }, [authFetch]);

    useEffect(() => {
        fetchCurrentTicket();
    }, [fetchCurrentTicket]);

    // Poll every 30s for live status updates
    useEffect(() => {
        const interval = setInterval(fetchCurrentTicket, 30000);
        return () => clearInterval(interval);
    }, [fetchCurrentTicket]);

    const ticketStyle = currentTicket
        ? STATUS_STYLE[currentTicket.status] || STATUS_STYLE.OPEN
        : null;

    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div>
                <h1 className="text-2xl font-bold text-white">
                    Olá, <span className="text-[var(--zyllen-highlight)]">{user?.name}</span>
                </h1>
                <p className="text-[var(--zyllen-muted)] mt-1">
                    Bem-vindo ao portal do cliente. Gerencie seus chamados e acompanhe o status em tempo real.
                </p>
            </div>

            {/* Current Ticket Status */}
            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] overflow-hidden">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-2 text-base">
                            <RefreshCw size={16} className="text-[var(--zyllen-highlight)]" />
                            Chamado Atual
                        </CardTitle>
                        <button
                            onClick={fetchCurrentTicket}
                            className="text-xs text-[var(--zyllen-muted)] hover:text-white transition-colors flex items-center gap-1"
                            title="Atualizar status"
                        >
                            <RefreshCw size={12} /> Atualizar
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingTicket ? (
                        <div className="flex items-center gap-2 text-[var(--zyllen-muted)] text-sm">
                            <div className="size-4 border-2 border-[var(--zyllen-highlight)] border-t-transparent rounded-full animate-spin" />
                            Verificando...
                        </div>
                    ) : currentTicket && ticketStyle ? (
                        <Link href={`/portal-cliente/chamados`}>
                            <div className="flex items-start gap-4 p-4 rounded-lg border border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 transition-all cursor-pointer">
                                <div
                                    className="flex items-center justify-center size-12 rounded-lg shrink-0"
                                    style={{ backgroundColor: `color-mix(in srgb, ${ticketStyle.color} 15%, transparent)` }}
                                >
                                    <ticketStyle.icon size={24} style={{ color: ticketStyle.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{currentTicket.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span
                                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                                            style={{
                                                backgroundColor: `color-mix(in srgb, ${ticketStyle.color} 15%, transparent)`,
                                                color: ticketStyle.color,
                                            }}
                                        >
                                            {currentTicket.statusLabel}
                                        </span>
                                    </div>
                                    {currentTicket.assignedTo && (
                                        <p className="text-xs text-[var(--zyllen-muted)] mt-1 flex items-center gap-1">
                                            <User size={12} />
                                            Técnico: <span className="text-white">{currentTicket.assignedTo.name}</span>
                                        </p>
                                    )}
                                    <p className="text-xs text-[var(--zyllen-muted)]/60 mt-1">
                                        Aberto em {new Date(currentTicket.createdAt).toLocaleDateString("pt-BR")}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ) : (
                        <div className="text-center py-4">
                            <CheckCircle2 size={32} className="mx-auto text-[var(--zyllen-success)]/40 mb-2" />
                            <p className="text-sm text-[var(--zyllen-muted)]">Você não tem chamados em aberto</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/portal-cliente/chamados?new=1">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 transition-all cursor-pointer group h-full">
                        <CardContent className="py-6 flex items-center gap-4">
                            <div
                                className="flex items-center justify-center size-12 rounded-lg shrink-0"
                                style={{ backgroundColor: "color-mix(in srgb, var(--zyllen-highlight) 15%, transparent)" }}
                            >
                                <Headset size={24} className="text-[var(--zyllen-highlight)]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white group-hover:text-[var(--zyllen-highlight)] transition-colors">
                                    Abrir Chamado
                                </p>
                                <p className="text-xs text-[var(--zyllen-muted)] mt-0.5">
                                    Solicite suporte ou relate um problema
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/portal-cliente/chamados">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 transition-all cursor-pointer group h-full">
                        <CardContent className="py-6 flex items-center gap-4">
                            <div
                                className="flex items-center justify-center size-12 rounded-lg shrink-0"
                                style={{ backgroundColor: "color-mix(in srgb, var(--zyllen-info) 15%, transparent)" }}
                            >
                                <List size={24} className="text-[var(--zyllen-info)]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white group-hover:text-[var(--zyllen-highlight)] transition-colors">
                                    Meus Chamados
                                </p>
                                <p className="text-xs text-[var(--zyllen-muted)] mt-0.5">
                                    Veja histórico e acompanhe andamento
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Help Info */}
            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardContent className="py-4 text-sm text-[var(--zyllen-muted)] space-y-1">
                    <p>Ao abrir um chamado, envie <strong className="text-white">fotos ou vídeos</strong> do problema para agilizar o atendimento.</p>
                    <p>O status do chamado é atualizado automaticamente a cada 30 segundos nesta página.</p>
                </CardContent>
            </Card>
        </div>
    );
}
