import { z } from 'zod';
import { projectForecastSchema, projectPlanningSchema } from './planning';
import { projectSpecificationsSchema } from './specifications';
const day = projectForecastSchema.refine(value => value.length === 10, 'Informe um dia completo').nullable();
/** Source snapshot, never an operational project, event or proof of execution. */
export const projectLegacyPayloadSchema = z.object({
    name: z.string().min(1).max(1000), location: z.string().max(1000), service: z.enum(['INSTALLATION', 'REMOVAL', 'MAINTENANCE']).nullable(),
    planning: projectPlanningSchema, specifications: projectSpecificationsSchema, start: day, end: day, original: day,
    technician: z.string().max(2000), notes: z.string().max(20000),
    pending: z.array(z.object({ sourceId: z.string().min(1), type: z.string(), responsible: z.string(), deadline: day, detail: z.string(), open: z.boolean(),
        createdAt: z.string(), createdBy: z.string(), resolvedAt: z.string(), resolvedBy: z.string(), version: z.number().int().min(0).optional() }).strict()),
    annotations: z.array(z.object({ sourceId: z.string().min(1), date: z.string(), author: z.string(), text: z.string() }).strict()),
}).strict();
export type ProjectLegacyPayload = z.infer<typeof projectLegacyPayloadSchema>;
export interface ProjectLegacyRecord extends ProjectLegacyPayload {
    id: string; sourceId: string; source: { name: string; sha256: string; importedAt: string };
    editingAvailable?: boolean; version?: number; editedAt?: string | null; editedBy?: string | null;
}

export const projectLegacyDataSchema = projectLegacyPayloadSchema.omit({ pending: true, annotations: true }).extend({ name: z.string().trim().min(1, 'Informe o cliente').max(1000) }).superRefine((data, ctx) => {
    if (['predef', 'agendado'].includes(data.planning.stage ?? '') && !data.start) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['start'], message: 'Informe o início para esse status' });
    if (data.end && !data.start) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['start'], message: 'Informe o início do período' });
    if (data.start && data.end && data.end < data.start) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end'], message: 'O fim não pode ser anterior ao início' });
});
export type ProjectLegacyData = z.infer<typeof projectLegacyDataSchema>;
export const projectLegacyUpdateSchema = z.object({ expectedVersion: z.number().int().min(0), data: projectLegacyDataSchema, reason: z.string().trim().max(2000).default('') }).strict();
export type ProjectLegacyUpdate = z.infer<typeof projectLegacyUpdateSchema>;
export const projectLegacyCancellationSchema = z.object({ expectedStage: projectPlanningSchema.shape.stage, reason: z.string().trim().min(5, 'Informe a justificativa do cancelamento').max(2000) }).strict();
export type ProjectLegacyCancellation = z.infer<typeof projectLegacyCancellationSchema>;

export function projectLegacyData(record: ProjectLegacyPayload): ProjectLegacyData {
    return { name: record.name, location: record.location, service: record.service, planning: record.planning, specifications: record.specifications,
        start: record.start, end: record.end, original: record.original, technician: record.technician, notes: record.notes };
}
