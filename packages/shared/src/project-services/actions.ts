import { z } from 'zod';
import { projectPlanningSchema } from './planning';
import { PROJECT_SERVICE_STATUSES } from './schemas';

export const projectPlanningChangeSchema = z.object({
    expected: projectPlanningSchema.nullable(), next: projectPlanningSchema.nullable(),
}).strict();
export const projectObservationsChangeSchema = z.object({ expected: z.string().max(10000).nullable(), next: z.string().max(10000) }).strict();
export const projectCancellationSchema = z.object({ expectedStatus: z.enum(PROJECT_SERVICE_STATUSES), reason: z.string().trim().min(1, 'Informe a justificativa do cancelamento').max(2000) }).strict();
export type ProjectPlanningChange = z.infer<typeof projectPlanningChangeSchema>;
export type ProjectObservationsChange = z.infer<typeof projectObservationsChangeSchema>;
export type ProjectCancellation = z.infer<typeof projectCancellationSchema>;
export interface ProjectHistoryEntry {
    id: string; action: string; createdAt: string; author: string;
    changes: { field: string; before: string; after: string }[];
    reason: string | null;
}
