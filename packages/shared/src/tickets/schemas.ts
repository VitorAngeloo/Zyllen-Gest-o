import { z } from 'zod';

export const ticketSourceFilterSchema = z.enum(['ALL', 'INTERNAL', 'CLIENT']).default('ALL');

export const ticketStatisticsQuerySchema = z.object({
    source: ticketSourceFilterSchema,
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
}).strict().superRefine(({ start, end }, ctx) => {
    const duration = Date.parse(end) - Date.parse(start);
    if (duration <= 0 || duration > 366 * 24 * 60 * 60 * 1000) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end'], message: 'Informe um período positivo de até 366 dias' });
    }
});

export type TicketStatisticsQuery = z.infer<typeof ticketStatisticsQuerySchema>;

export const createTicketSchema = z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().min(1, 'Descrição é obrigatória'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    companyId: z.string().uuid('Company ID inválido').optional(),
    externalUserId: z.string().uuid('External User ID inválido').optional(),
});

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

export const createTicketRatingSchema = z.object({
    rating: z.number().int().min(1, 'A nota mínima é 1 estrela').max(5, 'A nota máxima é 5 estrelas'),
    comment: z.string().max(2000, 'O comentário pode ter no máximo 2000 caracteres').optional(),
}).superRefine((data, ctx) => {
    const comment = data.comment?.trim() ?? '';
    if (data.rating <= 3 && comment.length < 10) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Para notas de 1 a 3 estrelas, descreva o atendimento com pelo menos 10 caracteres',
            path: ['comment'],
        });
    }
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
