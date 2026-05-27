"use client";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
} from "@web/components/ui/dialog";
import { Input } from "@web/components/ui/input";
import { Textarea } from "@web/components/ui/textarea";
import { Button } from "@web/components/ui/button";
import { Label } from "@web/components/ui/label";
import { toast } from "sonner";
import {
    AlertTriangle, CheckCircle2, Loader2,
    CalendarDays, User, Building2, Clock,
} from "lucide-react";
const SCHEDULE_TYPES = ["INSTALLATION", "MAINTENANCE", "REMOVAL", "SUPPORT", "OTHER"] as const;
type ScheduleType = (typeof SCHEDULE_TYPES)[number];
const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
    INSTALLATION: "Instalação",
    MAINTENANCE: "Manutenção",
    REMOVAL: "Desinstalação",
    SUPPORT: "Suporte",
    OTHER: "Outros",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface Installer {
    id: string;
    name: string;
    sector: string | null;
    agendaColor: string | null;
    agendaActive: boolean | null;
}

interface Company {
    id: string;
    name: string;
}

interface Project {
    id: string;
    name: string;
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
    companyId: string | null;
    projectId: string | null;
    installers: ScheduleInstaller[];
}

interface ConflictRow {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    installerId: string;
    installerName: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDatetimeLocal(iso: string): string {
    try {
        const d = new Date(iso);
        // Offset for local timezone so datetime-local shows correct local time
        const off = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - off).toISOString().slice(0, 16);
    } catch {
        return "";
    }
}

function formatDatetime(iso: string) {
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

const DEFAULT_COLOR = "#3B82F6";

const inputCls =
    "bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 focus-visible:ring-[var(--zyllen-highlight)]/30 focus-visible:border-[var(--zyllen-highlight)]";

const selectCls = `w-full rounded-md border px-3 py-2 text-sm ${inputCls}`;

// ── Component ────────────────────────────────────────────────────────────────

interface ScheduleFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingSchedule?: Schedule | null;
    fetchOpts: Record<string, any>;
    onSuccess: () => void;
}

const EMPTY_FORM = {
    title: "",
    type: "INSTALLATION" as string,
    startDate: "",
    endDate: "",
    address: "",
    notes: "",
    companyId: "",
    projectId: "",
    installerIds: [] as string[],
};

type DialogStep = "form" | "conflicts";

export function ScheduleFormDialog({
    open,
    onOpenChange,
    editingSchedule,
    fetchOpts,
    onSuccess,
}: ScheduleFormDialogProps) {
    const qc = useQueryClient();
    const [form, setForm] = useState(EMPTY_FORM);
    const [step, setStep] = useState<DialogStep>("form");
    const [pendingConflicts, setPendingConflicts] = useState<ConflictRow[]>([]);
    const [isChecking, setIsChecking] = useState(false);

    const isEditing = !!editingSchedule;

    // Populate form when editing
    useEffect(() => {
        if (!open) {
            setForm(EMPTY_FORM);
            setStep("form");
            setPendingConflicts([]);
            return;
        }
        if (editingSchedule) {
            setForm({
                title: editingSchedule.title,
                type: editingSchedule.type,
                startDate: toDatetimeLocal(editingSchedule.startDate),
                endDate: toDatetimeLocal(editingSchedule.endDate),
                address: editingSchedule.address ?? "",
                notes: editingSchedule.notes ?? "",
                companyId: editingSchedule.companyId ?? "",
                projectId: editingSchedule.projectId ?? "",
                installerIds: editingSchedule.installers.map((i) => i.id),
            });
        }
    }, [open, editingSchedule]);

    // ── Data fetching ────────────────────────────────────────────────────────

    const { data: installersRes, isLoading: loadingInstallers } = useQuery({
        queryKey: ["schedule-installers-all"],
        queryFn: () => apiClient.get<{ data: Installer[] }>("/schedule/installers", fetchOpts),
        enabled: open,
    });

    const { data: companiesRes } = useQuery({
        queryKey: ["companies-list"],
        queryFn: () => apiClient.get<{ data: Company[] }>("/clients/companies", fetchOpts),
        enabled: open,
    });

    const { data: projectsRes } = useQuery({
        queryKey: ["projects-for-company", form.companyId],
        queryFn: () =>
            apiClient.get<{ data: Project[] }>(
                `/clients/companies/${form.companyId}/projects`,
                fetchOpts,
            ),
        enabled: open && !!form.companyId,
    });

    const installers = installersRes?.data ?? [];
    const companies = companiesRes?.data ?? [];
    const projects = projectsRes?.data ?? [];

    // ── Mutations ────────────────────────────────────────────────────────────

    const createMut = useMutation({
        mutationFn: (data: typeof form) =>
            apiClient.post("/schedule", {
                ...data,
                startDate: new Date(data.startDate).toISOString(),
                endDate: new Date(data.endDate).toISOString(),
                companyId: data.companyId || undefined,
                projectId: data.projectId || undefined,
                address: data.address || undefined,
                notes: data.notes || undefined,
            }, fetchOpts),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["schedules"] });
            toast.success("Agendamento criado com sucesso");
            onSuccess();
            onOpenChange(false);
        },
        onError: (err: any) => toast.error(err?.message ?? "Erro ao criar agendamento"),
    });

    const updateMut = useMutation({
        mutationFn: (data: typeof form) =>
            apiClient.put(`/schedule/${editingSchedule!.id}`, {
                ...data,
                startDate: new Date(data.startDate).toISOString(),
                endDate: new Date(data.endDate).toISOString(),
                companyId: data.companyId || null,
                projectId: data.projectId || null,
                address: data.address || null,
                notes: data.notes || null,
            }, fetchOpts),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["schedules"] });
            toast.success("Agendamento atualizado com sucesso");
            onSuccess();
            onOpenChange(false);
        },
        onError: (err: any) => toast.error(err?.message ?? "Erro ao atualizar agendamento"),
    });

    const isSaving = createMut.isPending || updateMut.isPending;

    // ── Handlers ─────────────────────────────────────────────────────────────

    function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (key === "companyId") setForm((prev) => ({ ...prev, companyId: value as string, projectId: "" }));
    }

    function toggleInstaller(id: string) {
        setForm((prev) => ({
            ...prev,
            installerIds: prev.installerIds.includes(id)
                ? prev.installerIds.filter((x) => x !== id)
                : [...prev.installerIds, id],
        }));
    }

    function validate(): string | null {
        if (!form.title.trim()) return "Título é obrigatório";
        if (!form.startDate) return "Data de início é obrigatória";
        if (!form.endDate) return "Data de término é obrigatória";
        if (new Date(form.startDate) >= new Date(form.endDate)) return "Data de término deve ser após a de início";
        if (form.installerIds.length === 0) return "Selecione pelo menos 1 técnico";
        return null;
    }

    const handleSubmit = useCallback(async () => {
        const err = validate();
        if (err) { toast.error(err); return; }

        setIsChecking(true);
        try {
            const params = new URLSearchParams({
                installerIds: form.installerIds.join(","),
                startDate: new Date(form.startDate).toISOString(),
                endDate: new Date(form.endDate).toISOString(),
            });
            if (editingSchedule?.id) params.set("excludeId", editingSchedule.id);

            const res = await apiClient.get<{ data: ConflictRow[] }>(
                `/schedule/conflicts?${params}`,
                fetchOpts,
            );

            if (res.data.length > 0) {
                setPendingConflicts(res.data);
                setStep("conflicts");
                return;
            }
        } catch {
            // If conflict check fails, proceed anyway
        } finally {
            setIsChecking(false);
        }

        save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form, editingSchedule, fetchOpts]);

    function save() {
        if (isEditing) {
            updateMut.mutate(form);
        } else {
            createMut.mutate(form);
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-[var(--zyllen-highlight)]" />
                        {isEditing ? "Editar Agendamento" : "Novo Agendamento"}
                    </DialogTitle>
                </DialogHeader>

                {/* ── CONFLICT STEP ── */}
                {step === "conflicts" && (
                    <>
                        <DialogBody className="space-y-4">
                            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-yellow-300 font-medium text-sm">Conflito de agenda detectado</p>
                                    <p className="text-yellow-300/70 text-xs mt-0.5">
                                        Um ou mais técnicos já possuem agendamentos neste horário.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-56 overflow-y-auto">
                                {pendingConflicts.map((c, i) => (
                                    <div
                                        key={i}
                                        className="rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-3 text-sm"
                                    >
                                        <div className="flex items-center gap-2 text-white font-medium">
                                            <User className="w-3.5 h-3.5 text-[var(--zyllen-muted)]" />
                                            {c.installerName}
                                        </div>
                                        <div className="text-[var(--zyllen-muted)] text-xs mt-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDatetime(c.startDate)} → {formatDatetime(c.endDate)}
                                            <span className="mx-1">·</span>
                                            {c.title}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="text-[var(--zyllen-muted)] text-sm">
                                Deseja salvar mesmo assim ou voltar e ajustar?
                            </p>
                        </DialogBody>
                        <DialogFooter>
                            <Button
                                variant="ghost"
                                className="text-[var(--zyllen-muted)]"
                                onClick={() => setStep("form")}
                                disabled={isSaving}
                            >
                                Voltar e ajustar
                            </Button>
                            <Button
                                className="bg-yellow-600 hover:bg-yellow-500 text-white"
                                onClick={save}
                                disabled={isSaving}
                            >
                                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Salvar mesmo assim
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {/* ── FORM STEP ── */}
                {step === "form" && (
                    <>
                        <DialogBody className="space-y-5">
                            {/* Title + Type */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2 space-y-1.5">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Título *</Label>
                                    <Input
                                        className={inputCls}
                                        placeholder="Ex: Instalação sala interativa"
                                        value={form.title}
                                        onChange={(e) => setField("title", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Tipo *</Label>
                                    <select
                                        className={selectCls}
                                        value={form.type}
                                        onChange={(e) => setField("type", e.target.value)}
                                    >
                                        {SCHEDULE_TYPES.map((t: ScheduleType) => (
                                            <option key={t} value={t}>{SCHEDULE_TYPE_LABELS[t]}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Início *</Label>
                                    <input
                                        type="datetime-local"
                                        className={`w-full rounded-md border px-3 py-2 text-sm ${inputCls}`}
                                        value={form.startDate}
                                        onChange={(e) => setField("startDate", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Término *</Label>
                                    <input
                                        type="datetime-local"
                                        className={`w-full rounded-md border px-3 py-2 text-sm ${inputCls}`}
                                        value={form.endDate}
                                        onChange={(e) => setField("endDate", e.target.value)}
                                        min={form.startDate}
                                    />
                                </div>
                            </div>

                            {/* Company + Project */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Empresa</Label>
                                    <select
                                        className={selectCls}
                                        value={form.companyId}
                                        onChange={(e) => setField("companyId", e.target.value)}
                                    >
                                        <option value="">Selecionar empresa…</option>
                                        {companies.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">
                                        Projeto {!form.companyId && <span className="opacity-50">(selecione empresa primeiro)</span>}
                                    </Label>
                                    <select
                                        className={selectCls}
                                        value={form.projectId}
                                        onChange={(e) => setField("projectId", e.target.value)}
                                        disabled={!form.companyId || projects.length === 0}
                                    >
                                        <option value="">
                                            {!form.companyId ? "—" : projects.length === 0 ? "Nenhum projeto" : "Selecionar projeto…"}
                                        </option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-1.5">
                                <Label className="text-[var(--zyllen-muted)] text-xs">Endereço</Label>
                                <Input
                                    className={inputCls}
                                    placeholder="Rua, número, cidade…"
                                    value={form.address}
                                    onChange={(e) => setField("address", e.target.value)}
                                />
                            </div>

                            {/* Notes */}
                            <div className="space-y-1.5">
                                <Label className="text-[var(--zyllen-muted)] text-xs">Observações</Label>
                                <Textarea
                                    className={`${inputCls} min-h-[72px] resize-none`}
                                    placeholder="Detalhes adicionais…"
                                    value={form.notes}
                                    onChange={(e) => setField("notes", e.target.value)}
                                />
                            </div>

                            {/* Installers */}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)] text-xs">
                                    Técnicos * {form.installerIds.length > 0 && (
                                        <span className="text-[var(--zyllen-highlight)] ml-1">
                                            ({form.installerIds.length} selecionado{form.installerIds.length > 1 ? "s" : ""})
                                        </span>
                                    )}
                                </Label>

                                {loadingInstallers ? (
                                    <div className="h-24 rounded-lg bg-[var(--zyllen-bg-dark)] animate-pulse" />
                                ) : (
                                    <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--zyllen-border)] divide-y divide-[var(--zyllen-border)]">
                                        {installers.length === 0 ? (
                                            <p className="text-[var(--zyllen-muted)] text-sm p-3 text-center">
                                                Nenhum colaborador cadastrado
                                            </p>
                                        ) : (
                                            installers.map((inst) => {
                                                const selected = form.installerIds.includes(inst.id);
                                                return (
                                                    <label
                                                        key={inst.id}
                                                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                                            selected
                                                                ? "bg-[var(--zyllen-highlight)]/10"
                                                                : "hover:bg-[var(--zyllen-bg-dark)]"
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={() => toggleInstaller(inst.id)}
                                                            className="accent-[var(--zyllen-highlight)]"
                                                        />
                                                        <span
                                                            className="w-3 h-3 rounded-full shrink-0 border border-white/10"
                                                            style={{ backgroundColor: inst.agendaColor ?? DEFAULT_COLOR }}
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="text-sm text-white truncate">{inst.name}</p>
                                                            {inst.sector && (
                                                                <p className="text-xs text-[var(--zyllen-muted)] truncate">{inst.sector}</p>
                                                            )}
                                                        </div>
                                                        {selected && (
                                                            <CheckCircle2 className="w-4 h-4 text-[var(--zyllen-highlight)] ml-auto shrink-0" />
                                                        )}
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </DialogBody>

                        <DialogFooter>
                            <Button
                                variant="ghost"
                                className="text-[var(--zyllen-muted)]"
                                onClick={() => onOpenChange(false)}
                                disabled={isSaving || isChecking}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="bg-[var(--zyllen-highlight)] hover:bg-[var(--zyllen-highlight)]/80 text-white"
                                onClick={handleSubmit}
                                disabled={isSaving || isChecking}
                            >
                                {(isSaving || isChecking) && (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                )}
                                {isChecking ? "Verificando…" : isEditing ? "Salvar alterações" : "Criar agendamento"}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
