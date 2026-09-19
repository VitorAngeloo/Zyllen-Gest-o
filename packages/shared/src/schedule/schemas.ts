import { z } from 'zod';

export const SCHEDULE_TYPES = ['INSTALLATION', 'MAINTENANCE', 'REMOVAL', 'SUPPORT', 'OTHER'] as const;

export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
    INSTALLATION: 'Instalação',
    MAINTENANCE: 'Manutenção',
    REMOVAL: 'Desinstalação',
    SUPPORT: 'Suporte',
    OTHER: 'Outros',
};

export const SCHEDULE_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;

export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
    SCHEDULED: 'Agendado',
    IN_PROGRESS: 'Em andamento',
    DONE: 'Concluído',
    CANCELLED: 'Cancelado',
};

export const scheduleRecurrenceInputSchema = z.object({
    type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY'] as const),
    interval: z.number().int().min(1).max(365).default(1),
    count: z.number().int().min(2).max(104).optional(),
    endDate: z.string().optional(),
});

export const createScheduleSchema = z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    type: z.enum(SCHEDULE_TYPES).default('INSTALLATION'),
    startDate: z.string().min(1, 'Data de início é obrigatória'),
    endDate: z.string().min(1, 'Data de término é obrigatória'),
    address: z.string().optional(),
    notes: z.string().optional(),
    companyId: z.string().uuid('Company ID inválido').optional(),
    projectId: z.string().uuid('Project ID inválido').optional(),
    installerIds: z.array(z.string().uuid('Installer ID inválido')).min(1, 'Pelo menos 1 instalador é obrigatório'),
    recurrence: scheduleRecurrenceInputSchema.optional(),
});

export const updateScheduleSchema = z.object({
    title: z.string().min(1, 'Título é obrigatório').optional(),
    type: z.enum(SCHEDULE_TYPES).optional(),
    status: z.enum(SCHEDULE_STATUSES).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    address: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    companyId: z.string().uuid().nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
    installerIds: z.array(z.string().uuid()).optional(),
    allowConflicts: z.boolean().optional(),
});

export const updateInstallerAgendaSchema = z.object({
    agendaColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve ser um hex válido (#RRGGBB)')
        .optional(),
    agendaActive: z.boolean().optional(),
});
