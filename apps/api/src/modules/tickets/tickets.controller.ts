import {
    Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { TicketsService } from './tickets.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { createTicketSchema, assignTicketSchema, updateTicketStatusSchema, createTicketMessageSchema } from '@zyllen/shared';

@Controller('tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TicketsController {
    constructor(private readonly ticketsService: TicketsService) { }

    @Get()
    @RequirePermission('tickets.view')
    async findAll(
        @Query('status') status?: string,
        @Query('companyId') companyId?: string,
        @Query('assignedToId') assignedToId?: string,
        @Query('externalUserId') externalUserId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.ticketsService.findAll({ status, companyId, assignedToId, externalUserId, skip: (p - 1) * l, take: l });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get(':id')
    @RequirePermission('tickets.view')
    async findById(@Param('id') id: string) {
        const data = await this.ticketsService.findById(id);
        return { data };
    }

    @Post()
    @RequirePermission('tickets.triage')
    async create(@Body(new ZodValidationPipe(createTicketSchema)) body: { title: string; description: string; companyId: string; externalUserId: string; priority?: string }) {
        const data = await this.ticketsService.create(body);
        return { data, message: 'Chamado criado' };
    }

    @Put(':id/assign')
    @RequirePermission('tickets.assign')
    async assign(@Param('id') id: string, @Body(new ZodValidationPipe(assignTicketSchema)) body: { assignedToId: string }) {
        const data = await this.ticketsService.assign(id, body.assignedToId);
        return { data, message: 'Chamado atribuído' };
    }

    @Put(':id/status')
    @RequirePermission('tickets.triage')
    async changeStatus(@Param('id') id: string, @Body(new ZodValidationPipe(updateTicketStatusSchema)) body: { status: string }) {
        const data = await this.ticketsService.changeStatus(id, body.status);
        return { data, message: 'Status atualizado' };
    }

    @Post(':id/messages')
    @RequirePermission('tickets.view')
    async addMessage(@Param('id') id: string, @Request() req: any, @Body(new ZodValidationPipe(createTicketMessageSchema)) body: { content: string }) {
        const data = await this.ticketsService.addMessage(id, req.user.id, 'internal', body.content);
        return { data };
    }
}
