import { z } from 'zod';

export const PROJECT_SERVICE_TYPES = ['INSTALLATION', 'REMOVAL'] as const;
export const PROJECT_SERVICE_STATUSES = ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
export type ProjectServiceType = (typeof PROJECT_SERVICE_TYPES)[number];
export type ProjectServiceStatus = (typeof PROJECT_SERVICE_STATUSES)[number];

export const projectStatisticsQuerySchema = z.object({
    type: z.enum(['ALL', ...PROJECT_SERVICE_TYPES]).default('ALL'),
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
}).strict().superRefine(({ start, end }, ctx) => {
    const duration = Date.parse(end) - Date.parse(start);
    if (duration <= 0 || duration > 366 * 86_400_000) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end'], message: 'Informe um período positivo de até 366 dias' });
    }
});
export type ProjectStatisticsQuery = z.infer<typeof projectStatisticsQuerySchema>;

export const projectServiceInputSchema = z.object({
    companyId: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(200),
    type: z.enum(PROJECT_SERVICE_TYPES),
    structureId: z.string().uuid().nullable().optional(),
    removalCycleId: z.string().uuid().nullable().optional(),
    markerId: z.string().uuid().nullable().default(null),
    urgency: z.number().int().min(0).max(2).default(0),
    color: z.string().regex(/^#[a-fA-F0-9]{6}$/).default('#ABFF10'),
    address: z.string().trim().max(1000).default(''),
    city: z.string().trim().max(100).default(''),
    state: z.string().trim().max(2).default(''),
    mapsUrl: z.union([z.literal(''), z.string().url().max(2000).refine(value => value.toLowerCase().startsWith('https://'), 'Use um link HTTPS')]).default(''),
    notes: z.string().max(10000).default(''),
    sectors: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
    installerIds: z.array(z.string().uuid()).max(50).default([]),
    contractorIds: z.array(z.string().uuid()).max(50).default([]),
    requiresTravel: z.boolean().default(false),
    relevant: z.boolean().default(false),
    startDate: z.string().datetime({ offset: true }).optional(),
    endDate: z.string().datetime({ offset: true }).optional(),
    allowConflicts: z.boolean().default(false),
}).strict().superRefine((value, ctx) => {
    if (value.type === 'INSTALLATION' && value.removalCycleId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['removalCycleId'], message: 'Instalação inicia um ciclo; não selecione um ciclo de desinstalação' });
    if (value.type === 'REMOVAL' && value.structureId && !value.removalCycleId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['removalCycleId'], message: 'Selecione a instalação correspondente' });
    if (!!value.startDate !== !!value.endDate || (value.startDate && value.endDate && Date.parse(value.endDate) <= Date.parse(value.startDate))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Informe início e término válidos, com término após o início' });
    }
    if (value.startDate && !value.installerIds.length && !value.contractorIds.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['installerIds'], message: 'Selecione pelo menos um responsável para agendar' });
    }
});

export const projectServiceMarkerSchema = z.object({ name: z.string().trim().min(1).max(100) }).strict();
export const projectServiceStatusSchema = z.object({ status: z.enum(PROJECT_SERVICE_STATUSES) }).strict();
export type ProjectServiceInput = z.infer<typeof projectServiceInputSchema>;
