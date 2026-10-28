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
        createdAt: z.string(), createdBy: z.string(), resolvedAt: z.string(), resolvedBy: z.string() }).strict()),
    annotations: z.array(z.object({ sourceId: z.string().min(1), date: z.string(), author: z.string(), text: z.string() }).strict()),
}).strict();
export type ProjectLegacyPayload = z.infer<typeof projectLegacyPayloadSchema>;
export interface ProjectLegacyRecord extends ProjectLegacyPayload {
    id: string; sourceId: string; source: { name: string; sha256: string; importedAt: string };
}
