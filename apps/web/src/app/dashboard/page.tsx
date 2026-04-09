"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useAuthedFetch } from "@web/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Textarea } from "@web/components/ui/textarea";
import { Select, SelectOption } from "@web/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@web/components/ui/dialog";
import { toast } from "sonner";
import {
    Package, ScanBarcode, Headset, Wrench, AlertCircle, CheckCircle2, XCircle,
    Users, Key, ShieldCheck, Database, Building2, Tag, Plus, X, Pencil,
    FileText, ShoppingCart, MessageSquareText, LayoutDashboard, HardHat, GripVertical,
    Clock, UserCheck, Shield, Timer, ArrowRightLeft, Check,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@web/components/ui/skeleton";
import { getGreeting, DASHBOARD_SUBTITLE, EMPTY_STATES, TOASTS } from "@web/lib/brand-voice";

/* ─── Elapsed time helper ─── */
function formatElapsed(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min ${String(s).padStart(2, "0")}s`;
    if (m > 0) return `${m}min ${String(s).padStart(2, "0")}s`;
    return `${s}s`;
}

/* ─── Live timer component ─── */
function LiveTimer({ since }: { since: string }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    const elapsed = now - new Date(since).getTime();
    const hours = elapsed / 3_600_000;
    const color = hours >= 4 ? "text-red-400" : hours >= 2 ? "text-amber-400" : "text-emerald-400";
    return (
        <span className={`text-xs font-mono ${color} flex items-center gap-1`}>
            <Timer size={12} />
            {formatElapsed(Math.max(0, elapsed))}
        </span>
    );
}

/* ─── Attention level helper ─── */
function getAttentionLevel(count: number) {
    if (count >= 6) return { label: "Alerta Máximo", color: "text-red-400", bg: "bg-red-500/10", border: "border-l-red-500", badge: "destructive" as const, ring: "ring-red-500/20" };
    if (count >= 4) return { label: "Atenção", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-l-amber-500", badge: "warning" as const, ring: "ring-amber-500/20" };
    return { label: "Normal", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-l-emerald-500", badge: "success" as const, ring: "ring-emerald-500/20" };
}

/* ─── All available shortcuts ─── */
const ALL_SHORTCUTS = [
    { id: "chamados-ti", label: "Meus Chamados TI", href: "/dashboard/chamados-ti", icon: MessageSquareText, color: "text-cyan-400", bg: "bg-cyan-400/10" },
    { id: "chamados", label: "Chamados", href: "/dashboard/chamados", icon: Headset, color: "text-amber-400", bg: "bg-amber-400/10", perm: "tickets.view" },
    { id: "minhas-os", label: "Minhas OS", href: "/dashboard/minhas-os", icon: FileText, color: "text-teal-400", bg: "bg-teal-400/10", perm: "maintenance.view" },
    { id: "manutencao", label: "Manutenção", href: "/dashboard/manutencao", icon: Wrench, color: "text-purple-400", bg: "bg-purple-400/10", perm: "maintenance.view" },
    { id: "estoque", label: "Estoque", href: "/dashboard/estoque", icon: Package, color: "text-blue-400", bg: "bg-blue-400/10", perm: "inventory.view" },
    { id: "patrimonio", label: "Patrimônio", href: "/dashboard/patrimonio", icon: ScanBarcode, color: "text-[var(--zyllen-highlight)]", bg: "bg-[var(--zyllen-highlight)]/10", perm: "assets.view" },
    { id: "compras", label: "Compras", href: "/dashboard/compras", icon: ShoppingCart, color: "text-lime-400", bg: "bg-lime-400/10", perm: "purchases.view" },
    { id: "etiquetas", label: "Etiquetas", href: "/dashboard/etiquetas", icon: Tag, color: "text-pink-400", bg: "bg-pink-400/10", perm: "labels.view" },
    { id: "saidas", label: "Saídas", href: "/dashboard/saidas", icon: Package, color: "text-red-400", bg: "bg-red-400/10", perm: "inventory.view" },
    { id: "clientes", label: "Clientes", href: "/dashboard/clientes", icon: Building2, color: "text-sky-400", bg: "bg-sky-400/10", perm: "settings.view" },
    { id: "terceirizados", label: "Terceirizados", href: "/dashboard/terceirizados", icon: HardHat, color: "text-yellow-400", bg: "bg-yellow-400/10", perm: "settings.view" },
    { id: "colaboradores", label: "Colaboradores", href: "/dashboard/colaboradores", icon: Users, color: "text-emerald-400", bg: "bg-emerald-400/10", perm: "access.view" },
    { id: "permissoes", label: "Permissões", href: "/dashboard/permissoes", icon: Key, color: "text-rose-400", bg: "bg-rose-400/10", perm: "access.manage" },
    { id: "cadastros", label: "Cadastros", href: "/dashboard/cadastros", icon: Database, color: "text-orange-400", bg: "bg-orange-400/10", perm: "catalog.view" },
    { id: "acesso", label: "Acesso", href: "/dashboard/acesso", icon: ShieldCheck, color: "text-violet-400", bg: "bg-violet-400/10", perm: "access.view" },
];

const DEFAULT_SHORTCUTS = ["colaboradores", "chamados", "estoque", "patrimonio", "cadastros", "acesso"];
const STORAGE_KEY = "zyllen_dashboard_shortcuts";

function getStoredShortcuts(): string[] | null {
    if (typeof window === "undefined") return null;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch {}
    return null;
}

function storeShortcuts(ids: string[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export default function DashboardPage() {
    const { user, hasPermission } = useAuth();
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const router = useRouter();

    const [editing, setEditing] = useState(false);
    const [shortcutIds, setShortcutIds] = useState<string[]>(DEFAULT_SHORTCUTS);

    // Load stored shortcuts on mount
    useEffect(() => {
        const stored = getStoredShortcuts();
        if (stored) setShortcutIds(stored);
    }, []);

    // Internos role cannot access dashboard — redirect to chamados-ti
    useEffect(() => {
        if (user && user.type === "internal" && "role" in user && (user as any).role?.name === "Internos") {
            router.replace("/dashboard/chamados-ti");
        }
    }, [user, router]);

    const canViewTickets = hasPermission("tickets.view");
    const canViewMaintenance = hasPermission("maintenance.view");
    const canViewInventory = hasPermission("inventory.view");

    const userRole = user?.type === "internal" && "role" in user ? (user as any).role?.name : null;
    const isManagerOrAdmin = userRole === "Administrador" || userRole === "Gestor";

    /* ─── PIN dialog state (Assign) ─── */
    const [pinDialogOpen, setPinDialogOpen] = useState(false);
    const [pinValue, setPinValue] = useState("");
    const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
    const pinInputRef = useRef<HTMLInputElement>(null);

    /* ─── Close dialog state ─── */
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [closePin, setClosePin] = useState("");
    const [closingTicketId, setClosingTicketId] = useState<string | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState("");
    const closePinRef = useRef<HTMLInputElement>(null);

    /* ─── Reassign dialog state ─── */
    const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
    const [reassignPin, setReassignPin] = useState("");
    const [reassigningTicketId, setReassigningTicketId] = useState<string | null>(null);
    const [reassignToId, setReassignToId] = useState("");
    const reassignPinRef = useRef<HTMLInputElement>(null);

    /* ─── Queries ─── */
    const { data: openTickets, isLoading: loadingOpenTickets } = useQuery({
        queryKey: ["tickets", "open"],
        queryFn: () => apiClient.get<{ data: any[] }>("/tickets?status=OPEN", fetchOpts),
        enabled: canViewTickets,
        refetchInterval: 30_000,
    });

    const { data: inProgressTickets, isLoading: loadingInProgress } = useQuery({
        queryKey: ["tickets", "in_progress"],
        queryFn: () => apiClient.get<{ data: any[] }>("/tickets?status=IN_PROGRESS", fetchOpts),
        enabled: canViewTickets,
        refetchInterval: 15_000,
    });

    const { data: internalUsers } = useQuery({
        queryKey: ["internal-users"],
        queryFn: () => apiClient.get<{ data: any[] }>("/tickets/internal-users", fetchOpts),
        enabled: canViewTickets && isManagerOrAdmin,
    });

    const { data: allTickets } = useQuery({
        queryKey: ["tickets"],
        queryFn: () => apiClient.get<{ data: any[] }>("/tickets", fetchOpts),
        enabled: canViewTickets,
    });

    const { data: approvals } = useQuery({
        queryKey: ["approvals"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/approvals/pending", fetchOpts),
        enabled: canViewInventory,
    });

    const pendingApprovals = approvals?.data?.length ?? 0;

    /* ─── Assign with PIN mutation ─── */
    const assignMut = useMutation({
        mutationFn: ({ ticketId, pin }: { ticketId: string; pin: string }) =>
            apiClient.put(`/tickets/${ticketId}/assign-with-pin`, { pin }, fetchOpts),
        onSuccess: () => {
            toast.success("Chamado assumido com sucesso!");
            setPinDialogOpen(false);
            setPinValue("");
            setAssigningTicketId(null);
            qc.invalidateQueries({ queryKey: ["tickets"] });
        },
        onError: (e: any) => toast.error(e.message || "Erro ao assumir chamado"),
    });

    /* ─── Close with PIN mutation ─── */
    const closeMut = useMutation({
        mutationFn: ({ ticketId, pin, resolutionNotes }: { ticketId: string; pin: string; resolutionNotes: string }) =>
            apiClient.put(`/tickets/${ticketId}/close-with-pin`, { pin, resolutionNotes }, fetchOpts),
        onSuccess: () => {
            toast.success("Chamado finalizado com sucesso!");
            setCloseDialogOpen(false);
            setClosePin("");
            setClosingTicketId(null);
            setResolutionNotes("");
            qc.invalidateQueries({ queryKey: ["tickets"] });
        },
        onError: (e: any) => toast.error(e.message || "Erro ao finalizar chamado"),
    });

    /* ─── Reassign mutation ─── */
    const reassignMut = useMutation({
        mutationFn: ({ ticketId, pin, assignedToId }: { ticketId: string; pin: string; assignedToId: string }) =>
            apiClient.put(`/tickets/${ticketId}/reassign`, { pin, assignedToId }, fetchOpts),
        onSuccess: () => {
            toast.success("Chamado movido com sucesso!");
            setReassignDialogOpen(false);
            setReassignPin("");
            setReassigningTicketId(null);
            setReassignToId("");
            qc.invalidateQueries({ queryKey: ["tickets"] });
        },
        onError: (e: any) => toast.error(e.message || "Erro ao mover chamado"),
    });

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

    /* ─── Client attention monitor (last 7 days) ─── */
    const clientAttention = useMemo(() => {
        if (!allTickets?.data) return [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentTickets = allTickets.data.filter((t: any) => new Date(t.createdAt) >= sevenDaysAgo && t.company?.name);
        const grouped: Record<string, { name: string; count: number }> = {};

        for (const t of recentTickets) {
            const name = t.company.name;
            if (!grouped[name]) grouped[name] = { name, count: 0 };
            grouped[name].count++;
        }

        return Object.values(grouped).sort((a, b) => b.count - a.count);
    }, [allTickets?.data]);

    /* ─── Handlers ─── */
    const handleAssignClick = (ticketId: string) => {
        setAssigningTicketId(ticketId);
        setPinValue("");
        setPinDialogOpen(true);
        setTimeout(() => pinInputRef.current?.focus(), 100);
    };

    const handleAssignConfirm = () => {
        if (!assigningTicketId || pinValue.length !== 4) return;
        assignMut.mutate({ ticketId: assigningTicketId, pin: pinValue });
    };

    const handleCloseClick = (ticketId: string) => {
        setClosingTicketId(ticketId);
        setClosePin("");
        setResolutionNotes("");
        setCloseDialogOpen(true);
        setTimeout(() => closePinRef.current?.focus(), 100);
    };

    const handleCloseConfirm = () => {
        if (!closingTicketId || closePin.length !== 4 || !resolutionNotes.trim()) return;
        closeMut.mutate({ ticketId: closingTicketId, pin: closePin, resolutionNotes: resolutionNotes.trim() });
    };

    const handleReassignClick = (ticketId: string) => {
        setReassigningTicketId(ticketId);
        setReassignPin("");
        setReassignToId("");
        setReassignDialogOpen(true);
        setTimeout(() => reassignPinRef.current?.focus(), 100);
    };

    const handleReassignConfirm = () => {
        if (!reassigningTicketId || reassignPin.length !== 4 || !reassignToId) return;
        reassignMut.mutate({ ticketId: reassigningTicketId, pin: reassignPin, assignedToId: reassignToId });
    };

    /* ─── Filter in-progress tickets per role ─── */
    const visibleInProgress = useMemo(() => {
        if (!inProgressTickets?.data) return [];
        if (isManagerOrAdmin) return inProgressTickets.data;
        return inProgressTickets.data.filter((t: any) => t.assignedToInternalUserId === user?.id);
    }, [inProgressTickets?.data, isManagerOrAdmin, user?.id]);

    /* ─── Shortcut helpers ─── */
    const availableShortcuts = ALL_SHORTCUTS.filter((s) => !s.perm || hasPermission(s.perm));
    const activeShortcuts = shortcutIds
        .map((id) => availableShortcuts.find((s) => s.id === id))
        .filter(Boolean) as typeof ALL_SHORTCUTS;

    const inactiveShortcuts = availableShortcuts.filter((s) => !shortcutIds.includes(s.id));

    const addShortcut = useCallback((id: string) => {
        setShortcutIds((prev) => {
            const next = [...prev, id];
            storeShortcuts(next);
            return next;
        });
    }, []);

    const removeShortcut = useCallback((id: string) => {
        setShortcutIds((prev) => {
            const next = prev.filter((i) => i !== id);
            storeShortcuts(next);
            return next;
        });
    }, []);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">
                    {getGreeting()}, <span className="text-[var(--zyllen-highlight)]">{user?.name?.split(" ")[0]}</span>
                </h1>
                <p className="text-[var(--zyllen-muted)] mt-1">{DASHBOARD_SUBTITLE}</p>
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

            {/* Quick Access — Customizable */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-white">Acesso Rápido</h2>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={`h-8 gap-1.5 text-xs ${editing ? "text-[var(--zyllen-highlight)]" : "text-[var(--zyllen-muted)] hover:text-white"}`}
                        onClick={() => setEditing((e) => !e)}
                    >
                        <Pencil size={14} />
                        {editing ? "Concluir" : "Personalizar"}
                    </Button>
                </div>

                {/* Active shortcuts */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {activeShortcuts.map((item) => (
                        <div key={item.id} className="relative group">
                            {editing && (
                                <button
                                    onClick={() => removeShortcut(item.id)}
                                    className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center size-5 rounded-full bg-red-500 text-white hover:bg-red-400 transition-colors shadow-lg"
                                >
                                    <X size={12} />
                                </button>
                            )}
                            <Link
                                href={item.href}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--zyllen-bg)] border border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 transition-all group ${editing ? "pointer-events-none opacity-80" : ""}`}
                            >
                                <div className={`flex items-center justify-center size-10 rounded-lg ${item.bg} group-hover:scale-110 transition-transform`}>
                                    <item.icon size={20} className={item.color} />
                                </div>
                                <span className="text-xs font-medium text-[var(--zyllen-muted)] group-hover:text-white transition-colors">{item.label}</span>
                            </Link>
                        </div>
                    ))}

                    {/* Add button (shown when editing or when empty) */}
                    {editing && inactiveShortcuts.length > 0 && (
                        <button
                            onClick={() => {}}
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/40 transition-all text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"
                            disabled
                        >
                            <Plus size={20} />
                            <span className="text-xs font-medium">Adicionar</span>
                        </button>
                    )}
                </div>

                {/* Available shortcuts to add (shown only when editing) */}
                {editing && inactiveShortcuts.length > 0 && (
                    <div className="mt-4">
                        <p className="text-xs text-[var(--zyllen-muted)] mb-2">Atalhos disponíveis — clique para adicionar:</p>
                        <div className="flex flex-wrap gap-2">
                            {inactiveShortcuts.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => addShortcut(item.id)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--zyllen-bg)] border border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 transition-all group"
                                >
                                    <div className={`flex items-center justify-center size-6 rounded ${item.bg}`}>
                                        <item.icon size={14} className={item.color} />
                                    </div>
                                    <span className="text-xs font-medium text-[var(--zyllen-muted)] group-hover:text-white transition-colors">{item.label}</span>
                                    <Plus size={12} className="text-[var(--zyllen-highlight)]" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeShortcuts.length === 0 && !editing && (
                    <button
                        onClick={() => setEditing(true)}
                        className="w-full flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/40 transition-all text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"
                    >
                        <Plus size={24} />
                        <span className="text-sm font-medium">Adicionar atalhos ao acesso rápido</span>
                    </button>
                )}
            </div>

            {/* ═══════ Panels Grid ═══════ */}
            <div className={`grid grid-cols-1 ${isManagerOrAdmin ? "lg:grid-cols-2" : ""} gap-6`}>

                {/* ─── Panel 1: Chamados em Aberto ─── */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                            <Headset size={18} className="text-amber-400" />
                            Chamados em Aberto
                            {openTickets?.data?.length ? (
                                <Badge variant="warning">{openTickets.data.length}</Badge>
                            ) : null}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingOpenTickets ? (
                            <div className="space-y-2">
                                {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                            </div>
                        ) : openTickets?.data?.length ? (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                {openTickets.data.map((t: any) => (
                                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] hover:border-amber-500/30 transition-colors">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-white truncate font-medium">
                                                {t.source === "INTERNAL"
                                                    ? (t.internalUser?.name || "Colaborador")
                                                    : (t.externalUser?.name || "Cliente")}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-[var(--zyllen-muted)] truncate">
                                                    {t.source === "INTERNAL"
                                                        ? (t.internalUser?.sector || "Sem setor")
                                                        : (t.externalUser?.company?.name || t.company?.name || "Sem empresa")}
                                                </p>
                                                <Badge variant={t.priority === "HIGH" ? "destructive" : t.priority === "LOW" ? "success" : "warning"} className="text-[10px] px-1.5 py-0">
                                                    {t.priority === "HIGH" ? "Alta" : t.priority === "LOW" ? "Baixa" : "Média"}
                                                </Badge>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-[var(--zyllen-highlight)] hover:bg-[var(--zyllen-highlight)]/10 h-8 gap-1 text-xs shrink-0 ml-2"
                                            onClick={() => handleAssignClick(t.id)}
                                        >
                                            <UserCheck size={14} />
                                            Assumir
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <CheckCircle2 size={36} className="mx-auto text-emerald-400/30 mb-2" />
                                <p className="text-sm text-[var(--zyllen-muted)]">Nenhum chamado aguardando atendimento</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ─── Panel 2: Chamados em Atendimento ─── */}
                {canViewTickets && (
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white text-base flex items-center gap-2">
                                <Clock size={18} className="text-blue-400" />
                                Chamados em Atendimento
                                {visibleInProgress.length ? (
                                    <Badge variant="default">{visibleInProgress.length}</Badge>
                                ) : null}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingInProgress ? (
                                <div className="space-y-2">
                                    {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                                </div>
                            ) : visibleInProgress.length ? (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                    {visibleInProgress.map((t: any) => (
                                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-blue-500/20">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-white truncate font-medium">
                                                    {t.source === "INTERNAL"
                                                        ? (t.internalUser?.name || "Colaborador")
                                                        : (t.externalUser?.name || "Cliente")}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-xs text-[var(--zyllen-muted)] truncate">
                                                        {t.source === "INTERNAL"
                                                            ? (t.internalUser?.sector || "Sem setor")
                                                            : (t.externalUser?.company?.name || t.company?.name || "Sem empresa")}
                                                    </p>
                                                    <span className="text-[10px] text-blue-400">•</span>
                                                    <p className="text-xs text-blue-400 truncate">{t.assignedTo?.name || "—"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                {t.firstResponseAt ? (
                                                    <LiveTimer since={t.firstResponseAt} />
                                                ) : (
                                                    <span className="text-xs text-[var(--zyllen-muted)]">—</span>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleCloseClick(t.id)}
                                                    className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                                                    title="Finalizar"
                                                >
                                                    <Check size={14} />
                                                </Button>
                                                {isManagerOrAdmin && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleReassignClick(t.id)}
                                                        className="h-7 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                                                        title="Mover"
                                                    >
                                                        <ArrowRightLeft size={14} />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Clock size={36} className="mx-auto text-blue-400/30 mb-2" />
                                    <p className="text-sm text-[var(--zyllen-muted)]">Nenhum chamado em atendimento</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* ─── Panel 3: Monitor de Atenção — Clientes (últimos 7 dias) ─── */}
            {canViewTickets && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                            <Shield size={18} className="text-cyan-400" />
                            Monitor de Atenção — Clientes
                            <span className="text-xs text-[var(--zyllen-muted)] font-normal ml-auto">últimos 7 dias</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {clientAttention.length > 0 ? (
                            <div className="space-y-2">
                                {clientAttention.map((c) => {
                                    const level = getAttentionLevel(c.count);
                                    return (
                                        <div
                                            key={c.name}
                                            className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${level.border} ${level.bg} ${level.ring} ring-1`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm font-semibold ${level.color}`}>{c.name}</p>
                                                <p className="text-xs text-[var(--zyllen-muted)]">
                                                    {c.count} chamado{c.count !== 1 ? "s" : ""} nos últimos 7 dias
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                <Badge variant={level.badge}>{level.label}</Badge>
                                                <span className={`text-lg font-bold ${level.color}`}>{c.count}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Shield size={36} className="mx-auto text-cyan-400/30 mb-2" />
                                <p className="text-sm text-[var(--zyllen-muted)]">Nenhum chamado registrado nos últimos 7 dias</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ─── PIN Dialog (Assign) ─── */}
            <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
                <DialogContent onClose={() => setPinDialogOpen(false)} className="border-[var(--zyllen-border)]">
                    <DialogHeader>
                        <DialogTitle>Assumir Chamado</DialogTitle>
                        <DialogDescription>Digite seu PIN de 4 dígitos para confirmar</DialogDescription>
                    </DialogHeader>
                    <DialogBody>
                        <Input
                            ref={pinInputRef}
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="••••"
                            value={pinValue}
                            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            onKeyDown={(e) => { if (e.key === "Enter") handleAssignConfirm(); }}
                            className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                        />
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPinDialogOpen(false)} className="text-[var(--zyllen-muted)]">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleAssignConfirm}
                            disabled={pinValue.length !== 4 || assignMut.isPending}
                            className="bg-[var(--zyllen-highlight)] hover:bg-[var(--zyllen-highlight)]/90 text-black"
                        >
                            {assignMut.isPending ? "Assumindo..." : "Confirmar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Finalizar Dialog ─── */}
            <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
                <DialogContent onClose={() => setCloseDialogOpen(false)} className="border-[var(--zyllen-border)]">
                    <DialogHeader>
                        <DialogTitle>Finalizar Chamado</DialogTitle>
                        <DialogDescription>Descreva a resolução e confirme com seu PIN</DialogDescription>
                    </DialogHeader>
                    <DialogBody className="space-y-4">
                        <div>
                            <label className="text-sm text-[var(--zyllen-muted)] mb-1.5 block">Notas de resolução</label>
                            <Textarea
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                placeholder="Descreva o que foi feito para resolver o chamado..."
                                rows={3}
                                className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-[var(--zyllen-muted)] mb-1.5 block">PIN de confirmação</label>
                            <Input
                                ref={closePinRef}
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="••••"
                                value={closePin}
                                onChange={(e) => setClosePin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                onKeyDown={(e) => { if (e.key === "Enter") handleCloseConfirm(); }}
                                className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                            />
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCloseDialogOpen(false)} className="text-[var(--zyllen-muted)]">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCloseConfirm}
                            disabled={closePin.length !== 4 || !resolutionNotes.trim() || closeMut.isPending}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            {closeMut.isPending ? "Finalizando..." : "Finalizar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Mover (Reassign) Dialog ─── */}
            <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
                <DialogContent onClose={() => setReassignDialogOpen(false)} className="border-[var(--zyllen-border)]">
                    <DialogHeader>
                        <DialogTitle>Mover Chamado</DialogTitle>
                        <DialogDescription>Selecione o técnico destino e confirme com seu PIN</DialogDescription>
                    </DialogHeader>
                    <DialogBody className="space-y-4">
                        <div>
                            <label className="text-sm text-[var(--zyllen-muted)] mb-1.5 block">Técnico destino</label>
                            <Select
                                value={reassignToId}
                                onValueChange={setReassignToId}
                                placeholder="Selecione um técnico..."
                                className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                            >
                                {(internalUsers?.data ?? []).filter((u: any) => ['Administrador', 'Gestor', 'Técnico'].includes(u.role?.name)).map((u: any) => (
                                    <SelectOption key={u.id} value={u.id}>{u.name} — {u.role?.name}</SelectOption>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm text-[var(--zyllen-muted)] mb-1.5 block">PIN de confirmação</label>
                            <Input
                                ref={reassignPinRef}
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="••••"
                                value={reassignPin}
                                onChange={(e) => setReassignPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                onKeyDown={(e) => { if (e.key === "Enter") handleReassignConfirm(); }}
                                className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                            />
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setReassignDialogOpen(false)} className="text-[var(--zyllen-muted)]">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleReassignConfirm}
                            disabled={reassignPin.length !== 4 || !reassignToId || reassignMut.isPending}
                            className="bg-amber-600 hover:bg-amber-500 text-white"
                        >
                            {reassignMut.isPending ? "Movendo..." : "Mover"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
