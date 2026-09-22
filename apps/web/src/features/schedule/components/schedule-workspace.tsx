"use client";
import { scheduleApi } from "@web/features/schedule/api/schedule-api";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuthedFetch, useAuth } from "@web/features/auth/context/auth-context";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Select, SelectOption } from "@web/components/ui/select";
import { EmptyState, ListSectionHeader, WorkspaceBar, WorkspaceGroup } from "@web/components/ui/workspace";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@web/components/ui/dialog";
import { toast } from "sonner";
import { CalendarDays, Users, Search, CheckCircle2, Clock, MapPin, User, Building2, Pencil, Repeat } from "lucide-react";
import { ScheduleFormDialog } from "./schedule-form-dialog";
import type { Installer } from "../types/schedule.types";
import type { Schedule } from "../types/schedule.types";
import type { Tab } from "../types/schedule.types";
import { TYPE_LABELS } from "../schedule.constants";
import { STATUS_CONFIG } from "../schedule.constants";
import { DEFAULT_COLOR } from "../schedule.constants";
import { inputCls } from "../schedule.constants";
import { formatDate } from "../utils/schedule-format";
import { normalize } from "../utils/schedule-format";
import { InstallerCard } from "./installer-card";
import { TripDialog } from '@web/features/trips/components/trip-dialog';
import { TRIP_COPY as tripCopy, PROJECTS_AGENDA_COPY as copy, PROJECT_SERVICE_COPY as projectCopy } from '@web/lib/brand-voice';
import { ProjectServiceDialog } from '@web/features/project-services/components/project-service-dialog';

const AgendaCalendar = dynamic(() => import("./schedule-calendar"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-96 rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]">
            <div className="text-[var(--zyllen-muted)] text-sm animate-pulse">Carregando calendário…</div>
        </div>
    ),
});

interface Props { section: 'agenda' | 'equipe'; view: Exclude<Tab, 'instaladores'>; onViewChange: (view: Exclude<Tab, 'instaladores'>) => void }

export function ScheduleWorkspace({ section, view, onViewChange }: Props) {
    const fetchOpts = useAuthedFetch();
    const { user, hasPermission } = useAuth();
    const canView = !!user && hasPermission('schedule.view');
    const qc = useQueryClient();

    const tab: Tab = section === 'equipe' ? 'instaladores' : view;
    const [search, setSearch] = useState("");
    const [savingId, setSavingId] = useState<string | null>(null);

    // Form dialog state
    const [formOpen, setFormOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [initialDates, setInitialDates] = useState<{ start: string; end: string } | null>(null);
    const [tripDialog, setTripDialog] = useState<{ id?: string } | null>(null);
    const [projectDialog, setProjectDialog] = useState<{ id?: string } | null>(null);
    const invalidateOperational = async () => { await Promise.all(['schedules', 'project-services', 'trips', 'trip-options', 'operations-statistics'].map(key => qc.invalidateQueries({ queryKey: [key] }))); };

    // Schedule filters
    const [filterStatus, setFilterStatus] = useState("");
    const [filterType, setFilterType] = useState("");

    // Cancel series dialog
    const [cancelTarget, setCancelTarget] = useState<Schedule | null>(null);

    // Status change dialog
    const [statusTarget, setStatusTarget] = useState<Schedule | null>(null);

    const canManageInstallers = hasPermission("schedule.manage_installers");
    const canCreate = hasPermission("schedule.create");
    const canUpdate = hasPermission("schedule.update");

    // ── Data fetching ────────────────────────────────────────────────────────

    const { data: installersRes, isLoading: loadingInstallers, isError: installerError, refetch: refetchInstallers } = useQuery({
        queryKey: ["schedule-installers"],
        queryFn: () => scheduleApi.listInstallers<{ data: Installer[] }>(fetchOpts),
        enabled: canView && tab === "instaladores",
    });

    const { data: schedulesRes, isLoading: loadingSchedules, isError: scheduleError, refetch: refetchSchedules } = useQuery({
        queryKey: ["schedules", tab === 'calendario' ? 'calendar' : 'list', filterStatus, filterType],
        queryFn: ({ signal }) => scheduleApi.listAllSchedules(filterStatus ? `&status=${filterStatus}` : '', filterType ? `&type=${filterType}` : '', { ...fetchOpts, signal }),
        enabled: canView && section === 'agenda',
        refetchInterval: 30_000,
    });

    // ── Mutations ────────────────────────────────────────────────────────────

    const updateInstallerMut = useMutation({
        mutationFn: (vars: { id: string; agendaColor: string; agendaActive: boolean }) =>
            scheduleApi.updateInstaller(vars.id, {
                agendaColor: vars.agendaColor,
                agendaActive: vars.agendaActive,
            }, fetchOpts),
        onSuccess: async () => {
            await Promise.all(['schedule-installers', 'project-service-options', 'trip-options', 'schedules', 'project-services']
                .map(key => qc.invalidateQueries({ queryKey: [key] })));
            toast.success("Configurações salvas");
            setSavingId(null);
        },
        onError: (err: any) => {
            toast.error(err?.message ?? "Erro ao salvar");
            setSavingId(null);
        },
    });

    const cancelScheduleMut = useMutation({
        mutationFn: ({ id, cancelSeries }: { id: string; cancelSeries: boolean }) =>
            scheduleApi.cancelSchedule(id, cancelSeries ? "?cancelSeries=true" : "", fetchOpts),
        onSuccess: (_, vars) => {
            void invalidateOperational();
            toast.success(vars.cancelSeries ? "Série cancelada" : "Agendamento cancelado");
        },
        onError: (err: any) => toast.error(err?.message ?? "Erro ao cancelar"),
    });

    const updateStatusMut = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            scheduleApi.updateSchedule(id, { status }, fetchOpts),
        onSuccess: () => {
            void invalidateOperational();
            toast.success("Status atualizado");
            setStatusTarget(null);
        },
        onError: (err: any) => toast.error(err?.message ?? "Erro ao atualizar status"),
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

    const openCreate = useCallback((dates?: { start: string; end: string }) => {
        setEditingSchedule(null);
        setInitialDates(dates ?? null);
        setFormOpen(true);
    }, []);

    const openEdit = useCallback((schedule: Schedule) => {
        if (schedule.trip) { setTripDialog({ id: schedule.trip.id }); return; }
        if (schedule.projectService) { setProjectDialog({ id: schedule.projectService.id }); return; }
        setEditingSchedule(schedule);
        setInitialDates(null);
        setFormOpen(true);
    }, []);

    return (
        <div className="space-y-5">
            <ListSectionHeader
                title={section === 'equipe' ? copy.sections.equipe : copy.agendaTitle}
                count={section === 'equipe' ? filteredInstallers.length : filteredSchedules.length}
                description={section === 'equipe' ? copy.teamDescription : copy.calendarDescription}
                actions={section === 'agenda' && canCreate ? <>
                    <Button onClick={() => setProjectDialog({})}>{projectCopy.create}</Button>
                    <Button variant="outline" onClick={() => openCreate()}>{copy.newSchedule}</Button>
                </> : undefined}
            />
            {section === 'agenda' && <div className="flex gap-5 border-b border-white/10" role="group" aria-label={copy.sections.agenda}>
                <button type="button" aria-pressed={tab === 'calendario'} className={`-mb-px border-b-2 py-2 text-sm font-medium transition-colors ${tab === 'calendario' ? 'border-[var(--zyllen-highlight)] text-white' : 'border-transparent text-[var(--zyllen-muted)] hover:text-white'}`} onClick={() => onViewChange('calendario')}>{copy.calendar}</button>
                <button type="button" aria-pressed={tab === 'agendamentos'} className={`-mb-px border-b-2 py-2 text-sm font-medium transition-colors ${tab === 'agendamentos' ? 'border-[var(--zyllen-highlight)] text-white' : 'border-transparent text-[var(--zyllen-muted)] hover:text-white'}`} onClick={() => onViewChange('agendamentos')}>{copy.list}</button>
            </div>}
            {(scheduleError && section === 'agenda' || installerError && section === 'equipe') && <div role="alert" className="border-l-2 border-red-400 bg-red-500/5 px-4 py-3 text-sm text-red-200">
                <p>{section === 'equipe' ? copy.teamError : tripCopy.calendarError}</p><Button variant="ghost" onClick={() => { void (section === 'equipe' ? refetchInstallers() : refetchSchedules()); }}>{tripCopy.retry}</Button>
            </div>}

            {/* Search and filters apply to both agenda views. */}
            <WorkspaceBar className="sm:block">
                <WorkspaceGroup label={section === 'equipe' ? 'Localizar integrante' : 'Filtrar agenda'}>
                    <div className={`grid gap-3 ${section === 'agenda' ? 'sm:grid-cols-3' : ''}`}>
                <div className="relative min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--zyllen-muted)]" />
                    <Input
                        className={`pl-9 ${inputCls}`}
                        placeholder={tab === "instaladores" ? copy.searchInstaller : copy.searchSchedule}
                        aria-label={tab === "instaladores" ? copy.searchInstaller : copy.searchSchedule}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {section === "agenda" && (
                    <>
                        <Select
                            aria-label={copy.statusFilter}
                            value={filterStatus}
                            onValueChange={setFilterStatus}
                        >
                            <SelectOption value="">Todos os status</SelectOption>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <SelectOption key={k} value={k}>{v.label}</SelectOption>
                            ))}
                        </Select>
                        <Select
                            aria-label={copy.typeFilter}
                            value={filterType}
                            onValueChange={setFilterType}
                        >
                            <SelectOption value="">Todos os tipos</SelectOption>
                            {Object.entries(TYPE_LABELS).map(([k, v]) => (
                                <SelectOption key={k} value={k}>{v}</SelectOption>
                            ))}
                        </Select>
                    </>
                )}
                    </div>
                </WorkspaceGroup>
            </WorkspaceBar>

            {/* ── AGENDAMENTOS TAB ── */}
            {tab === "agendamentos" && (
                <>
                    {loadingSchedules ? (
                        <div className="divide-y divide-white/10 border-y border-white/10">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-28 animate-pulse bg-white/[0.015]" />
                            ))}
                        </div>
                    ) : filteredSchedules.length === 0 ? (
                        <EmptyState
                            icon={<CalendarDays size={28} />}
                            title={search || filterStatus || filterType ? "Nenhum agendamento corresponde aos filtros" : "Nenhum agendamento cadastrado"}
                            description={!search && !filterStatus && !filterType && canCreate ? "Crie um agendamento para começar a organizar a operação." : "Revise os filtros para consultar outros compromissos."}
                            action={!search && !filterStatus && !filterType && canCreate ? <Button variant="outline" size="sm" onClick={() => openCreate()}>{copy.newSchedule}</Button> : undefined}
                        />
                    ) : (
                        <div className="divide-y divide-white/10 border-y border-white/10">
                            {filteredSchedules.map((schedule) => {
                                const statusCfg = STATUS_CONFIG[schedule.status] ?? { label: schedule.status, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
                                return (
                                    <div key={schedule.id} className="px-4 py-4 transition-colors hover:bg-white/[0.025]">
                                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                                {/* Left: title + meta */}
                                                <div className="space-y-2 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-white font-medium">{schedule.title}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                                                            {statusCfg.label}
                                                        </span>
                                                        <span className="border-l border-white/15 pl-2 text-xs text-[var(--zyllen-muted)]">
                                                            {schedule.trip ? tripCopy.calendarLabel : TYPE_LABELS[schedule.type] ?? schedule.type}
                                                        </span>
                                                        {schedule.parentScheduleId && (
                                                            <span className="flex items-center gap-1 text-xs text-[var(--zyllen-muted)]" title="Agendamento recorrente">
                                                                <Repeat className="w-3 h-3" />
                                                            </span>
                                                        )}
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
                                                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                                    {schedule.trip && <Button size="sm" variant="outline" onClick={() => openEdit(schedule)}>{tripCopy.view}</Button>}
                                                    {schedule.projectService && <Button size="sm" variant="outline" onClick={() => openEdit(schedule)}>{canUpdate ? projectCopy.edit : projectCopy.details}</Button>}
                                                    {!schedule.trip && canUpdate && schedule.status !== "CANCELLED" && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-[var(--zyllen-muted)] hover:text-white hover:bg-[var(--zyllen-bg-dark)]"
                                                            onClick={() => setStatusTarget(schedule)}
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                            Status
                                                        </Button>
                                                    )}
                                                    {!schedule.trip && !schedule.projectService && canUpdate && schedule.status !== "CANCELLED" && schedule.status !== "DONE" && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-[var(--zyllen-muted)] hover:text-white hover:bg-[var(--zyllen-bg-dark)]"
                                                            onClick={() => openEdit(schedule)}
                                                        >
                                                            <Pencil className="w-3.5 h-3.5 mr-1" />
                                                            Editar
                                                        </Button>
                                                    )}
                                                    {!schedule.trip && schedule.status !== "CANCELLED" && schedule.status !== "DONE" && hasPermission("schedule.delete") && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                            onClick={() => {
                                                                if (schedule.parentScheduleId) {
                                                                    setCancelTarget(schedule);
                                                                } else if (confirm(`Cancelar "${schedule.title}"?`)) {
                                                                    cancelScheduleMut.mutate({ id: schedule.id, cancelSeries: false });
                                                                }
                                                            }}
                                                            disabled={cancelScheduleMut.isPending}
                                                        >
                                                            Cancelar
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── CALENDÁRIO TAB ── */}
            {tab === "calendario" && (
                <>
                    <AgendaCalendar
                        schedules={filteredSchedules}
                        canEdit={canUpdate}
                        canCreate={canCreate}
                        onEventClick={(s) => openEdit(s as unknown as Schedule)}
                        onDateSelect={(start, end) => openCreate({ start, end })}
                        fetchOpts={fetchOpts}
                        onScheduleUpdated={() => { void invalidateOperational(); }}
                    />
                </>
            )}

            {/* ── FORM DIALOG ── */}
            <ScheduleFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                editingSchedule={editingSchedule}
                initialDates={initialDates}
                fetchOpts={fetchOpts}
                onSuccess={invalidateOperational}
            />
            {tripDialog && <TripDialog id={tripDialog.id} onClose={() => setTripDialog(null)} />}
            {projectDialog && <ProjectServiceDialog id={projectDialog.id} onClose={() => setProjectDialog(null)} />}

            {/* ── CANCEL SERIES DIALOG ── */}
            <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Repeat className="w-4 h-4 text-red-400" />
                            Cancelar agendamento recorrente
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <p className="text-sm text-[var(--zyllen-muted)]">
                            <span className="text-white font-medium">&quot;{cancelTarget?.title}&quot;</span>{" "}
                            faz parte de uma série recorrente. O que deseja cancelar?
                        </p>
                    </DialogBody>
                    <DialogFooter className="flex-col gap-2 sm:flex-col">
                        <Button
                            className="w-full bg-[var(--zyllen-bg-dark)] border border-red-500/40 text-red-400 hover:bg-red-500/10"
                            onClick={() => {
                                if (cancelTarget) cancelScheduleMut.mutate({ id: cancelTarget.id, cancelSeries: false });
                                setCancelTarget(null);
                            }}
                            disabled={cancelScheduleMut.isPending}
                        >
                            Só este agendamento
                        </Button>
                        <Button
                            className="w-full bg-red-600 hover:bg-red-500 text-white"
                            onClick={() => {
                                if (cancelTarget) cancelScheduleMut.mutate({ id: cancelTarget.id, cancelSeries: true });
                                setCancelTarget(null);
                            }}
                            disabled={cancelScheduleMut.isPending}
                        >
                            Cancelar toda a série
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── STATUS CHANGE DIALOG ── */}
            <Dialog open={!!statusTarget} onOpenChange={(open) => { if (!open) setStatusTarget(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[var(--zyllen-highlight)]" />
                            Alterar status
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <p className="text-sm text-[var(--zyllen-muted)] mb-4">
                            <span className="text-white font-medium">&quot;{statusTarget?.title}&quot;</span>
                        </p>
                        <div className="flex flex-col gap-2">
                            {(["SCHEDULED", "IN_PROGRESS", "DONE"] as const).map((s) => {
                                const cfg = STATUS_CONFIG[s];
                                const isCurrent = statusTarget?.status === s;
                                return (
                                    <button
                                        key={s}
                                        disabled={isCurrent || updateStatusMut.isPending}
                                        onClick={() => statusTarget && updateStatusMut.mutate({ id: statusTarget.id, status: s })}
                                        className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm transition-colors
                                            ${isCurrent
                                                ? `${cfg.color} cursor-default opacity-80`
                                                : "border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:border-[var(--zyllen-highlight)]/50 hover:text-white bg-[var(--zyllen-bg-dark)]"
                                            }`}
                                    >
                                        <span>{cfg.label}</span>
                                        {isCurrent && <span className="text-xs opacity-70">atual</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            className="w-full text-[var(--zyllen-muted)]"
                            onClick={() => setStatusTarget(null)}
                            disabled={updateStatusMut.isPending}
                        >
                            Cancelar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                    ) : installerError ? null : filteredInstallers.length === 0 ? (
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
