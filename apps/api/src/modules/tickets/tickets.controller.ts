import {
    Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request,
    UseInterceptors, UploadedFiles, BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { TicketsService } from './tickets.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import {
    createTicketSchema, assignTicketSchema, updateTicketStatusSchema,
    createTicketMessageSchema, assignTicketWithPinSchema,
    closeTicketWithPinSchema, reassignTicketSchema,
    createInternalTicketSchema, createTicketRatingSchema,
} from '@zyllen/shared';

// Ensure uploads directory exists
const UPLOAD_DIR = join(__dirname, '..', '..', '..', 'uploads', 'tickets');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const ticketStorage = diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const unique = randomUUID();
        const ext = extname(file.originalname) || '.bin';
        cb(null, `${unique}${ext}`);
    },
});

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = /^(image\/(jpeg|png|gif|webp|bmp)|video\/(mp4|webm|quicktime|x-msvideo))$/;

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

    @Get('internal-users')
    @RequirePermission('tickets.view')
    async listInternalUsers() {
        const data = await this.ticketsService.listInternalUsers();
        return { data };
    }

    @Get('my-internal')
    async myInternalTickets(@Request() req: any) {
        const data = await this.ticketsService.findMyInternalTickets(req.user.id);
        return { data };
    }

    @Get('my-internal/pending-rating')
    async pendingInternalRating(@Request() req: any) {
        const data = await this.ticketsService.findPendingRatingForInternalUser(req.user.id);
        return { data };
    }

    @Post('internal')
    @UseInterceptors(FilesInterceptor('files', 10, {
        storage: ticketStorage,
        limits: { fileSize: MAX_FILE_SIZE },
        fileFilter: (_req, file, cb) => {
            if (ALLOWED_MIME.test(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`), false);
            }
        },
    }))
    async createInternal(
        @Request() req: any,
        @Body() body: any,
        @UploadedFiles() files?: Express.Multer.File[],
    ) {
        const title = body.title?.trim();
        const description = body.description?.trim();
        const priority = body.priority || 'MEDIUM';

        if (!title) throw new BadRequestException('Título é obrigatório');
        if (!description || description.length < 10) throw new BadRequestException('Descrição deve ter no mínimo 10 caracteres');

        const attachments = files?.map((f) => ({
            fileName: f.originalname,
            filePath: `/uploads/tickets/${f.filename}`,
        })) ?? [];

        const data = await this.ticketsService.createInternalTicket({
            title, description, priority,
            internalUserId: req.user.id,
            files: attachments,
        });
        return { data, message: 'Chamado TI criado com sucesso' };
    }

    @Get(':id')
    @RequirePermission('tickets.view')
    async findById(@Param('id') id: string) {
        const data = await this.ticketsService.findById(id);
        return { data };
    }

    @Post()
    @RequirePermission('tickets.triage')
    @UseInterceptors(FilesInterceptor('files', 10, {
        storage: ticketStorage,
        limits: { fileSize: MAX_FILE_SIZE },
        fileFilter: (_req, file, cb) => {
            if (ALLOWED_MIME.test(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`), false);
            }
        },
    }))
    async create(
        @Body() body: any,
        @UploadedFiles() files?: Express.Multer.File[],
    ) {
        // Validate required fields manually (multipart sends strings)
        const title = body.title?.trim();
        const description = body.description?.trim();
        const companyId = body.companyId;
        const externalUserId = body.externalUserId;
        const priority = body.priority || 'MEDIUM';

        if (!title) throw new BadRequestException('Título é obrigatório');
        if (!description) throw new BadRequestException('Descrição é obrigatória');

        const ticket = await this.ticketsService.create({
            title, description, companyId, externalUserId, priority,
        });

        // If files were uploaded, create attachments
        if (files && files.length > 0) {
            const attachments = files.map((f) => ({
                fileName: f.originalname,
                filePath: `/uploads/tickets/${f.filename}`,
            }));
            await this.ticketsService.addAttachments(ticket.id, null, attachments);
        }

        // Re-fetch with attachments included
        const data = await this.ticketsService.findById(ticket.id);
        return { data, message: 'Chamado criado' };
    }

    @Put(':id/assign')
    @RequirePermission('tickets.assign')
    async assign(@Param('id') id: string, @Body(new ZodValidationPipe(assignTicketSchema)) body: { assignedToId: string }) {
        const data = await this.ticketsService.assign(id, body.assignedToId);
        return { data, message: 'Chamado atribuído' };
    }

    @Put(':id/assign-with-pin')
    @RequirePermission('tickets.view')
    async assignWithPin(
        @Param('id') id: string,
        @Request() req: any,
        @Body(new ZodValidationPipe(assignTicketWithPinSchema)) body: { pin: string; assignedToId?: string },
    ) {
        const data = await this.ticketsService.assignWithPin(
            id, req.user.id, req.user.role.name, body.pin, body.assignedToId,
        );
        return { data, message: 'Chamado atribuído' };
    }

    @Put(':id/close-with-pin')
    @RequirePermission('tickets.view')
    async closeWithPin(
        @Param('id') id: string,
        @Request() req: any,
        @Body(new ZodValidationPipe(closeTicketWithPinSchema)) body: { pin: string; resolutionNotes: string },
    ) {
        const data = await this.ticketsService.closeWithPin(
            id, req.user.id, req.user.role.name, body.pin, body.resolutionNotes,
        );
        return { data, message: 'Chamado encerrado' };
    }

    @Put(':id/reassign')
    @RequirePermission('tickets.triage')
    async reassign(
        @Param('id') id: string,
        @Request() req: any,
        @Body(new ZodValidationPipe(reassignTicketSchema)) body: { pin: string; assignedToId: string },
    ) {
        const data = await this.ticketsService.reassign(
            id, req.user.id, req.user.role.name, body.pin, body.assignedToId,
        );
        return { data, message: 'Chamado reatribuído' };
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

    @Post('my-internal/:id/messages')
    async addInternalMessage(
        @Param('id') id: string,
        @Request() req: any,
        @Body(new ZodValidationPipe(createTicketMessageSchema)) body: { content: string },
    ) {
        const data = await this.ticketsService.addInternalMessage(id, req.user.id, body.content);
        return { data };
    }

    @Post('my-internal/:id/rating')
    async submitInternalTicketRating(
        @Param('id') id: string,
        @Request() req: any,
        @Body(new ZodValidationPipe(createTicketRatingSchema)) body: { rating: number; comment?: string },
    ) {
        const data = await this.ticketsService.submitTicketRating(id, req.user.id, body);
        return { data, message: 'Avaliação enviada com sucesso' };
    }
}
