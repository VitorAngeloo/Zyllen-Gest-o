import { z } from 'zod';

export const OS_FORM_TYPES = [
    'TERCEIRIZADO',
    'INSTALACAO_SALA',
    'INSTALACAO_TELA',
    'DESINSTALACAO',
    'SUPORTE_REMOTO',
    'MANUTENCAO_TELA_SALA',
] as const;

export type OsFormType = (typeof OS_FORM_TYPES)[number];

export const OS_FORM_TYPE_LABELS: Record<OsFormType, string> = {
    TERCEIRIZADO: 'Terceirizado',
    INSTALACAO_SALA: 'Instalação de Sala Interativa/Imersiva',
    INSTALACAO_TELA: 'Instalação de Tela Interativa',
    DESINSTALACAO: 'Desinstalação de Tela/Sala',
    SUPORTE_REMOTO: 'Suporte Remoto',
    MANUTENCAO_TELA_SALA: 'Manutenção de Tela/Sala',
};

export const createOsBaseSchema = z.object({
    formType: z.enum(OS_FORM_TYPES),
    assetId: z.string().uuid('Asset ID inválido').optional().nullable(),
    notes: z.string().optional(),
    clientName: z.string().optional(),
    clientCity: z.string().optional(),
    clientState: z.string().optional(),
    scheduledDate: z.string().optional(), // ISO string
    formData: z.record(z.unknown()).optional(), // Form-specific JSON data
});

export const createMaintenanceSchema = z.object({
    assetId: z.string().uuid('Asset ID inválido').optional(),
    companyId: z.string().uuid('Company ID inválido').optional(),
    projectId: z.string().uuid('Project ID inválido').optional().nullable(),
    formType: z.enum(OS_FORM_TYPES).optional().default('TERCEIRIZADO'),
    notes: z.string().optional(),
    clientName: z.string().optional(),
    clientCity: z.string().optional(),
    clientState: z.string().optional(),
    location: z.string().optional(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    contactRole: z.string().optional(),
    scheduledDate: z.string().optional(),
    startedAt: z.string().optional(),
    endedAt: z.string().optional(),
    formData: z.record(z.unknown()).optional(),
});

export const updateOsFormDataSchema = z.object({
    formData: z.record(z.unknown()),
    notes: z.string().optional(),
    clientName: z.string().optional(),
    clientCity: z.string().optional(),
    clientState: z.string().optional(),
    location: z.string().optional(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    contactRole: z.string().optional(),
    startedAt: z.string().optional(),
    endedAt: z.string().optional(),
});

export const updateMaintenanceStatusSchema = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']),
    notes: z.string().optional(),
});
