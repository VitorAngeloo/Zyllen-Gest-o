import type { ChronogramService, ChronogramStage, ChronogramView } from './types/chronogram.types';
import { PROJECT_PLANNING_STAGES, PROJECT_PLANNING_STAGE_LABELS } from '@zyllen/shared';

export const CHRONOGRAM_PLANNING_STAGES: readonly ChronogramStage[] = PROJECT_PLANNING_STAGES;

// The eight stages of the supplied application remain distinct from operational statuses.
export const CHRONOGRAM_STAGES: Record<ChronogramStage, { label: string; tone: string }> = {
    contrato: { label: PROJECT_PLANNING_STAGE_LABELS.contrato, tone: 'muted' }, kickoff: { label: PROJECT_PLANNING_STAGE_LABELS.kickoff, tone: 'violet' },
    semprev: { label: PROJECT_PLANNING_STAGE_LABELS.semprev, tone: 'muted' }, predef: { label: PROJECT_PLANNING_STAGE_LABELS.predef, tone: 'blue' },
    agendado: { label: PROJECT_PLANNING_STAGE_LABELS.agendado, tone: 'green' }, pausado: { label: PROJECT_PLANNING_STAGE_LABELS.pausado, tone: 'amber' },
    concluido: { label: PROJECT_PLANNING_STAGE_LABELS.concluido, tone: 'green' }, cancelado: { label: PROJECT_PLANNING_STAGE_LABELS.cancelado, tone: 'red' },
    PENDING: { label: 'Pendente de agendamento', tone: 'muted' }, SCHEDULED: { label: 'Agendado / preparação', tone: 'blue' },
    IN_PROGRESS: { label: 'Em andamento', tone: 'amber' }, DONE: { label: 'Finalizado', tone: 'green' },
    CANCELLED: { label: 'Cancelado', tone: 'red' }, UNKNOWN: { label: 'Status não identificado', tone: 'muted' },
};
export const CHRONOGRAM_SERVICES: Record<ChronogramService, string> = {
    INSTALLATION: 'Instalação', REMOVAL: 'Desinstalação', MAINTENANCE: 'Manutenção', SUPPORT: 'Suporte', OTHER: 'Compromisso', TRIP: 'Viagem',
};
export const CHRONOGRAM_VIEWS: { id: ChronogramView; label: string }[] = [
    { id: 'agenda', label: 'Agenda' }, { id: 'calendario', label: 'Calendário' },
    { id: 'projetos', label: 'Projetos' }, { id: 'pendencias', label: 'Pendências' },
];
export const ACTIVE_STAGES: ChronogramStage[] = ['contrato', 'kickoff', 'semprev', 'predef', 'agendado', 'pausado', 'PENDING', 'SCHEDULED', 'IN_PROGRESS'];
export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const AUTO_PENDING_LABEL = 'Confirmar realização (a data já passou)';
