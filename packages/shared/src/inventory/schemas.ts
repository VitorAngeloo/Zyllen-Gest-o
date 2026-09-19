import { z } from 'zod';

export const createStockEntrySchema = z.object({
    skuId: z.string().uuid('ID do item inválido'),
    toLocationId: z.string().uuid('Location ID inválido').optional(),
    qty: z.coerce.number().int().positive('Quantidade deve ser um inteiro positivo'),
    movementTypeId: z.string().uuid('Movement Type ID inválido'),
    pin: z.string().length(4).regex(/^\d{4}$/, 'PIN inválido'),
    reason: z.string().optional(),
    eventDescription: z.string().trim().min(1).max(2000).optional(),
    assetId: z.string().uuid().optional(),
});

export const createStockExitSchema = z.object({
    skuId: z.string().uuid('ID do item inválido'),
    fromLocationId: z.string().uuid('Location ID inválido'),
    qty: z.coerce.number().int().positive('Quantidade deve ser um inteiro positivo'),
    movementTypeId: z.string().uuid('Movement Type ID inválido'),
    pin: z.string().length(4).regex(/^\d{4}$/, 'PIN inválido'),
    reason: z.string().optional(),
    assetId: z.string().uuid().optional(),
});

export const createStockMovementSchema = z.object({
    typeId: z.string().uuid('Movement Type ID inválido'),
    skuId: z.string().uuid('ID do item inválido'),
    assetId: z.string().uuid('Asset ID inválido').optional(),
    fromLocationId: z.string().uuid('Location ID inválido').optional(),
    toLocationId: z.string().uuid('Location ID inválido').optional(),
    qty: z.coerce.number().int().positive('Quantidade deve ser positiva'),
    pin: z.string().length(4, 'PIN deve ter exatamente 4 dígitos').regex(/^\d{4}$/, 'PIN deve conter apenas números'),
    reason: z.string().optional(),
});

export const reversalReasonSchema = z.object({
    reason: z.string().min(1, 'Motivo é obrigatório'),
});

export const createMovementTypeSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    requiresApproval: z.boolean().default(false),
    isFinalWriteOff: z.boolean().default(false),
    setsAssetStatus: z.string().optional(),
    defaultToLocationId: z.string().uuid().optional(),
});

export const approvalActionSchema = z.object({
    pin: z.string().length(4).regex(/^\d{4}$/, 'PIN inválido'),
});

export const createBatchEntrySchema = z.object({
    requestId: z.string().uuid(),
    assetIds: z.array(z.string().uuid()).min(1).max(100),
    toLocationId: z.string().uuid(),
    movementTypeId: z.string().uuid(),
    reason: z.string().trim().min(1).max(2000),
    eventDescription: z.string().trim().min(1).max(2000),
    returnStatus: z.enum(['ATIVO', 'EM_MANUTENCAO']).default('ATIVO'),
    pin: z.string().regex(/^\d{4}$/),
}).strict().superRefine((value, context) => {
    if (new Set(value.assetIds).size !== value.assetIds.length) {
        context.addIssue({ code: 'custom', path: ['assetIds'], message: 'Ha patrimonios repetidos na selecao' });
    }
});
export type CreateBatchEntryInput = z.infer<typeof createBatchEntrySchema>;

export const createBatchExitSchema = z.object({
    requestId: z.string().uuid().optional(),
    assetIds: z.array(z.string().uuid()).min(1).max(100),
    destinationLocationId: z.string().uuid().optional(),
    reason: z.string().trim().min(1).max(2000),
    newStatus: z.enum(['EM_USO', 'EM_MANUTENCAO', 'BAIXADO']).default('EM_USO'),
    eventDescription: z.string().trim().min(1).max(2000),
    pin: z.string().regex(/^\d{4}$/),
}).strict().superRefine((value, context) => {
    if (new Set(value.assetIds).size !== value.assetIds.length) {
        context.addIssue({ code: 'custom', path: ['assetIds'], message: 'Ha patrimonios repetidos na selecao' });
    }
    if (value.destinationLocationId && value.newStatus !== 'EM_USO') {
        context.addIssue({ code: 'custom', path: ['newStatus'], message: 'Envios para cliente devem ficar em uso' });
    }
});
export type CreateBatchExitInput = z.infer<typeof createBatchExitSchema>;
