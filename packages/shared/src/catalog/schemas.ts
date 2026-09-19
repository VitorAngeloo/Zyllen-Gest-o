import { z } from 'zod';

export const createCategorySchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
});

export const updateCategorySchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').optional(),
});

export const createSkuItemSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    brand: z.string().optional(),
    barcode: z.string().optional(),
    categoryId: z.string().uuid('Category ID inválido'),
    codePrefix: z.string().length(3, 'Prefixo deve ter exatamente 3 letras').regex(/^[A-Z0-9]{3}$/, 'Prefixo deve ter 3 letras/números maiúsculos'),
    unit: z.string().optional(),
});

export const updateSkuItemSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').optional(),
    description: z.string().optional(),
    brand: z.string().optional(),
    barcode: z.string().optional(),
    categoryId: z.string().uuid('Category ID inválido').optional(),
    codePrefix: z.string().length(3).regex(/^[A-Z0-9]{3}$/).optional(),
    unit: z.string().optional(),
});
