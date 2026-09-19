import { z } from 'zod';

export const updatePurchaseStatusSchema = z.object({
    status: z.enum(['DRAFT', 'SENT', 'PARTIAL', 'COMPLETED', 'CANCELLED']),
});

export const createPurchaseOrderSchema = z.object({
    supplierId: z.string().uuid('Supplier ID inválido'),
    items: z.array(z.object({
        skuId: z.string().uuid('ID do item inválido'),
        qtyOrdered: z.number().int().positive('Quantidade deve ser positiva'),
    })).min(1, 'Pedido deve ter pelo menos 1 item'),
});

export const receivePurchaseOrderSchema = z.object({
    locationId: z.string().uuid('Location ID inválido'),
    items: z.array(z.object({
        skuId: z.string().uuid('ID do item inválido'),
        qtyReceived: z.number().int().positive('Quantidade deve ser positiva'),
        divergenceNote: z.string().optional(),
    })).min(1, 'Deve receber pelo menos 1 item'),
});
