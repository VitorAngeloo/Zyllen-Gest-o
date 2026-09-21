"use client";
import { useState, useMemo, useRef } from "react";
import { useAuth, useAuthedFetch } from "@web/features/auth/context/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Textarea } from "@web/components/ui/textarea";
import { Select, SelectOption } from "@web/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@web/components/ui/dialog";
import { PageHeader } from "@web/components/ui/page-header";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, XCircle, Shield } from "lucide-react";
import { TicketDashboardBoard } from "@web/features/tickets/components/ticket-dashboard-board";
import { ticketApi } from '@web/features/tickets/api/ticket-api';
import { PanelMirrorSettings } from "@web/features/panels/components/panel-mirror-settings";
import { DashboardOperationalOverview } from "../components/dashboard-operational-overview";
import InternalDashboardScreen from './internal-dashboard-screen';
import { getGreeting, DASHBOARD_SUBTITLE, TOASTS, DASHBOARD_OPERATIONAL_COPY as operationalCopy } from "@web/lib/brand-voice";

/* ─── Attention level helper ─── */
function getAttentionLevel(count: number) {
    if (count >= 6) return { label: "Alerta Máximo", color: "text-red-400", bg: "bg-red-500/10", border: "border-l-red-500", badge: "destructive" as const, ring: "ring-red-500/20" };
    if (count >= 4) return { label: "Atenção", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-l-amber-500", badge: "warning" as const, ring: "ring-amber-500/20" };
    return { label: "Normal", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-l-emerald-500", badge: "success" as const, ring: "ring-emerald-500/20" };
}

function FullDashboardPage() {
    const { user, hasPermission } = useAuth();
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const canViewTickets = hasPermission("tickets.view");
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
    const { data: internalUsers } = useQuery({
        queryKey: ["internal-users"],
        queryFn: () => apiClient.get<{ data: any[] }>("/tickets/internal-users", fetchOpts),
        enabled: canViewTickets && isManagerOrAdmin,
    });

    const clientAttentionQuery = useQuery({
        queryKey: ["tickets", 'client-attention', user?.id],
        queryFn: ({ signal }) => ticketApi.listForClientAttention({ ...fetchOpts, signal }),
        enabled: !!user && canViewTickets,
        refetchInterval: 30_000,
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
        mutationFn: ({ id, pin }: { id: string; pin: string }) => apiClient.post(`/inventory/approvals/${id}/approve`, { pin }, fetchOpts),
        onSuccess: () => { toast.success(TOASTS.approved); qc.invalidateQueries({ queryKey: ["approvals"] }); qc.invalidateQueries({ queryKey: ["balances"] }); },
        onError: (e: any) => toast.error(e.message),
    });

    const rejectMut = useMutation({
        mutationFn: ({ id, pin }: { id: string; pin: string }) => apiClient.post(`/inventory/approvals/${id}/reject`, { pin }, fetchOpts),
        onSuccess: () => { toast.success(TOASTS.rejected); qc.invalidateQueries({ queryKey: ["approvals"] }); },
        onError: (e: any) => toast.error(e.message),
    });

    const requestApprovalPin = () => {
        const pin = window.prompt("Digite seu PIN de 4 dígitos para aprovar/rejeitar:")?.trim() ?? "";
        if (!pin) return null;
        if (!/^\d{4}$/.test(pin)) {
            toast.error("PIN inválido. Informe 4 dígitos numéricos.");
            return null;
        }
        return pin;
    };

    /* ─── Client attention monitor (last 7 days) ─── */
    const clientAttention = useMemo(() => {
        if (!clientAttentionQuery.data) return [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentTickets = clientAttentionQuery.data.filter(t => new Date(t.createdAt) >= sevenDaysAgo && t.company?.name);
        const grouped = new Map<string, { id: string; name: string; count: number }>();

        for (const t of recentTickets) {
            const name = t.company!.name, id = t.company!.id ?? name;
            if (!grouped.has(id)) grouped.set(id, { id, name, count: 0 });
            grouped.get(id)!.count++;
        }

        return [...grouped.values()].sort((a, b) => b.count - a.count);
    }, [clientAttentionQuery.data]);

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

    return (
        <div className="space-y-8 pb-6">
            {/* Header */}
            <PageHeader
                eyebrow="Visão geral"
                title={<>{getGreeting()}, <span className="text-[var(--zyllen-highlight)]">{user?.name?.split(" ")[0]}</span></>}
                description={DASHBOARD_SUBTITLE}
                actions={<PanelMirrorSettings />}
            />

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
                                        <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300 hover:bg-green-400/10 h-8 w-8 p-0" onClick={() => {
                                            const pin = requestApprovalPin();
                                            if (!pin) return;
                                            approveMut.mutate({ id: req.id, pin });
                                        }} disabled={approveMut.isPending || rejectMut.isPending}>
                                            <CheckCircle2 size={18} />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8 p-0" onClick={() => {
                                            const pin = requestApprovalPin();
                                            if (!pin) return;
                                            rejectMut.mutate({ id: req.id, pin });
                                        }} disabled={approveMut.isPending || rejectMut.isPending}>
                                            <XCircle size={18} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className={`grid items-start gap-8 ${canViewTickets && (hasPermission('inventory.view') || hasPermission('schedule.view') || hasPermission('vehicles.view')) ? 'xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]' : ''}`}>
                {canViewTickets && <div className="min-w-0"><TicketDashboardBoard isManagerOrAdmin={isManagerOrAdmin} onAssign={handleAssignClick} onClose={handleCloseClick} onReassign={handleReassignClick} /></div>}
                <div className="min-w-0"><DashboardOperationalOverview /></div>
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
                        {clientAttentionQuery.isError && <div role="alert" className="mb-3 text-sm text-red-200"><p>{clientAttentionQuery.data ? operationalCopy.stale : operationalCopy.failed}</p><Button size="sm" variant="ghost" onClick={() => { void clientAttentionQuery.refetch(); }}>{operationalCopy.retry}</Button></div>}
                        {clientAttentionQuery.isLoading ? <p role="status" className="text-sm text-[var(--zyllen-muted)]">{operationalCopy.loading}</p> : clientAttention.length > 0 ? (
                            <div className="space-y-2">
                                {clientAttention.map((c) => {
                                    const level = getAttentionLevel(c.count);
                                    return (
                                        <div
                                            key={c.id}
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
                        ) : clientAttentionQuery.data && (
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

export default function DashboardPage() {
    const { user } = useAuth();
    const isInternos = user?.type === 'internal' && user.role?.name === 'Internos';
    return isInternos ? <InternalDashboardScreen /> : <FullDashboardPage />;
}
