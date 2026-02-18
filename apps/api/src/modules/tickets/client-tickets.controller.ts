import {
    Controller, Get, Post, Body, Param, Query, UseGuards, Request,
    ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TicketsService } from '../tickets/tickets.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { createTicketMessageSchema } from '@zyllen/shared';

/**
 * Client-facing ticket endpoints.
 * Only accessible by external (client) users — no permissions guard needed.
 * All queries are scoped to the authenticated user's data.
 */
@Controller('client/tickets')
@UseGuards(JwtAuthGuard)
export class ClientTicketsController {
    constructor(private readonly ticketsService: TicketsService) { }

    private assertExternal(req: any) {
        if (req.user?.type !== 'external') {
            throw new ForbiddenException('Acesso restrito a clientes');
        }
    }

    @Get()
    async myTickets(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        this.assertExternal(req);
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.ticketsService.findAll({
            externalUserId: req.user.id,
            status: status || undefined,
            skip: (p - 1) * l,
            take: l,
        });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get(':id')
    async findOne(@Request() req: any, @Param('id') id: string) {
        this.assertExternal(req);
        const ticket = await this.ticketsService.findById(id);
        // Ensure client can only see their own tickets
        if (ticket.externalUserId !== req.user.id) {
            throw new ForbiddenException('Chamado não pertence a este usuário');
        }
        return { data: ticket };
    }

    @Post()
    async createTicket(
        @Request() req: any,
        @Body() body: { title: string; description: string; priority?: string },
    ) {
        this.assertExternal(req);
        const data = await this.ticketsService.create({
            title: body.title,
            description: body.description,
            companyId: req.user.companyId,
            externalUserId: req.user.id,
            priority: body.priority,
        });
        return { data, message: 'Chamado criado com sucesso' };
    }

    @Post(':id/messages')
    async addMessage(
        @Request() req: any,
        @Param('id') id: string,
        @Body(new ZodValidationPipe(createTicketMessageSchema)) body: { content: string },
    ) {
        this.assertExternal(req);
        // Verify ownership
        const ticket = await this.ticketsService.findById(id);
        if (ticket.externalUserId !== req.user.id) {
            throw new ForbiddenException('Chamado não pertence a este usuário');
        }
        const data = await this.ticketsService.addMessage(id, req.user.id, 'external', body.content);
        return { data };
    }
}
