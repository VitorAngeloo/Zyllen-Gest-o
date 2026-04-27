"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@web/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@web/components/ui/dialog";
import { Button } from "@web/components/ui/button";
import { Textarea } from "@web/components/ui/textarea";
import { toast } from "sonner";
import {
    LayoutDashboard, Package, ScanBarcode, ShoppingCart,
    Headset, Wrench, Database, ShieldCheck, LogOut, ChevronLeft, Menu,
    Tag, Building2, Users, UserCircle, Key, X, FileText, HardHat, MessageSquareText, ClipboardList, Star
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@web/lib/utils";
import { Breadcrumb } from "@web/components/ui/breadcrumb";
import { ZyllenIcon, ZyllenTextLogo, SkyLineLogo } from "@web/components/brand/zyllen-logo";

interface PendingTicketRating {
    id: string;
    title: string;
    closedAt?: string | null;
    resolutionNotes?: string | null;
    assignedTo?: { id: string; name: string } | null;
}

const NAV_ITEMS: { label: string; href: string; icon: any; perm?: string }[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
    { label: "Meus Chamados TI", href: "/dashboard/chamados-ti", icon: MessageSquareText },
    { label: "Chamados", href: "/dashboard/chamados", icon: Headset, perm: "tickets.view" },
    { label: "Minhas OS", href: "/dashboard/minhas-os", icon: FileText, perm: "maintenance.view" },
    { label: "Abertura de OS", href: "/dashboard/manutencao", icon: Wrench, perm: "maintenance.view" },
    { label: "Acompanhamento", href: "/dashboard/acompanhamento", icon: ClipboardList },
    { label: "Estoque", href: "/dashboard/estoque", icon: Package, perm: "inventory.view" },
    { label: "Cadastro", href: "/dashboard/cadastros", icon: Database, perm: "catalog.view" },
    { label: "Patrimonio", href: "/dashboard/patrimonio", icon: ScanBarcode, perm: "assets.view" },
    { label: "Etiquetas", href: "/dashboard/etiquetas", icon: Tag, perm: "labels.view" },
    { label: "Compras", href: "/dashboard/compras", icon: ShoppingCart, perm: "purchases.view" },
    { label: "Clientes", href: "/dashboard/clientes", icon: Building2, perm: "settings.view" },
    { label: "Parceiros", href: "/dashboard/terceirizados", icon: HardHat, perm: "settings.view" },
    { label: "Colaboradores", href: "/dashboard/colaboradores", icon: Users, perm: "access.view" },
    { label: "Permissões", href: "/dashboard/permissoes", icon: Key, perm: "access.manage" },
    { label: "Acesso", href: "/dashboard/acesso", icon: ShieldCheck, perm: "access.view" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, token, logout, hasPermission } = useAuth();
    const pathname = usePathname();
    const qc = useQueryClient();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [selectedRating, setSelectedRating] = useState(0);
    const [ratingComment, setRatingComment] = useState("");

    const isInternos = user?.type === "internal" && "role" in (user ?? {}) && (user as any).role?.name === "Internos";
    const visibleItems = NAV_ITEMS.filter((item) => {
        // Hide Dashboard for Internos role
        if (isInternos && item.href === "/dashboard" && item.perm === "dashboard.view") return false;
        return !item.perm || hasPermission(item.perm);
    });

    // Close mobile sidebar on route change

    const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const { data: pendingRatingResponse } = useQuery({
        queryKey: ["tickets", "pending-rating"],
        queryFn: () => apiClient.get<{ data: PendingTicketRating | null }>("/tickets/my-internal/pending-rating", authHeaders),
        enabled: !!token && user?.type === "internal",
        refetchInterval: 15000,
    });

    const pendingRating = pendingRatingResponse?.data ?? null;
    const commentRequired = selectedRating > 0 && selectedRating <= 3;

    const ratingMutation = useMutation({
        mutationFn: (payload: { ticketId: string; rating: number; comment?: string }) =>
            apiClient.post(`/tickets/my-internal/${payload.ticketId}/rating`, {
                rating: payload.rating,
                comment: payload.comment,
            }, authHeaders),
        onSuccess: () => {
            toast.success("Avaliação enviada com sucesso!");
            setSelectedRating(0);
            setRatingComment("");
            qc.invalidateQueries({ queryKey: ["tickets", "pending-rating"] });
            qc.invalidateQueries({ queryKey: ["tickets"] });
            qc.invalidateQueries({ queryKey: ["ticket"] });
            qc.invalidateQueries({ queryKey: ["tickets", "open"] });
            qc.invalidateQueries({ queryKey: ["tickets", "in_progress"] });
            window.dispatchEvent(new Event("tickets:refresh"));
        },
        onError: (error: any) => {
            toast.error(error?.message || "Erro ao enviar avaliação");
        },
    });

    useEffect(() => {
        setSelectedRating(0);
        setRatingComment("");
    }, [pendingRating?.id]);
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    useEffect(() => {
        if (!pendingRating) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [pendingRating]);

    const handleSubmitRating = () => {
        if (!pendingRating || selectedRating < 1) return;
        const trimmedComment = ratingComment.trim();
        if (commentRequired && trimmedComment.length < 10) return;

        ratingMutation.mutate({
            ticketId: pendingRating.id,
            rating: selectedRating,
            comment: trimmedComment || undefined,
        });
    };

    const sidebarContent = (
        <>
            {/* Logo — Partnership */}
            <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--zyllen-border)] shrink-0">
                <ZyllenIcon height={collapsed && !mobileOpen ? 28 : 32} />
                {(!collapsed || mobileOpen) && (
                    <>
                        <ZyllenTextLogo size="default" />
                        <div className="h-5 w-px bg-[var(--zyllen-border)]" />
                        <SkyLineLogo height={22} />
                    </>
                )}
                {/* Desktop collapse button */}
                <button
                    onClick={() => mobileOpen ? setMobileOpen(false) : setCollapsed(!collapsed)}
                    className="ml-auto text-[var(--zyllen-muted)] hover:text-white transition-colors"
                    aria-label={mobileOpen ? "Fechar menu" : collapsed ? "Expandir menu" : "Recolher menu"}
                >
                    {mobileOpen ? <X size={18} /> : collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {visibleItems.map((item) => {
                    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={collapsed && !mobileOpen ? item.label : undefined}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                                active
                                    ? "bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)] border-l-2 border-[var(--zyllen-highlight)]"
                                    : "text-[var(--zyllen-muted)] hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                            )}
                        >
                            <item.icon size={20} className={active ? "text-[var(--zyllen-highlight)]" : ""} />
                            {(!collapsed || mobileOpen) && item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* User */}
            <div className="border-t border-[var(--zyllen-border)] p-3 shrink-0">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/perfil"
                        className="flex items-center justify-center size-8 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] font-bold text-xs hover:bg-[var(--zyllen-highlight)]/30 transition-colors"
                        title="Meu Perfil"
                    >
                        {user?.name?.charAt(0).toUpperCase()}
                    </Link>
                    {(!collapsed || mobileOpen) && (
                        <Link href="/dashboard/perfil" className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                            <p className="text-xs text-[var(--zyllen-muted)] truncate">{user?.type === 'internal' ? (typeof (user as any).role === 'string' ? (user as any).role : (user as any).role?.name) : ''}</p>
                        </Link>
                    )}
                    <button
                        onClick={logout}
                        className="text-[var(--zyllen-muted)] hover:text-[var(--zyllen-error)] transition-colors"
                        title="Sair"
                        aria-label="Sair"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-[var(--zyllen-bg-dark)]">
            <Dialog open={!!pendingRating} onOpenChange={() => {}}>
                <DialogContent className="border-[var(--zyllen-border)] max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Avaliação obrigatória do atendimento</DialogTitle>
                        <DialogDescription>
                            Antes de continuar no sistema, avalie o chamado finalizado.</DialogDescription>
                    </DialogHeader>
                    <DialogBody className="space-y-5">
                        <div className="rounded-xl border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]/60 p-4 space-y-2">
                            <p className="text-sm font-medium text-white">{pendingRating?.title}</p>
                            <div className="space-y-1 text-xs text-[var(--zyllen-muted)]">
                                {pendingRating?.assignedTo?.name && <p>Técnico responsável: <span className="text-white">{pendingRating.assignedTo.name}</span></p>}
                                {pendingRating?.closedAt && <p>Finalizado em <span className="text-white">{new Date(pendingRating.closedAt).toLocaleString("pt-BR")}</span></p>}
                            </div>
                            {pendingRating?.resolutionNotes && (
                                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 mt-3">
                                    <p className="text-[11px] uppercase tracking-wider text-emerald-300 mb-1">Descrição do atendimento</p>
                                    <p className="text-sm text-white whitespace-pre-wrap">{pendingRating.resolutionNotes}</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-white">Qual nota você dá para o atendimento?</p>
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setSelectedRating(value)}
                                        className="rounded-lg p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/40"
                                        aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
                                    >
                                        <Star className={cn("size-8", value <= selectedRating ? "fill-yellow-400 text-yellow-400" : "text-[var(--zyllen-muted)]")}/>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-[var(--zyllen-muted)]">
                                {selectedRating === 0
                                    ? "Selecione de 1 a 5 estrelas"
                                    : commentRequired
                                        ? "Para notas até 3 estrelas, o comentário é obrigatório"
                                        : "Comentário opcional"}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white">Comentário {commentRequired ? "*" : "(opcional)"}</label>
                            <Textarea
                                value={ratingComment}
                                onChange={(event) => setRatingComment(event.target.value)}
                                rows={4}
                                placeholder="Descreva como foi o atendimento"
                                className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                            />
                            {commentRequired && ratingComment.trim().length > 0 && ratingComment.trim().length < 10 && (
                                <p className="text-xs text-red-400">Mínimo de 10 caracteres ({ratingComment.trim().length}/10)</p>
                            )}
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="highlight"
                            className="w-full"
                            onClick={handleSubmitRating}
                            disabled={selectedRating < 1 || (commentRequired && ratingComment.trim().length < 10) || ratingMutation.isPending}
                        >
                            {ratingMutation.isPending ? "Enviando avaliação..." : "Enviar avaliação"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-in fade-in duration-200"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-[var(--zyllen-bg)] border-r border-[var(--zyllen-border)] transition-transform duration-300 lg:hidden",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {sidebarContent}
            </aside>

            {/* Desktop sidebar */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col border-r border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] transition-all duration-300",
                    collapsed ? "w-16" : "w-64"
                )}
            >
                {sidebarContent}
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile top bar */}
                <header className="flex items-center h-14 px-4 border-b border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] lg:hidden shrink-0">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="text-[var(--zyllen-muted)] hover:text-white transition-colors mr-3"
                        aria-label="Abrir menu"
                    >
                        <Menu size={22} />
                    </button>
                    <div className="flex items-center gap-2">
                        <ZyllenIcon height={26} />
                        <ZyllenTextLogo size="sm" />
                        <div className="h-4 w-px bg-[var(--zyllen-border)]" />
                        <SkyLineLogo height={18} />
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Link
                            href="/dashboard/perfil"
                            className="flex items-center justify-center size-8 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] font-bold text-xs"
                        >
                            {user?.name?.charAt(0).toUpperCase()}
                        </Link>
                    </div>
                </header>

                <main className="flex-1 overflow-auto">
                    <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
