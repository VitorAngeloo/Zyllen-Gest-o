import { z } from 'zod';
import { projectStatisticsQuerySchema } from '../project-services/schemas';
import { SCHEDULE_STATUSES } from '../schedule/schemas';

export const BRAZIL_STATES = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const;
export const tripInputSchema = z.object({
    title: z.string().trim().min(1).max(200),
    originCity: z.string().trim().min(1).max(100), originState: z.enum(BRAZIL_STATES),
    destinationCity: z.string().trim().min(1).max(100), destinationState: z.enum(BRAZIL_STATES),
    startDate: z.string().datetime({ offset: true }), endDate: z.string().datetime({ offset: true }),
    notes: z.string().max(10000).default(''),
    installerIds: z.array(z.string().uuid()).max(50).default([]),
    contractorIds: z.array(z.string().uuid()).max(50).default([]),
    serviceIds: z.array(z.string().uuid()).max(100).default([]),
    allowConflicts: z.boolean().default(false),
}).strict().superRefine((value, ctx) => {
    if (Date.parse(value.endDate) <= Date.parse(value.startDate)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'O retorno deve ser depois da saída' });
    if (!value.installerIds.length && !value.contractorIds.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['installerIds'], message: 'Selecione pelo menos um responsável pela viagem' });
});
export type TripInput = z.infer<typeof tripInputSchema>;

export const tripListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50),
    status: z.enum(SCHEDULE_STATUSES).optional(),
    interstate: z.enum(['true', 'false']).optional(),
    search: z.string().trim().max(200).optional(),
}).strict();
export type TripListQuery = z.infer<typeof tripListQuerySchema>;

export const tripStatusSchema = z.object({ status: z.enum(SCHEDULE_STATUSES) }).strict();
export type TripStatusInput = z.infer<typeof tripStatusSchema>;
// Reuse the validated UTC period contract. This panel always presents both service types.
export const operationsStatisticsQuerySchema = projectStatisticsQuerySchema.refine(query => query.type === 'ALL', 'Este painel reúne os dois tipos de serviço');
export type OperationsStatisticsQuery = z.infer<typeof operationsStatisticsQuerySchema>;
