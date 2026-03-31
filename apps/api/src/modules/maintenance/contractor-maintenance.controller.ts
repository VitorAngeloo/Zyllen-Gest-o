import {
    Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request,
    ForbiddenException, UseInterceptors, UploadedFiles, BadRequestException, Res,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MaintenanceService } from './maintenance.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { createMaintenanceSchema, updateOsFormDataSchema, updateMaintenanceStatusSchema } from '@zyllen/shared';

// Reuse same upload dir as internal controller
const UPLOAD_DIR = join(__dirname, '..', '..', '..', 'uploads', 'maintenance');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const maintenanceStorage = diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const unique = randomUUID();
        const ext = extname(file.originalname) || '.bin';
        cb(null, `${unique}${ext}`);
    },
});

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME = /^(image\/(jpeg|png|gif|webp|bmp)|video\/(mp4|webm|quicktime|x-msvideo))$/;

/**
 * Contractor-facing maintenance OS endpoints.
 * Only accessible by contractor users — no permissions guard needed.
 * Contractors can view and manage their own OS records.
 */
@Controller('contractor/maintenance')
@UseGuards(JwtAuthGuard)
export class ContractorMaintenanceController {
    constructor(private readonly maintenanceService: MaintenanceService) { }

    private assertContractor(req: any) {
        if (req.user?.type !== 'contractor') {
            throw new ForbiddenException('Acesso restrito a terceirizados');
        }
    }

    @Get()
    async myOrders(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        this.assertContractor(req);
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.maintenanceService.findAll({
            openedByContractorId: req.user.id,
            status: status || undefined,
            skip: (p - 1) * l,
            take: l,
        });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get(':id')
    async findOne(@Request() req: any, @Param('id') id: string) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) {
            throw new ForbiddenException('OS não pertence a este terceirizado');
        }
        return { data: os };
    }

    @Post()
    async openOS(
        @Request() req: any,
        @Body(new ZodValidationPipe(createMaintenanceSchema)) body: {
            assetId?: string;
            notes?: string;
            formType?: string;
            clientName?: string;
            clientCity?: string;
            clientState?: string;
            location?: string;
            startedAt?: string;
            endedAt?: string;
            scheduledDate?: string;
            formData?: Record<string, unknown>;
        },
    ) {
        this.assertContractor(req);
        const data = await this.maintenanceService.openOS({
            assetId: body.assetId,
            openedByContractorId: req.user.id,
            notes: body.notes,
            formType: body.formType || 'TERCEIRIZADO',
            clientName: body.clientName,
            clientCity: body.clientCity,
            clientState: body.clientState,
            location: body.location,
            startedAt: body.startedAt,
            endedAt: body.endedAt,
            scheduledDate: body.scheduledDate,
            formData: body.formData,
        });
        return { data, message: 'OS aberta com sucesso' };
    }

    @Put(':id/form-data')
    async updateFormData(
        @Request() req: any,
        @Param('id') id: string,
        @Body(new ZodValidationPipe(updateOsFormDataSchema)) body: {
            formData: Record<string, unknown>;
            notes?: string;
            clientName?: string;
            clientCity?: string;
            clientState?: string;
            location?: string;
            startedAt?: string;
            endedAt?: string;
        },
    ) {
        this.assertContractor(req);
        const data = await this.maintenanceService.updateFormData(id, req.user.id, body, true);
        return { data, message: 'Dados atualizados' };
    }

    @Put(':id/status')
    async updateStatus(
        @Request() req: any,
        @Param('id') id: string,
        @Body(new ZodValidationPipe(updateMaintenanceStatusSchema)) body: { status: string; notes?: string },
    ) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) {
            throw new ForbiddenException('OS não pertence a este terceirizado');
        }
        // Contractors can only update to IN_PROGRESS (not close)
        if (body.status === 'CLOSED') {
            throw new ForbiddenException('Terceirizados não podem encerrar OS. Solicite o encerramento a um colaborador.');
        }
        const data = await this.maintenanceService.updateStatus(id, body.status, req.user.id, body.notes, true);
        return { data, message: 'OS atualizada' };
    }

    // ── Attachments (photos/videos) ──

    @Post(':id/attachments')
    @UseInterceptors(FilesInterceptor('files', 10, { storage: maintenanceStorage, limits: { fileSize: MAX_FILE_SIZE } }))
    async uploadAttachments(
        @Param('id') id: string,
        @Request() req: any,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) {
            throw new ForbiddenException('OS não pertence a este terceirizado');
        }
        if (!files || files.length === 0) {
            throw new BadRequestException('Nenhum arquivo enviado');
        }
        for (const file of files) {
            if (!ALLOWED_MIME.test(file.mimetype)) {
                throw new BadRequestException(`Tipo de arquivo não permitido: ${file.originalname}`);
            }
        }
        const attachments = files.map((f) => ({
            fileName: f.originalname,
            filePath: f.filename,
            mimeType: f.mimetype,
        }));
        await this.maintenanceService.addAttachments(id, attachments, req.user.id);
        const all = await this.maintenanceService.findAttachments(id);
        return { data: all, message: `${files.length} arquivo(s) enviado(s)` };
    }

    @Get(':id/attachments')
    async listAttachments(@Request() req: any, @Param('id') id: string) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) {
            throw new ForbiddenException('OS não pertence a este terceirizado');
        }
        const data = await this.maintenanceService.findAttachments(id);
        return { data };
    }

    @Get(':id/attachments/:attachmentId/file')
    async serveFile(
        @Request() req: any,
        @Param('id') id: string,
        @Param('attachmentId') attachmentId: string,
        @Res() res: Response,
    ) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) {
            throw new ForbiddenException('OS não pertence a este terceirizado');
        }
        const attachments = await this.maintenanceService.findAttachments(id);
        const att = attachments.find((a) => a.id === attachmentId);
        if (!att) throw new BadRequestException('Anexo não encontrado');

        const filePath = join(UPLOAD_DIR, att.filePath);
        if (!existsSync(filePath)) throw new BadRequestException('Arquivo não encontrado no servidor');

        if (att.mimeType) res.setHeader('Content-Type', att.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${att.fileName}"`);
        return res.sendFile(filePath);
    }

    @Delete(':id/attachments/:attachmentId')
    async deleteAttachment(
        @Request() req: any,
        @Param('id') id: string,
        @Param('attachmentId') attachmentId: string,
    ) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) {
            throw new ForbiddenException('OS não pertence a este terceirizado');
        }
        const att = await this.maintenanceService.deleteAttachment(id, attachmentId);
        try {
            const filePath = join(UPLOAD_DIR, att.filePath);
            if (existsSync(filePath)) unlinkSync(filePath);
        } catch { /* ignore */ }
        return { message: 'Anexo removido' };
    }
}
