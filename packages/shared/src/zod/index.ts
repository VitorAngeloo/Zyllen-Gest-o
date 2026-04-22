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

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

// ── Internal User ──
export const createInternalUserSchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    roleId: z.string().uuid('Role ID inválido'),
    sector: z.string().optional(),
    description: z.string().optional(),
});

export const updateInternalUserSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    roleId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
    sector: z.string().optional(),
    description: z.string().optional(),
    password: z.string().min(6).optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(6, 'Senha atual é obrigatória'),
    newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
});

export const resetPinSchema = z.object({
    password: z.string().min(6, 'Senha é obrigatória para resetar PIN'),
});

// ── External User ──
export const createExternalUserSchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirmação de senha é obrigatória'),
    cpf: z.string().min(11, 'CPF inválido').optional(),
    phone: z.string().min(8, 'Telefone inválido').optional(),
    position: z.string().min(2, 'Cargo/função é obrigatório').optional(),
    city: z.string().min(2, 'Cidade é obrigatória').optional(),
    state: z.string().length(2, 'Estado deve ser a sigla (UF)').optional(),
    companyId: z.string().uuid('Company ID inválido'),
    projectId: z.string().uuid('Project ID inválido').optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
});

// ── Registration: Client (self-service) ──
export const registerClientSchema = z.object({
    name: z.string().min(2, 'Nome completo é obrigatório'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    cpf: z.string().min(11, 'CPF inválido').optional(),
    phone: z.string().min(8, 'Telefone inválido').optional(),
    city: z.string().min(2, 'Cidade é obrigatória').optional(),
    state: z.string().length(2, 'Estado deve ser a sigla (UF)').optional(),
    position: z.string().min(2, 'Cargo/função é obrigatório').optional(),
    companyId: z.string().uuid('Company ID inválido').optional(),
    companyName: z.string().min(2, 'Nome da empresa é obrigatório').optional(),
    companyCnpj: z.string().optional(),
    projectId: z.string().uuid('Project ID inválido').optional(),
});

// ── Registration: Contractor (self-service) ──
export const registerContractorSchema = z.object({
    name: z.string().min(2, 'Nome completo é obrigatório'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    cpf: z.string().min(11, 'CPF inválido'),
    phone: z.string().min(8, 'Telefone inválido').optional(),
    city: z.string().min(2, 'Cidade é obrigatória').optional(),
    state: z.string().length(2, 'Estado deve ser a sigla (UF)').optional(),
});

// ── Login Contractor ──
export const loginContractorSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

// ── Company ──
export const createCompanySchema = z.object({
    name: z.string().min(2, 'Razão Social deve ter no mínimo 2 caracteres'),
    cnpj: z.string().optional(),
});

export const updateCompanySchema = z.object({
    name: z.string().min(2).optional(),
    cnpj: z.string().optional(),
});

// ── Project ──
export const createProjectSchema = z.object({
    name: z.string().min(2, 'Nome do projeto/estande deve ter no mínimo 2 caracteres'),
    description: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().length(2, 'Estado deve ser a sigla (UF)').optional(),
});

export const updateProjectSchema = z.object({
    name: z.string().min(2, 'Nome do projeto/estande deve ter no mínimo 2 caracteres').optional(),
    description: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().length(2, 'Estado deve ser a sigla (UF)').optional(),
});

// ── Category ──
export const createCategorySchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
});

export const updateCategorySchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').optional(),
});

// ── Location ──
export const createLocationSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
});

export const updateLocationSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').optional(),
    description: z.string().optional(),
});

// ── SKU Item ──
export const createSkuItemSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    brand: z.string().optional(),
    barcode: z.string().optional(),
    categoryId: z.string().uuid('Category ID inválido'),
});

export const updateSkuItemSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').optional(),
    description: z.string().optional(),
    brand: z.string().optional(),
    barcode: z.string().optional(),
    categoryId: z.string().uuid('Category ID inválido').optional(),
});

// ── Supplier ──
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

// ── Stock Movement ──
export const createStockEntrySchema = z.object({
    skuId: z.string().uuid('SKU ID inválido'),
    toLocationId: z.string().uuid('Location ID inválido'),
    qty: z.number().int().positive('Quantidade deve ser um inteiro positivo'),
    movementTypeId: z.string().uuid('Movement Type ID inválido'),
    pin: z.string().length(4).regex(/^\d{4}$/, 'PIN inválido'),
    reason: z.string().optional(),
    assetId: z.string().uuid().optional(),
});

export const createStockExitSchema = z.object({
    skuId: z.string().uuid('SKU ID inválido'),
    fromLocationId: z.string().uuid('Location ID inválido'),
    qty: z.number().int().positive('Quantidade deve ser um inteiro positivo'),
    movementTypeId: z.string().uuid('Movement Type ID inválido'),
    pin: z.string().length(4).regex(/^\d{4}$/, 'PIN inválido'),
    reason: z.string().optional(),
    assetId: z.string().uuid().optional(),
});

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
    companyId: z.string().uuid('Company ID inválido').optional(),
    externalUserId: z.string().uuid('External User ID inválido').optional(),
});

// Chamado interno (colaborador → TI)
export const createInternalTicketSchema = z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().min(10, 'Descreva o problema com pelo menos 10 caracteres'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

export const assignTicketSchema = z.object({
    assignedToId: z.string().uuid('User ID inválido'),
});

export const assignTicketWithPinSchema = z.object({
    pin: z.string().length(4, 'PIN deve ter 4 dígitos'),
    assignedToId: z.string().uuid('User ID inválido').optional(),
});

export const closeTicketWithPinSchema = z.object({
    pin: z.string().length(4, 'PIN deve ter 4 dígitos'),
    resolutionNotes: z.string().min(10, 'Descrição do atendimento deve ter pelo menos 10 caracteres'),
});

export const reassignTicketSchema = z.object({
    pin: z.string().length(4, 'PIN deve ter 4 dígitos'),
    assignedToId: z.string().uuid('User ID inválido'),
});

export const updateTicketStatusSchema = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED']),
});

export const createTicketMessageSchema = z.object({
    content: z.string().min(1, 'Conteúdo da mensagem é obrigatório'),
});

export const updatePurchaseStatusSchema = z.object({
    status: z.enum(['DRAFT', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED']),
});

export const reversalReasonSchema = z.object({
    reason: z.string().min(1, 'Motivo é obrigatório'),
});

export const updateLabelTemplateSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').optional(),
    layout: z.string().min(1, 'Layout é obrigatório').optional(),
});

export const updateContractorSchema = z.object({
    isActive: z.boolean().optional(),
});

// ── Movement Type ──
export const createMovementTypeSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    requiresApproval: z.boolean().default(false),
    isFinalWriteOff: z.boolean().default(false),
    setsAssetStatus: z.string().optional(),
    defaultToLocationId: z.string().uuid().optional(),
});

// ── Approval ──
export const approvalActionSchema = z.object({
    pin: z.string().length(4).regex(/^\d{4}$/, 'PIN inválido'),
});

// ── Role ──
export const createRoleSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
});

export const updateRoleSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
});

export const assignPermissionsSchema = z.object({
    permissionIds: z.array(z.string().uuid()),
});

// ── Permission ──
export const createPermissionSchema = z.object({
    screen: z.string().min(1, 'Tela é obrigatória'),
    action: z.string().min(1, 'Ação é obrigatória'),
});

// ── Asset ──
export const createAssetSchema = z.object({
    skuId: z.string().uuid('SKU ID inválido'),
    currentLocationId: z.string().uuid('Location ID inválido').optional(),
});

export const updateAssetStatusSchema = z.object({
    status: z.string().min(1, 'Status é obrigatório'),
});

export const updateAssetLocationSchema = z.object({
    locationId: z.string().uuid('Location ID inválido').nullable(),
});

// ── Bulk Equipment Registration ──
export const bulkEquipmentSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    brand: z.string().optional(),
    barcode: z.string().optional(),
    categoryId: z.string().uuid('Category ID inválido'),
    locationId: z.string().uuid('Location ID inválido'),
    quantity: z.number().int().positive('Quantidade deve ser um inteiro positivo'),
});

// ── Maintenance ──
export const OS_FORM_TYPES = [
    'TERCEIRIZADO',
    'INSTALACAO_SALA',
    'INSTALACAO_TELA',
    'DESINSTALACAO',
    'SUPORTE_REMOTO',
    'MANUTENCAO_TELA_SALA',
] as const;

export type OsFormType = (typeof OS_FORM_TYPES)[number];

export const OS_FORM_TYPE_LABELS: Record<OsFormType, string> = {
    TERCEIRIZADO: 'Terceirizado',
    INSTALACAO_SALA: 'Instalação de Sala Interativa/Imersiva',
    INSTALACAO_TELA: 'Instalação de Tela Interativa',
    DESINSTALACAO: 'Desinstalação de Tela/Sala',
    SUPORTE_REMOTO: 'Suporte Remoto',
    MANUTENCAO_TELA_SALA: 'Manutenção de Tela/Sala',
};

// Base schema for creating an OS (common fields)
export const createOsBaseSchema = z.object({
    formType: z.enum(OS_FORM_TYPES),
    assetId: z.string().uuid('Asset ID inválido').optional().nullable(),
    notes: z.string().optional(),
    clientName: z.string().optional(),
    clientCity: z.string().optional(),
    clientState: z.string().optional(),
    scheduledDate: z.string().optional(), // ISO string
    formData: z.record(z.unknown()).optional(), // Form-specific JSON data
});

// Keep the legacy schema for backward compat
export const createMaintenanceSchema = z.object({
    assetId: z.string().uuid('Asset ID inválido').optional(),
    formType: z.enum(OS_FORM_TYPES).optional().default('TERCEIRIZADO'),
    notes: z.string().optional(),
    clientName: z.string().optional(),
    clientCity: z.string().optional(),
    clientState: z.string().optional(),
    location: z.string().optional(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    contactRole: z.string().optional(),
    scheduledDate: z.string().optional(),
    startedAt: z.string().optional(),
    endedAt: z.string().optional(),
    formData: z.record(z.unknown()).optional(),
});

// Schema for updating form data progressively (partial save)
export const updateOsFormDataSchema = z.object({
    formData: z.record(z.unknown()),
    notes: z.string().optional(),
    clientName: z.string().optional(),
    clientCity: z.string().optional(),
    clientState: z.string().optional(),
    location: z.string().optional(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    contactRole: z.string().optional(),
    startedAt: z.string().optional(),
    endedAt: z.string().optional(),
});

export const updateMaintenanceStatusSchema = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']),
    notes: z.string().optional(),
});

// ── Purchase Order ──
export const createPurchaseOrderSchema = z.object({
    supplierId: z.string().uuid('Supplier ID inválido'),
    items: z.array(z.object({
        skuId: z.string().uuid('SKU ID inválido'),
        qtyOrdered: z.number().int().positive('Quantidade deve ser positiva'),
    })).min(1, 'Pedido deve ter pelo menos 1 item'),
});

export const receivePurchaseOrderSchema = z.object({
    locationId: z.string().uuid('Location ID inválido'),
    items: z.array(z.object({
        skuId: z.string().uuid('SKU ID inválido'),
        qtyReceived: z.number().int().positive('Quantidade deve ser positiva'),
        divergenceNote: z.string().optional(),
    })).min(1, 'Deve receber pelo menos 1 item'),
});

// ── Labels ──
export const printLabelSchema = z.object({
    assetId: z.string().uuid('Asset ID inválido'),
});

export const createLabelTemplateSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    layout: z.string().min(1, 'Layout é obrigatório'),
});

// ── Pagination ──
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
});

// ── Followups (Acompanhamento) ──
export const createFollowupSchema = z.object({
    companyId: z.string().uuid('ID da empresa inválido'),
    responsibleName: z.string().max(200).optional(),
    responsibleContact: z.string().max(200).optional(),
});

export const updateFollowupSchema = z.object({
    responsibleName: z.string().max(200).optional(),
    responsibleContact: z.string().max(200).optional(),
    status: z.enum(['IN_PROGRESS', 'PENDING', 'COMPLETED']).optional(),
});

export const createFollowupBlockSchema = z.object({
    type: z.enum(['TEXT', 'MEDIA', 'CHECKLIST']),
    title: z.string().max(300).optional(),
    content: z.string().optional(),
});

export const updateFollowupBlockSchema = z.object({
    title: z.string().max(300).optional(),
    content: z.string().optional(),
});

export const createFollowupCommentSchema = z.object({
    text: z.string().min(1, 'Comentário não pode ser vazio').max(2000),
});

export const createChecklistItemSchema = z.object({
    text: z.string().min(1, 'Texto do item é obrigatório').max(500),
    details: z.string().max(3000).optional(),
    order: z.number().int().optional(),
});

export const updateChecklistItemSchema = z.object({
    text: z.string().min(1).max(500).optional(),
    details: z.string().max(3000).optional(),
    checked: z.boolean().optional(),
    order: z.number().int().optional(),
});

// ── Product Exit ──
export const createProductExitSchema = z.object({
    skuId: z.string().uuid('SKU ID inválido'),
    locationId: z.string().uuid('Location ID inválido'),
    quantity: z.number().int().positive('Quantidade deve ser um inteiro positivo'),
    reason: z.string().optional(),
});
