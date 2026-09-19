import { z } from 'zod';

export const createSupplierSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    cnpj: z.string().optional(),
    contact: z.string().optional(),
});

export const updateSupplierSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').optional(),
    cnpj: z.string().optional(),
    contact: z.string().optional(),
});
