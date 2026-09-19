import { z } from 'zod';
import { labelLayoutJsonSchema } from './label-layout';

export const updateLabelTemplateSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').optional(),
    layout: labelLayoutJsonSchema.optional(),
});

export const printLabelSchema = z.object({
    assetId: z.string().uuid('Asset ID inválido'),
});

export const printLabelBatchSchema = z.object({
    assetIds: z.array(z.string().uuid()).min(1).max(50),
});

export const createLabelTemplateSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    layout: labelLayoutJsonSchema,
});
