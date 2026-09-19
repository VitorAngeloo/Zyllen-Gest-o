import { SCHEDULE_TYPE_LABELS } from '@zyllen/shared';



export const TYPE_LABELS: Record<string, string> = SCHEDULE_TYPE_LABELS;

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    SCHEDULED: { label: "Agendado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    IN_PROGRESS: { label: "Em andamento", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    DONE: { label: "Concluído", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    CANCELLED: { label: "Cancelado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export const DEFAULT_COLOR = "#3B82F6";

export const inputCls =
    "bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 focus-visible:ring-[var(--zyllen-highlight)]/30 focus-visible:border-[var(--zyllen-highlight)]";
