"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@web/features/auth/context/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@web/components/ui/dialog";
import { Button } from "@web/components/ui/button";
import { Textarea } from "@web/components/ui/textarea";
import { toast } from "sonner";
import {
    LayoutDashboard, Package, ScanBarcode, ShoppingCart,
    Headset, Wrench, Database, ShieldCheck, LogOut, ChevronLeft, Menu,
    Tag, Building2, Users, Key, X, FileText, HardHat, MessageSquareText, ClipboardList, Star, CalendarDays, Car,
    type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@web/lib/utils";
import { PROJECTS_AGENDA_COPY, VEHICLES_COPY } from "@web/lib/brand-voice";
import { ZyllenSidebarBrand, ZyllenTextLogo, SkyLineLogo } from "@web/components/brand/zyllen-logo";

interface PendingTicketRating {
    id: string;
    title: string;
    closedAt?: string | null;
    resolutionNotes?: string | null;
    assignedTo?: { id: string; name: string } | null;
}

interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    perm?: string | string[];
    managerOnly?: boolean;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
    {
        label: "Início",
        items: [
            { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
        ],
    },
    {
        label: "Minha rotina",
        items: [
            { label: "Meus Chamados TI", href: "/dashboard/chamados-ti", icon: MessageSquareText },
            { label: "Minhas OS", href: "/dashboard/minhas-os", icon: FileText, perm: "maintenance.view" },
        ],
    },
    {
        label: "Atendimento",
        items: [
            { label: "Chamados", href: "/dashboard/chamados", icon: Headset, perm: "tickets.view" },
            { label: "Abertura de OS", href: "/dashboard/manutencao", icon: Wrench, perm: "maintenance.view" },
            { label: "Acompanhamento", href: "/dashboard/acompanhamento", icon: ClipboardList },
        ],
    },
    {
        label: "Operação",
        items: [
            { label: PROJECTS_AGENDA_COPY.navigation, href: "/dashboard/projetos", icon: CalendarDays, perm: "schedule.view" },
            { label: VEHICLES_COPY.title, href: "/dashboard/carros", icon: Car, perm: ["vehicles.view", "schedule.view"] },
        ],
    },
    {
        label: "Estoque e patrimônio",
        items: [
            { label: "Estoque", href: "/dashboard/estoque", icon: Package, perm: "inventory.view" },
            { label: "Cadastros", href: "/dashboard/cadastros", icon: Database, perm: "catalog.view" },
            { label: "Patrimônio", href: "/dashboard/patrimonio", icon: ScanBarcode, perm: "assets.view" },
            { label: "Etiquetas", href: "/dashboard/etiquetas", icon: Tag, perm: "labels.view" },
            { label: "Compras", href: "/dashboard/compras", icon: ShoppingCart, perm: "purchases.view" },
        ],
    },
    {
        label: "Gestão",
        items: [
            { label: "Clientes", href: "/dashboard/clientes", icon: Building2, perm: "settings.view" },
            { label: "Aprovar clientes", href: "/dashboard/aprovacao-clientes", icon: ShieldCheck, managerOnly: true },
            { label: "Parceiros", href: "/dashboard/terceirizados", icon: HardHat, perm: "settings.view" },
            { label: "Colaboradores", href: "/dashboard/colaboradores", icon: Users, perm: "access.view" },
            { label: "Permissões", href: "/dashboard/permissoes", icon: Key, perm: "access.manage" },
            { label: "Acesso", href: "/dashboard/acesso", icon: ShieldCheck, perm: "access.view" },
        ],
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, token, logout, hasPermission } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const qc = useQueryClient();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [selectedRating, setSelectedRating] = useState(0);
    const [ratingComment, setRatingComment] = useState("");

    const isInternos = user?.type === "internal" && "role" in (user ?? {}) && (user as any).role?.name === "Internos";
    const internosRouteAllowed = !isInternos || ['/dashboard', '/dashboard/chamados-ti', '/dashboard/acompanhamento', '/dashboard/perfil'].includes(pathname);
    const canViewItem = (item: NavItem) => {
        if (isInternos) return ['/dashboard', '/dashboard/chamados-ti', '/dashboard/acompanhamento'].includes(item.href);
        if (item.managerOnly) return user?.type === 'internal' && ['Administrador', 'Gestor'].includes((user as any)?.role?.name ?? '');
        return !item.perm || (Array.isArray(item.perm) ? item.perm.some(hasPermission) : hasPermission(item.perm));
    };
    const visibleGroups = NAV_GROUPS
        .map((group) => ({ ...group, items: group.items.filter(canViewItem) }))
        .filter((group) => group.items.length > 0);

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
    useEffect(() => {
        if (!internosRouteAllowed) router.replace('/dashboard');
    }, [internosRouteAllowed, router]);

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

    const sidebarCollapsed = collapsed && !mobileOpen;

    if (!internosRouteAllowed) return null;

    const sidebarContent = (
        <>
            {/* Logo — Partnership */}
            <div className={cn(
                "flex h-16 shrink-0 items-center border-b border-[var(--zyllen-border)] transition-[gap,padding] duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
                sidebarCollapsed ? "gap-1 px-2" : "gap-3 px-4",
            )}>
                <ZyllenSidebarBrand collapsed={sidebarCollapsed} />
                <div className={cn(
                    "flex shrink-0 items-center gap-3 overflow-hidden transition-[width,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                    sidebarCollapsed ? "w-0 opacity-0" : "w-[45px] opacity-100",
                )}>
                        <div className="h-5 w-px bg-[var(--zyllen-border)]" />
                        <SkyLineLogo height={32} className="shrink-0" />
                </div>
                {/* Desktop collapse button */}
                <button
                    onClick={() => mobileOpen ? setMobileOpen(false) : setCollapsed(!collapsed)}
                    className="ml-auto shrink-0 text-[var(--zyllen-muted)] transition-colors hover:text-white"
                    aria-label={mobileOpen ? "Fechar menu" : collapsed ? "Expandir menu" : "Recolher menu"}
                >
                    {mobileOpen ? <X size={18} /> : collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Nav */}
            <nav aria-label="Navegação principal" className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
                {visibleGroups.map((group, groupIndex) => (
                    <section key={group.label} aria-label={group.label}>
                        {(!collapsed || mobileOpen) ? (
                            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                                {group.label}
                            </p>
                        ) : groupIndex > 0 ? (
                            <div aria-hidden="true" className="mx-3 mb-3 border-t border-white/10" />
                        ) : null}
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const active = pathname === item.href || (item.href === "/dashboard/projetos" && pathname === "/dashboard/agenda") || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        aria-current={active ? "page" : undefined}
                                        title={collapsed && !mobileOpen ? item.label : undefined}
                                        className={cn(
                                            "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zyllen-highlight)]/50",
                                            active
                                                ? "bg-white/[0.07] text-white"
                                                : "text-[var(--zyllen-muted)] hover:bg-white/[0.04] hover:text-white"
                                        )}
                                    >
                                        {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--zyllen-highlight)]" />}
                                        <item.icon size={18} className={active ? "text-[var(--zyllen-highlight)]" : "text-white/55"} />
                                        {(!collapsed || mobileOpen) && <span>{item.label}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </nav>

            {/* User */}
            <div className={cn("shrink-0 border-t border-[var(--zyllen-border)]", sidebarCollapsed ? "p-2" : "p-3")}>
                <div className={cn("flex items-center", sidebarCollapsed ? "gap-1" : "gap-3")}>
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
                    "hidden lg:flex flex-col border-r border-white/10 bg-[var(--zyllen-bg)] transition-all duration-300",
                    collapsed ? "w-[72px]" : "w-68"
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
                        <ZyllenTextLogo size="sm" />
                        <div className="h-4 w-px bg-[var(--zyllen-border)]" />
                        <SkyLineLogo height={26} />
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
                    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
