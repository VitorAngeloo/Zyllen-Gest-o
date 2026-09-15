import {
    Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request,
    UseInterceptors, UploadedFiles, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { verifiedMediaStorage, mediaUploadDirectory } from '../media/media-storage';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { AccessService } from '../access/access.service';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceMediaStorageService } from './maintenance-media-storage.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { createMaintenanceSchema, updateMaintenanceStatusSchema, updateOsFormDataSchema } from '@zyllen/shared';

// Ensure uploads directory exists
const UPLOAD_DIR = mediaUploadDirectory("maintenance");
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const maintenanceStorage = verifiedMediaStorage(UPLOAD_DIR);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = /^(image\/(jpeg|png|gif|webp|bmp)|video\/(mp4|webm|quicktime|x-msvideo))$/;

@Controller('maintenance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaintenanceController {
    constructor(
        private readonly maintenanceService: MaintenanceService,
        private readonly mediaStorageService: MaintenanceMediaStorageService,
        private readonly accessService: AccessService,
    ) { }

    @Get('my-orders')
    @RequirePermission('maintenance.view')
    async myOrders(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.maintenanceService.findAll({ openedById: req.user.id, status, skip: (p - 1) * l, take: l });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get()
    @RequirePermission('maintenance.view')
    async findAll(
        @Query('status') status?: string,
        @Query('formType') formType?: string,
        @Query('assetId') assetId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.maintenanceService.findAll({ status, formType, assetId, skip: (p - 1) * l, take: l });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get(':id')
    @RequirePermission('maintenance.view')
    async findById(@Param('id') id: string) {
        const data = await this.maintenanceService.findById(id);
        return { data };
    }

    @Post()
    @RequirePermission('maintenance.open')
    async open(@Request() req: any, @Body(new ZodValidationPipe(createMaintenanceSchema)) body: any) {
        const data = await this.maintenanceService.openOS({
            ...body,
            openedById: req.user.id,
        });
        return { data, message: 'OS aberta com sucesso' };
    }

    @Put(':id/status')
    @RequirePermission('maintenance.execute')
    async updateStatus(
        @Param('id') id: string,
        @Request() req: any,
        @Body(new ZodValidationPipe(updateMaintenanceStatusSchema)) body: { status: string; notes?: string },
    ) {
        if (body.status === 'CLOSED' && req.user.role?.name !== 'Administrador' &&
            !await this.accessService.userHasPermission(req.user.id, 'maintenance', 'close')) {
            throw new ForbiddenException('Permissão maintenance.close necessária para encerrar a OS');
        }
        const data = await this.maintenanceService.updateStatus(id, body.status, req.user.id, body.notes);
        return { data, message: 'OS atualizada' };
    }

    @Put(':id/form-data')
    @RequirePermission('maintenance.execute')
    async updateFormData(
        @Param('id') id: string,
        @Request() req: any,
        @Body(new ZodValidationPipe(updateOsFormDataSchema)) body: any,
    ) {
        const data = await this.maintenanceService.updateFormData(id, req.user.id, body);
        return { data, message: 'Dados atualizados' };
    }

    // ── Attachments (photos/videos) ──

    @Post(':id/attachments')
    @RequirePermission(['maintenance.open', 'maintenance.execute'])
    @UseInterceptors(FilesInterceptor('files', 10, { storage: maintenanceStorage, limits: { fileSize: MAX_FILE_SIZE } }))
    async uploadAttachments(
        @Param('id') id: string,
        @Request() req: any,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException('Nenhum arquivo enviado');
        }
        // Validate MIME types
        for (const file of files) {
            if (!ALLOWED_MIME.test(file.mimetype)) {
                throw new BadRequestException(`Tipo de arquivo não permitido: ${file.originalname}. Use imagens (JPEG, PNG, GIF, WebP, BMP) ou vídeos (MP4, WebM, MOV, AVI).`);
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
    @RequirePermission('maintenance.view')
    async listAttachments(@Param('id') id: string) {
        const data = await this.maintenanceService.findAttachments(id);
        return { data };
    }

    @Delete(':id/attachments/:attachmentId')
    @RequirePermission('maintenance.execute')
    async deleteAttachment(
        @Param('id') id: string,
        @Param('attachmentId') attachmentId: string,
    ) {
        const att = await this.maintenanceService.deleteAttachment(id, attachmentId);
        await this.mediaStorageService.deleteStoredFile(att.filePath, UPLOAD_DIR);
        return { message: 'Anexo removido' };
    }

    // ── Followup Blocks (Acompanhamento de 7 dias) ──

    @Get(':id/followup-blocks')
    @RequirePermission('maintenance.view')
    async listFollowupBlocks(@Param('id') id: string) {
        const data = await this.maintenanceService.findFollowupBlocks(id);
        return { data };
    }

    @Post(':id/followup-blocks')
    @RequirePermission('maintenance.execute')
    async addFollowupBlock(
        @Param('id') id: string,
        @Body() body: { type: string; content?: string; order?: number },
    ) {
        const data = await this.maintenanceService.addFollowupBlock(id, body);
        return { data, message: 'Bloco adicionado' };
    }

    @Put(':id/followup-blocks/:blockId')
    @RequirePermission('maintenance.execute')
    async updateFollowupBlock(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Body() body: { content?: string; order?: number },
    ) {
        const data = await this.maintenanceService.updateFollowupBlock(id, blockId, body);
        return { data, message: 'Bloco atualizado' };
    }

    @Delete(':id/followup-blocks/:blockId')
    @RequirePermission('maintenance.execute')
    async removeFollowupBlock(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
    ) {
        await this.maintenanceService.removeFollowupBlock(id, blockId);
        return { message: 'Bloco removido' };
    }

    @Post(':id/followup-blocks/:blockId/lock')
    @RequirePermission('maintenance.execute')
    async lockFollowupBlock(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
    ) {
        const data = await this.maintenanceService.lockFollowupBlock(id, blockId);
        return { data, message: 'Assinatura confirmada e bloqueada' };
    }

    @Post(':id/followup-blocks/:blockId/attachments')
    @RequirePermission('maintenance.execute')
    @UseInterceptors(FilesInterceptor('files', 10, { storage: maintenanceStorage, limits: { fileSize: MAX_FILE_SIZE } }))
    async uploadFollowupAttachments(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        if (!files || files.length === 0) throw new BadRequestException('Nenhum arquivo enviado');
        for (const file of files) {
            if (!ALLOWED_MIME.test(file.mimetype)) {
                throw new BadRequestException(`Tipo não permitido: ${file.originalname}`);
            }
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
    @RequirePermission('maintenance.execute')
    async deleteFollowupAttachment(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Param('attId') attId: string,
    ) {
        const att = await this.maintenanceService.removeFollowupBlockAttachment(id, blockId, attId);
        try {
            const filePath = join(UPLOAD_DIR, att.filePath);
            if (existsSync(filePath)) unlinkSync(filePath);
        } catch { /* ignore */ }
        return { message: 'Anexo removido' };
    }
}
