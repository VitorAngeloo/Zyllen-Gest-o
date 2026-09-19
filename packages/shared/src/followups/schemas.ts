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
