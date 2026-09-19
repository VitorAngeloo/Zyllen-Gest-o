import { z } from 'zod';

export const updateContractorSchema = z.object({
    isActive: z.boolean().optional(),
});
