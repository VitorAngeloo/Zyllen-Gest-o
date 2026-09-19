"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Headset, List, RefreshCw, User } from "lucide-react";

import { PageHeader } from "@web/components/ui/page-header";
import { ListSectionHeader } from "@web/components/ui/workspace";
import { useAuth, useAuthedFetch } from "@web/features/auth/context/auth-context";
import { apiClient } from "@web/lib/api-client";

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

const QUICK_ACTIONS = [
    {
        label: "Abrir chamado",
        description: "Solicite suporte e envie as informações do problema.",
        href: "/portal-cliente/chamados?new=1",
        icon: Headset,
    },
    {
        label: "Consultar chamados",
        description: "Veja o histórico completo e acompanhe cada atendimento.",
        href: "/portal-cliente/chamados",
        icon: List,
    },
];

export default function ClientPortalHome() {
    const { user } = useAuth();
    const authFetch = useAuthedFetch();
    const [currentTicket, setCurrentTicket] = useState<CurrentTicket | null>(null);
    const [loadingTicket, setLoadingTicket] = useState(true);

    const fetchCurrentTicket = useCallback(async () => {
        try {
            const response = await apiClient.get<{ data: CurrentTicket | null }>("/client/tickets/current", authFetch);
            setCurrentTicket(response.data);
        } catch {
            setCurrentTicket(null);
        } finally {
            setLoadingTicket(false);
        }
    }, [authFetch]);

    useEffect(() => { fetchCurrentTicket(); }, [fetchCurrentTicket]);

    useEffect(() => {
        const interval = setInterval(fetchCurrentTicket, 30000);
        return () => clearInterval(interval);
    }, [fetchCurrentTicket]);

    const ticketStyle = currentTicket ? STATUS_STYLE[currentTicket.status] || STATUS_STYLE.OPEN : null;

    return (
        <div className="space-y-10">
            <PageHeader
                eyebrow="Portal do cliente"
                title={<>Olá, <span className="text-[var(--zyllen-highlight)]">{user?.name}</span></>}
                description="Acompanhe o que precisa de atenção e encontre cada tarefa no lugar esperado."
            />

            <section className="space-y-4" aria-labelledby="current-ticket-title">
                <ListSectionHeader
                    title="Atendimento em foco"
                    description="O chamado aberto mais recente e seu andamento atual."
                    actions={
                        <button
                            type="button"
                            onClick={fetchCurrentTicket}
                            className="flex items-center gap-1.5 text-xs text-[var(--zyllen-muted)] transition-colors hover:text-white"
                            title="Atualizar status"
                        >
                            <RefreshCw size={12} /> Atualizar
                        </button>
                    }
                />

                <div className="border-y border-white/10">
                    {loadingTicket ? (
                        <div className="flex min-h-28 items-center gap-3 py-6 text-sm text-[var(--zyllen-muted)]">
                            <div className="size-4 animate-spin rounded-full border-2 border-[var(--zyllen-highlight)] border-t-transparent" />
                            Verificando atendimento...
                        </div>
                    ) : currentTicket && ticketStyle ? (
                        <Link
                            href="/portal-cliente/chamados"
                            className="group grid min-h-28 grid-cols-[auto_1fr_auto] items-center gap-4 py-5 transition-colors hover:bg-white/[0.02] sm:px-3"
                        >
                            <div className="flex size-10 items-center justify-center border border-white/10" style={{ color: ticketStyle.color }}>
                                <ticketStyle.icon size={20} />
                            </div>
                            <div className="min-w-0">
                                <p id="current-ticket-title" className="truncate text-sm font-semibold text-white">{currentTicket.title}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--zyllen-muted)]">
                                    <span style={{ color: ticketStyle.color }}>{currentTicket.statusLabel}</span>
                                    <span>Aberto em {new Date(currentTicket.createdAt).toLocaleDateString("pt-BR")}</span>
                                    {currentTicket.assignedTo && (
                                        <span className="flex items-center gap-1"><User size={12} />Técnico: {currentTicket.assignedTo.name}</span>
                                    )}
                                </div>
                            </div>
                            <ArrowRight size={17} className="text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-[var(--zyllen-highlight)]" />
                        </Link>
                    ) : (
                        <div className="flex min-h-28 items-center gap-4 py-6">
                            <CheckCircle2 size={24} className="shrink-0 text-[var(--zyllen-success)]" />
                            <div>
                                <p id="current-ticket-title" className="text-sm font-semibold text-white">Nenhum chamado em aberto</p>
                                <p className="mt-1 text-xs text-[var(--zyllen-muted)]">Sua fila está em dia. Abra um chamado quando precisar de suporte.</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="space-y-4" aria-labelledby="quick-actions-title">
                <ListSectionHeader title="O que você quer fazer?" description="Ações principais do portal do cliente." />
                <div className="divide-y divide-white/10 border-y border-white/10 sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    {QUICK_ACTIONS.map((action) => (
                        <Link key={action.href} href={action.href} className="group flex items-start gap-4 px-1 py-5 transition-colors hover:bg-white/[0.02] sm:px-5">
                            <action.icon size={19} className="mt-0.5 shrink-0 text-[var(--zyllen-highlight)]" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-white">{action.label}</p>
                                    <ArrowRight size={15} className="text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-[var(--zyllen-highlight)]" />
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-[var(--zyllen-muted)]">{action.description}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <aside className="border-l-2 border-[var(--zyllen-highlight)] pl-4 text-sm leading-relaxed text-[var(--zyllen-muted)]">
                <p><strong className="font-medium text-white">Para agilizar o atendimento:</strong> envie fotos ou vídeos do problema ao abrir o chamado.</p>
                <p className="mt-1 text-xs text-white/45">O status desta página é atualizado automaticamente a cada 30 segundos.</p>
            </aside>
        </div>
    );
}
