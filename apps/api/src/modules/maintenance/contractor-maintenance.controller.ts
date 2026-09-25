import {
    Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request,
    ForbiddenException, UseInterceptors, UploadedFiles, BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { verifiedMediaStorage, mediaUploadDirectory } from '../../infrastructure/storage/verified-media-storage';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceMediaStorageService } from '../../infrastructure/storage/maintenance-media-storage.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
    createMaintenanceSchema,
    OS_ATTACHMENT_IMAGE_MAX_BYTES,
    OS_ATTACHMENT_REQUEST_MAX_FILES,
    OS_ATTACHMENT_VIDEO_MAX_BYTES,
    updateOsFormDataSchema,
    updateMaintenanceStatusSchema,
} from '@zyllen/shared';

// Reuse same upload dir as internal controller
const UPLOAD_DIR = mediaUploadDirectory("maintenance");
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const maintenanceStorage = verifiedMediaStorage(UPLOAD_DIR, false, {
    imageBytes: OS_ATTACHMENT_IMAGE_MAX_BYTES,
    videoBytes: OS_ATTACHMENT_VIDEO_MAX_BYTES,
});

const ALLOWED_MIME = /^(image\/(jpeg|png|gif|webp|bmp)|video\/(mp4|webm|quicktime|x-msvideo))$/;

/**
 * Contractor-facing maintenance OS endpoints.
 * Only accessible by contractor users — no permissions guard needed.
 * Contractors can view and manage their own OS records.
 */
@Controller('contractor/maintenance')
@UseGuards(JwtAuthGuard)
export class ContractorMaintenanceController {
    constructor(
        private readonly maintenanceService: MaintenanceService,
        private readonly mediaStorageService: MaintenanceMediaStorageService,
    ) { }

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
    @UseInterceptors(FilesInterceptor('files', OS_ATTACHMENT_REQUEST_MAX_FILES, {
        storage: maintenanceStorage,
        limits: { fileSize: OS_ATTACHMENT_VIDEO_MAX_BYTES },
    }))
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

        const attachments: { fileName: string; filePath: string; mimeType?: string }[] = [];
        const storedPaths: string[] = [];

        try {
            for (const file of files) {
                const storedPath = await this.mediaStorageService.storeUploadedFile(file, id, UPLOAD_DIR);
                storedPaths.push(storedPath);
                attachments.push({
                    fileName: file.originalname,
                    filePath: storedPath,
                    mimeType: file.mimetype,
                });
            }

            await this.maintenanceService.addAttachments(id, attachments, req.user.id);
        } catch (error) {
            for (const storedPath of storedPaths) {
                try {
                    await this.mediaStorageService.deleteStoredFile(storedPath, UPLOAD_DIR);
                } catch {
                    // Ignore rollback cleanup errors and keep original failure.
                }
            }
            throw error;
        }

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
        await this.mediaStorageService.deleteStoredFile(att.filePath, UPLOAD_DIR);
        return { message: 'Anexo removido' };
    }

    // ── Followup Blocks (Acompanhamento de 7 dias) ──

    @Get(':id/followup-blocks')
    async listFollowupBlocks(@Request() req: any, @Param('id') id: string) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) throw new ForbiddenException('OS não pertence a este terceirizado');
        const data = await this.maintenanceService.findFollowupBlocks(id);
        return { data };
    }

    @Post(':id/followup-blocks')
    async addFollowupBlock(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { type: string; content?: string; order?: number },
    ) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) throw new ForbiddenException('OS não pertence a este terceirizado');
        const data = await this.maintenanceService.addFollowupBlock(id, body);
        return { data, message: 'Bloco adicionado' };
    }

    @Put(':id/followup-blocks/:blockId')
    async updateFollowupBlock(
        @Request() req: any,
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Body() body: { content?: string; order?: number },
    ) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) throw new ForbiddenException('OS não pertence a este terceirizado');
        const data = await this.maintenanceService.updateFollowupBlock(id, blockId, body);
        return { data, message: 'Bloco atualizado' };
    }

    @Delete(':id/followup-blocks/:blockId')
    async removeFollowupBlock(
        @Request() req: any,
        @Param('id') id: string,
        @Param('blockId') blockId: string,
    ) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) throw new ForbiddenException('OS não pertence a este terceirizado');
        await this.maintenanceService.removeFollowupBlock(id, blockId);
        return { message: 'Bloco removido' };
    }

    @Post(':id/followup-blocks/:blockId/lock')
    async lockFollowupBlock(
        @Request() req: any,
        @Param('id') id: string,
        @Param('blockId') blockId: string,
    ) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) throw new ForbiddenException('OS não pertence a este terceirizado');
        const data = await this.maintenanceService.lockFollowupBlock(id, blockId);
        return { data, message: 'Assinatura confirmada e bloqueada' };
    }

    @Post(':id/followup-blocks/:blockId/attachments')
    @UseInterceptors(FilesInterceptor('files', OS_ATTACHMENT_REQUEST_MAX_FILES, {
        storage: maintenanceStorage,
        limits: { fileSize: OS_ATTACHMENT_VIDEO_MAX_BYTES },
    }))
    async uploadFollowupAttachments(
        @Request() req: any,
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) throw new ForbiddenException('OS não pertence a este terceirizado');
        if (!files || files.length === 0) throw new BadRequestException('Nenhum arquivo enviado');
        for (const file of files) {
            if (!ALLOWED_MIME.test(file.mimetype)) throw new BadRequestException(`Tipo não permitido: ${file.originalname}`);
        }
        const attachments = files.map((f) => ({
            fileName: f.originalname,
            filePath: f.filename,
            mimeType: f.mimetype,
        }));
        const data = await this.maintenanceService.addFollowupBlockAttachments(id, blockId, attachments);
        return { data, message: `${files.length} arquivo(s) enviado(s)` };
    }

    @Delete(':id/followup-blocks/:blockId/attachments/:attId')
    async deleteFollowupAttachment(
        @Request() req: any,
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Param('attId') attId: string,
    ) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) throw new ForbiddenException('OS não pertence a este terceirizado');
        const att = await this.maintenanceService.removeFollowupBlockAttachment(id, blockId, attId);
        try {
            const filePath = join(UPLOAD_DIR, att.filePath);
            if (existsSync(filePath)) unlinkSync(filePath);
        } catch { /* ignore */ }
        return { message: 'Anexo removido' };
    }
}
