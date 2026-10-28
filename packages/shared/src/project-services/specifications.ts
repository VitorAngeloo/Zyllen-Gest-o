import { z } from 'zod';

/** Descriptive fields from the parallel chronogram; no calculation or stock reservation. */
export const projectRoomSpecificationsSchema = z.object({
    roomType: z.string().trim().max(100).default(''),
    format: z.string().trim().max(300).default(''),
    projections: z.string().trim().max(300).default(''),
    proportion: z.string().trim().max(300).default(''),
    resolution: z.string().trim().max(300).default(''),
    control: z.string().trim().max(300).default(''),
    sound: z.string().trim().max(300).default(''),
}).strict();

export const projectSpecificationsSchema = z.object({
    category: z.enum(['sala', 'tela']).nullable(),
    equipment: z.array(z.string().trim().min(1).max(300)).max(100),
    room: projectRoomSpecificationsSchema.nullable(),
}).strict();

export type ProjectRoomSpecifications = z.infer<typeof projectRoomSpecificationsSchema>;
export type ProjectSpecifications = z.infer<typeof projectSpecificationsSchema>;
