import { z } from 'zod';

export const createAssetSchema = z.object({
    skuId: z.string().uuid('ID do item inválido'),
    currentLocationId: z.string().uuid('Location ID inválido').optional(),
});

export const updateAssetStatusSchema = z.object({
    status: z.string().min(1, 'Status é obrigatório'),
});

export const updateAssetLocationSchema = z.object({
    locationId: z.string().uuid('Location ID inválido').nullable(),
});

export const bulkEquipmentSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    brand: z.string().optional(),
    barcode: z.string().optional(),
    categoryId: z.string().uuid('Category ID inválido'),
    locationId: z.string().uuid('Location ID inválido'),
    quantity: z.number().int().positive('Quantidade deve ser um inteiro positivo'),
});
