import { z } from 'zod';
import { LOCATION_KINDS } from '../inventory/custody';

const classification = {
    kind: z.enum(LOCATION_KINDS).nullable().optional(),
    companyId: z.string().uuid().nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
    isMainWarehouse: z.boolean().optional(),
};

export const createLocationSchema = z.object({
    name: z.string().trim().min(1, 'Nome é obrigatório').max(200),
    description: z.string().optional(),
    ...classification,
}).strict();

export const updateLocationSchema = z.object({
    name: z.string().trim().min(1, 'Nome é obrigatório').max(200).optional(),
    description: z.string().optional(),
    ...classification,
}).strict();
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
