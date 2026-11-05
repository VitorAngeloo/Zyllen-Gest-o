import { z } from 'zod';

export const createFollowupSchema = z.object({
    companyId: z.string().uuid('ID da empresa inválido'),
    projectId: z.string().uuid('ID do projeto inválido').optional().nullable(),
    responsibleName: z.string().max(200).optional(),
    responsibleContact: z.string().max(200).optional(),
});

export const updateFollowupSchema = z.object({
    projectId: z.string().uuid('ID do projeto inválido').nullable().optional(),
    responsibleName: z.string().max(200).optional(),
    responsibleContact: z.string().max(200).optional(),
    status: z.enum(['IN_PROGRESS', 'PENDING', 'COMPLETED']).optional(),
});

export const createFollowupBlockSchema = z.object({
    type: z.enum(['TEXT', 'MEDIA', 'CHECKLIST', 'PDF', 'SIGNATURE']),
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

export const checklistQuantitySchema = z.number().int().min(1).max(2147483647);
export const checklistComponentSchema = z.object({
    text: z.string().trim().min(1).max(500),
    quantity: checklistQuantitySchema,
});
export const checklistComponentsSchema = z.array(checklistComponentSchema).max(100).refine(
    items => new Set(items.map(item => item.text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR'))).size === items.length,
    'Cada componente deve aparecer apenas uma vez',
);
export const checklistComponentTemplatesSchema = z.array(checklistComponentSchema.extend({
    selectedByDefault: z.boolean(),
})).max(100);

export const createChecklistItemSchema = z.object({
    text: z.string().trim().min(1, 'Texto do item é obrigatório').max(500),
    details: z.string().max(3000).optional(),
    quantity: checklistQuantitySchema.default(1),
    components: checklistComponentsSchema.optional(),
    order: z.number().int().optional(),
});

export const updateChecklistItemSchema = z.object({
    text: z.string().trim().min(1).max(500).optional(),
    details: z.string().max(3000).optional(),
    quantity: checklistQuantitySchema.optional(),
    components: checklistComponentsSchema.optional(),
    checked: z.boolean().optional(),
    order: z.number().int().optional(),
});

export const createChecklistCatalogItemSchema = z.object({
    text: z.string().trim().min(1, 'Nome do item é obrigatório').max(500),
});

export const checklistCatalogQuerySchema = z.object({
    search: z.string().trim().max(500).default(''),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const addChecklistItemsSchema = z.object({
    requestId: z.string().uuid(),
    items: z.array(z.object({
        catalogItemId: z.string().uuid(),
        quantity: checklistQuantitySchema,
        components: checklistComponentsSchema.optional(),
    })).min(1).max(100).refine(
        items => new Set(items.map(item => item.catalogItemId)).size === items.length,
        'Selecione cada item apenas uma vez',
    ),
});

export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
export type ChecklistCatalogQuery = z.infer<typeof checklistCatalogQuerySchema>;
export type AddChecklistItemsInput = z.infer<typeof addChecklistItemsSchema>;
