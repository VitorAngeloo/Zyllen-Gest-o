import { z } from 'zod';

// ============================================
// Zyllen Gestão — Shared Zod Schemas
// ============================================

// ── Auth ──
export const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export const loginExternalSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export const pinSchema = z.object({
    pin: z.string().length(4, 'PIN deve ter exatamente 4 dígitos').regex(/^\d{4}$/, 'PIN deve conter apenas números'),
});

// ── Internal User ──
export const createInternalUserSchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    roleId: z.string().uuid('Role ID inválido'),
});

// ── External User ──
export const createExternalUserSchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    companyId: z.string().uuid('Company ID inválido'),
});

// ── Company ──
export const createCompanySchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    cnpj: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
});

// ── Category ──
export const createCategorySchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
});

// ── Location ──
export const createLocationSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
});

// ── SKU Item ──
export const createSkuItemSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    brand: z.string().optional(),
    barcode: z.string().optional(),
    categoryId: z.string().uuid('Category ID inválido'),
});

// ── Supplier ──
export const createSupplierSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    cnpj: z.string().optional(),
    contact: z.string().optional(),
});

// ── Stock Movement ──
export const createStockMovementSchema = z.object({
    typeId: z.string().uuid('Movement Type ID inválido'),
    skuId: z.string().uuid('SKU ID inválido'),
    assetId: z.string().uuid('Asset ID inválido').optional(),
    fromLocationId: z.string().uuid('Location ID inválido').optional(),
    toLocationId: z.string().uuid('Location ID inválido').optional(),
    qty: z.number().int().positive('Quantidade deve ser positiva'),
    pin: z.string().length(4, 'PIN deve ter exatamente 4 dígitos').regex(/^\d{4}$/, 'PIN deve conter apenas números'),
    reason: z.string().optional(),
});

// ── Ticket ──
export const createTicketSchema = z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().min(1, 'Descrição é obrigatória'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

// ── Movement Type ──
export const createMovementTypeSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    requiresApproval: z.boolean().default(false),
    isFinalWriteOff: z.boolean().default(false),
    setsAssetStatus: z.string().optional(),
    defaultToLocationId: z.string().uuid().optional(),
});
