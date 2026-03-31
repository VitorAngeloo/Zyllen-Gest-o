import {
    Controller, Get, Post, Body, Param, Query, UseGuards, Request,
    ForbiddenException, UseInterceptors, UploadedFiles, BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TicketsService } from '../tickets/tickets.service';

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

    // ── Current active ticket ──
    @Get('current')
    async currentTicket(@Request() req: any) {
        this.assertExternal(req);
        const data = await this.ticketsService.findCurrentForUser(req.user.id);
        return { data };
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

    // ── Create ticket with file upload ──
    @Post()
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
    async createTicket(
        @Request() req: any,
        @Body('description') description: string,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        this.assertExternal(req);

        if (!description || description.trim().length < 10) {
            throw new BadRequestException('Descreva o problema com pelo menos 10 caracteres');
        }
        if (!files || files.length === 0) {
            throw new BadRequestException('Anexe pelo menos uma foto ou vídeo do problema');
        }

        const attachments = files.map((f) => ({
            fileName: f.originalname,
            filePath: `/uploads/tickets/${f.filename}`,
        }));

        const data = await this.ticketsService.createWithAttachments({
            description: description.trim(),
            companyId: req.user.companyId,
            externalUserId: req.user.id,
            files: attachments,
        });
        return { data, message: 'Chamado criado com sucesso' };
    }

    // ── Add attachments to existing ticket ──
    @Post(':id/attachments')
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
    async addAttachments(
        @Request() req: any,
        @Param('id') id: string,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        this.assertExternal(req);
        const ticket = await this.ticketsService.findById(id);
        if (ticket.externalUserId !== req.user.id) {
            throw new ForbiddenException('Chamado não pertence a este usuário');
        }
        if (!files || files.length === 0) {
            throw new BadRequestException('Nenhum arquivo enviado');
        }

        const attachments = files.map((f) => ({
            fileName: f.originalname,
            filePath: `/uploads/tickets/${f.filename}`,
        }));

        await this.ticketsService.addAttachments(id, req.user.id, attachments);
        return { message: 'Anexos adicionados com sucesso' };
    }

    // Chat removido do portal cliente — mantido apenas para chamados internos (colaboradores)
    // @Post(':id/messages')
    // async addMessage(...) { ... }
}
