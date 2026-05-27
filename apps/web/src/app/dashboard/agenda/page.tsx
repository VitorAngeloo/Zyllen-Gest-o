"use client";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch, useAuth } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Badge } from "@web/components/ui/badge";
import { Input } from "@web/components/ui/input";
import { toast } from "sonner";
import {
    CalendarDays, Users, Search, Save, CheckCircle2,
    Clock, MapPin, User, Building2, ChevronRight,
    ToggleLeft, ToggleRight,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Installer {
    id: string;
    name: string;
    email: string;
    sector: string | null;
    agendaColor: string | null;
    agendaActive: boolean | null;
}

interface ScheduleInstaller {
    id: string;
    name: string;
    agendaColor: string | null;
}

interface Schedule {
    id: string;
    title: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
    address: string | null;
    notes: string | null;
    companyName: string | null;
    projectName: string | null;
    createdByName: string | null;
    installers: ScheduleInstaller[];
}

type Tab = "agendamentos" | "instaladores";

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
    INSTALLATION: "Instalação",
    MAINTENANCE: "Manutenção",
    REMOVAL: "Desinstalação",
    SUPPORT: "Suporte",
    OTHER: "Outros",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    SCHEDULED: { label: "Agendado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    IN_PROGRESS: { label: "Em andamento", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    DONE: { label: "Concluído", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    CANCELLED: { label: "Cancelado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const DEFAULT_COLOR = "#3B82F6";

const inputCls =
    "bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 focus-visible:ring-[var(--zyllen-highlight)]/30 focus-visible:border-[var(--zyllen-highlight)]";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    try {
        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

function normalize(s: string) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// ── Sub-component: Installer Card ─────────────────────────────────────────────

interface InstallerCardProps {
    installer: Installer;
    canManage: boolean;
    onSave: (id: string, color: string, active: boolean) => void;
    isSaving: boolean;
}

function InstallerCard({ installer, canManage, onSave, isSaving }: InstallerCardProps) {
    const [color, setColor] = useState(installer.agendaColor ?? DEFAULT_COLOR);
    const [active, setActive] = useState(installer.agendaActive ?? false);
    const [dirty, setDirty] = useState(false);

    // Sync when server data changes (e.g. after save)
    useEffect(() => {
        setColor(installer.agendaColor ?? DEFAULT_COLOR);
        setActive(installer.agendaActive ?? false);
        setDirty(false);
    }, [installer.agendaColor, installer.agendaActive]);

    function handleColorChange(val: string) {
        setColor(val);
        setDirty(true);
    }

    function handleToggle() {
        if (!canManage) return;
        setActive((prev) => !prev);
        setDirty(true);
    }

    return (
        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] relative">
            {dirty && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[var(--zyllen-highlight)] animate-pulse" />
            )}
            <CardContent className="p-4 space-y-4">
                {/* Header row */}
                <div className="flex items-center gap-3">
                    {/* Color swatch */}
                    <div
                        className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-white/10"
                        style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0">
                        <p className="text-white font-medium truncate">{installer.name}</p>
                        <p className="text-[var(--zyllen-muted)] text-xs truncate">{installer.email}</p>
                        {installer.sector && (
                            <p className="text-[var(--zyllen-muted)] text-xs">{installer.sector}</p>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                    {/* Color picker */}
                    {canManage && (
                        <div className="flex items-center gap-2">
                            <label className="text-[var(--zyllen-muted)] text-xs whitespace-nowrap">Cor</label>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => handleColorChange(e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer border border-[var(--zyllen-border)] bg-transparent"
                                title="Cor na agenda"
                            />
                        </div>
                    )}

                    {/* Active toggle */}
                    <button
                        onClick={handleToggle}
                        disabled={!canManage}
                        className="flex items-center gap-1.5 ml-auto"
                        title={active ? "Visível na agenda" : "Oculto na agenda"}
                    >
                        {active ? (
                            <ToggleRight className="w-6 h-6 text-[var(--zyllen-highlight)]" />
                        ) : (
                            <ToggleLeft className="w-6 h-6 text-[var(--zyllen-muted)]" />
                        )}
                        <span className={`text-xs ${active ? "text-[var(--zyllen-highlight)]" : "text-[var(--zyllen-muted)]"}`}>
                            {active ? "Ativo" : "Oculto"}
                        </span>
                    </button>
                </div>

                {/* Save button */}
                {canManage && dirty && (
                    <Button
                        size="sm"
                        className="w-full bg-[var(--zyllen-highlight)] hover:bg-[var(--zyllen-highlight)]/80 text-white"
                        onClick={() => onSave(installer.id, color, active)}
                        disabled={isSaving}
                    >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        {isSaving ? "Salvando…" : "Salvar"}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AgendaPage() {
    const fetchOpts = useAuthedFetch();
    const { hasPermission } = useAuth();
    const qc = useQueryClient();

    const [tab, setTab] = useState<Tab>("agendamentos");
    const [search, setSearch] = useState("");
    const [savingId, setSavingId] = useState<string | null>(null);

    // Schedule filters
    const [filterStatus, setFilterStatus] = useState("");
    const [filterType, setFilterType] = useState("");

    const canManageInstallers = hasPermission("schedule.manage_installers");
    const canCreate = hasPermission("schedule.create");

    // ── Data fetching ────────────────────────────────────────────────────────

    const { data: installersRes, isLoading: loadingInstallers } = useQuery({
        queryKey: ["schedule-installers"],
        queryFn: () => apiClient.get<{ data: Installer[] }>("/schedule/installers", fetchOpts),
        enabled: tab === "instaladores",
    });

    const { data: schedulesRes, isLoading: loadingSchedules } = useQuery({
        queryKey: ["schedules", filterStatus, filterType],
        queryFn: () =>
            apiClient.get<{ data: Schedule[]; total: number }>(
                `/schedule?limit=100${filterStatus ? `&status=${filterStatus}` : ""}${filterType ? `&type=${filterType}` : ""}`,
                fetchOpts,
            ),
        enabled: tab === "agendamentos",
    });

    // ── Mutations ────────────────────────────────────────────────────────────

    const updateInstallerMut = useMutation({
        mutationFn: (vars: { id: string; agendaColor: string; agendaActive: boolean }) =>
            apiClient.put(`/schedule/installers/${vars.id}`, {
                agendaColor: vars.agendaColor,
                agendaActive: vars.agendaActive,
            }, fetchOpts),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["schedule-installers"] });
            toast.success("Configurações salvas");
            setSavingId(null);
        },
        onError: (err: any) => {
            toast.error(err?.message ?? "Erro ao salvar");
            setSavingId(null);
        },
    });

    const cancelScheduleMut = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/schedule/${id}`, fetchOpts),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["schedules"] });
            toast.success("Agendamento cancelado");
        },
        onError: (err: any) => toast.error(err?.message ?? "Erro ao cancelar"),
    });

    // ── Derived data ─────────────────────────────────────────────────────────

    const installers = installersRes?.data ?? [];
    const schedules = schedulesRes?.data ?? [];

    const filteredInstallers = search
        ? installers.filter((i) => normalize(i.name).includes(normalize(search)) || normalize(i.email).includes(normalize(search)))
        : installers;

    const filteredSchedules = search
        ? schedules.filter((s) =>
            normalize(s.title).includes(normalize(search)) ||
            (s.companyName && normalize(s.companyName).includes(normalize(search))) ||
            s.installers.some((i) => normalize(i.name).includes(normalize(search)))
        )
        : schedules;

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSaveInstaller = useCallback((id: string, color: string, active: boolean) => {
        setSavingId(id);
        updateInstallerMut.mutate({ id, agendaColor: color, agendaActive: active });
    }, [updateInstallerMut]);

    // ── Tabs ──────────────────────────────────────────────────────────────────

    const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
        { key: "agendamentos", label: "Agendamentos", icon: CalendarDays },
        { key: "instaladores", label: "Instaladores", icon: Users },
    ];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-[var(--zyllen-highlight)]" />
                        Agenda Operacional
                    </h1>
                    <p className="text-[var(--zyllen-muted)] text-sm mt-1">
                        Gerencie agendamentos e técnicos de campo
                    </p>
                </div>

                {tab === "agendamentos" && canCreate && (
                    <Button
                        className="bg-[var(--zyllen-highlight)] hover:bg-[var(--zyllen-highlight)]/80 text-white"
                        onClick={() => toast.info("Criação de agendamentos disponível em breve (Fase 3)")}
                    >
                        + Novo Agendamento
                    </Button>
                )}
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-[var(--zyllen-border)]">
                {tabs.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => { setTab(key); setSearch(""); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            tab === key
                                ? "border-[var(--zyllen-highlight)] text-[var(--zyllen-highlight)]"
                                : "border-transparent text-[var(--zyllen-muted)] hover:text-white"
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Search + filters */}
            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--zyllen-muted)]" />
                    <Input
                        className={`pl-9 ${inputCls}`}
                        placeholder={tab === "instaladores" ? "Buscar técnico…" : "Buscar agendamento…"}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {tab === "agendamentos" && (
                    <>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className={`rounded-md border px-3 py-2 text-sm ${inputCls}`}
                        >
                            <option value="">Todos os status</option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className={`rounded-md border px-3 py-2 text-sm ${inputCls}`}
                        >
                            <option value="">Todos os tipos</option>
                            {Object.entries(TYPE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </>
                )}
            </div>

            {/* ── AGENDAMENTOS TAB ── */}
            {tab === "agendamentos" && (
                <>
                    {loadingSchedules ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-32 rounded-lg bg-[var(--zyllen-bg-dark)] animate-pulse" />
                            ))}
                        </div>
                    ) : filteredSchedules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <CalendarDays className="w-12 h-12 text-[var(--zyllen-muted)] mb-3 opacity-40" />
                            <p className="text-[var(--zyllen-muted)] text-sm">
                                {search || filterStatus || filterType
                                    ? "Nenhum agendamento encontrado com os filtros aplicados"
                                    : "Nenhum agendamento cadastrado ainda"}
                            </p>
                            {!search && !filterStatus && !filterType && canCreate && (
                                <p className="text-[var(--zyllen-muted)]/60 text-xs mt-1">
                                    Clique em &quot;+ Novo Agendamento&quot; para começar
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredSchedules.map((schedule) => {
                                const statusCfg = STATUS_CONFIG[schedule.status] ?? { label: schedule.status, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
                                return (
                                    <Card
                                        key={schedule.id}
                                        className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/40 transition-colors"
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                                {/* Left: title + meta */}
                                                <div className="space-y-2 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-white font-medium">{schedule.title}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                                                            {statusCfg.label}
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--zyllen-bg-dark)] text-[var(--zyllen-muted)] border border-[var(--zyllen-border)]">
                                                            {TYPE_LABELS[schedule.type] ?? schedule.type}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--zyllen-muted)]">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatDate(schedule.startDate)} → {formatDate(schedule.endDate)}
                                                        </span>
                                                        {schedule.address && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" />
                                                                {schedule.address}
                                                            </span>
                                                        )}
                                                        {schedule.companyName && (
                                                            <span className="flex items-center gap-1">
                                                                <Building2 className="w-3 h-3" />
                                                                {schedule.companyName}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Installers */}
                                                    {schedule.installers.length > 0 && (
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <User className="w-3 h-3 text-[var(--zyllen-muted)]" />
                                                            {schedule.installers.map((inst) => (
                                                                <span
                                                                    key={inst.id}
                                                                    className="flex items-center gap-1 text-xs text-[var(--zyllen-muted)]"
                                                                >
                                                                    <span
                                                                        className="w-2 h-2 rounded-full inline-block"
                                                                        style={{ backgroundColor: inst.agendaColor ?? DEFAULT_COLOR }}
                                                                    />
                                                                    {inst.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: actions */}
                                                {schedule.status !== "CANCELLED" && schedule.status !== "DONE" && hasPermission("schedule.delete") && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                                                        onClick={() => {
                                                            if (confirm(`Cancelar "${schedule.title}"?`)) {
                                                                cancelScheduleMut.mutate(schedule.id);
                                                            }
                                                        }}
                                                        disabled={cancelScheduleMut.isPending}
                                                    >
                                                        Cancelar
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── INSTALADORES TAB ── */}
            {tab === "instaladores" && (
                <>
                    {canManageInstallers && (
                        <div className="rounded-lg border border-[var(--zyllen-highlight)]/20 bg-[var(--zyllen-highlight)]/5 px-4 py-3 text-sm text-[var(--zyllen-muted)]">
                            Ative os técnicos que devem aparecer na agenda e configure suas cores de identificação.
                        </div>
                    )}

                    {loadingInstallers ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-36 rounded-lg bg-[var(--zyllen-bg-dark)] animate-pulse" />
                            ))}
                        </div>
                    ) : filteredInstallers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Users className="w-12 h-12 text-[var(--zyllen-muted)] mb-3 opacity-40" />
                            <p className="text-[var(--zyllen-muted)] text-sm">
                                {search ? "Nenhum técnico encontrado" : "Nenhum colaborador cadastrado"}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 text-xs text-[var(--zyllen-muted)]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--zyllen-highlight)]" />
                                {installers.filter((i) => i.agendaActive).length} de {installers.length} técnicos ativos na agenda
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredInstallers.map((installer) => (
                                    <InstallerCard
                                        key={installer.id}
                                        installer={installer}
                                        canManage={canManageInstallers}
                                        onSave={handleSaveInstaller}
                                        isSaving={savingId === installer.id && updateInstallerMut.isPending}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
