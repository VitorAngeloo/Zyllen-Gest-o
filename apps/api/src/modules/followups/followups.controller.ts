import {
    Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request,
    UseInterceptors, UploadedFiles, BadRequestException, Res,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { FollowupsService } from './followups.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import {
    createFollowupSchema,
    updateFollowupSchema,
    createFollowupBlockSchema,
    updateFollowupBlockSchema,
    createFollowupCommentSchema,
    createChecklistItemSchema,
    updateChecklistItemSchema,
} from '@zyllen/shared';

// Ensure uploads directory exists
const UPLOAD_DIR = join(__dirname, '..', '..', '..', 'uploads', 'followups');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const followupStorage = diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const unique = randomUUID();
        const ext = extname(file.originalname) || '.bin';
        cb(null, `${unique}${ext}`);
    },
});

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = /^(image\/(jpeg|png|gif|webp|bmp)|video\/(mp4|webm|quicktime|x-msvideo))$/;

@Controller('followups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FollowupsController {
    constructor(private readonly followupsService: FollowupsService) { }

    // ── CRUD Followup ──

    @Get()
    @RequirePermission('followups.view')
    async findAll(
        @Query('status') status?: string,
        @Query('companyId') companyId?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.followupsService.findAll({
            status, companyId, search,
            skip: (p - 1) * l, take: l,
        });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get(':id')
    @RequirePermission('followups.view')
    async findById(@Param('id') id: string) {
        const data = await this.followupsService.findById(id);
        return { data };
    }

    @Post()
    @RequirePermission('followups.create')
    async create(
        @Request() req: any,
        @Body(new ZodValidationPipe(createFollowupSchema)) body: any,
    ) {
        const data = await this.followupsService.create({
            ...body,
            createdById: req.user.id,
        });
        return { data, message: 'Acompanhamento criado com sucesso' };
    }

    @Put(':id')
    @RequirePermission('followups.edit')
    async update(
        @Param('id') id: string,
        @Request() req: any,
        @Body(new ZodValidationPipe(updateFollowupSchema)) body: any,
    ) {
        const data = await this.followupsService.update(id, req.user.id, body);
        return { data, message: 'Acompanhamento atualizado' };
    }

    @Put(':id/status')
    @RequirePermission('followups.edit')
    async updateStatus(
        @Param('id') id: string,
        @Request() req: any,
        @Body(new ZodValidationPipe(updateFollowupSchema)) body: { status: string },
    ) {
        const data = await this.followupsService.update(id, req.user.id, { status: body.status });
        return { data, message: 'Status atualizado' };
    }

    @Delete(':id')
    @RequirePermission('followups.delete')
    async remove(@Param('id') id: string) {
        await this.followupsService.remove(id);
        return { message: 'Acompanhamento removido' };
    }

    // ── Blocks ──

    @Post(':id/blocks')
    @RequirePermission('followups.edit')
    async addBlock(
        @Param('id') id: string,
        @Request() req: any,
        @Body(new ZodValidationPipe(createFollowupBlockSchema)) body: any,
    ) {
        const data = await this.followupsService.addBlock(id, req.user.id, body);
        return { data, message: 'Bloco adicionado' };
    }

    @Put(':id/blocks/:blockId')
    @RequirePermission('followups.edit')
    async updateBlock(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Request() req: any,
        @Body(new ZodValidationPipe(updateFollowupBlockSchema)) body: any,
    ) {
        const data = await this.followupsService.updateBlock(id, blockId, req.user.id, body);
        return { data, message: 'Bloco atualizado' };
    }

    @Delete(':id/blocks/:blockId')
    @RequirePermission('followups.edit')
    async removeBlock(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Request() req: any,
    ) {
        await this.followupsService.removeBlock(id, blockId, req.user.id);
        return { message: 'Bloco removido' };
    }

    // ── Block Attachments ──

    @Post(':id/blocks/:blockId/attachments')
    @RequirePermission('followups.edit')
    @UseInterceptors(FilesInterceptor('files', 10, { storage: followupStorage, limits: { fileSize: MAX_FILE_SIZE } }))
    async uploadAttachments(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Request() req: any,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException('Nenhum arquivo enviado');
        }
        for (const file of files) {
            if (!ALLOWED_MIME.test(file.mimetype)) {
                throw new BadRequestException(
                    `Tipo não permitido: ${file.originalname}. Use imagens (JPEG, PNG, GIF, WebP, BMP) ou vídeos (MP4, WebM, MOV, AVI).`,
                );
            }
        }
        const attachments = files.map((f) => ({
            fileName: f.originalname,
            filePath: f.filename,
            mimeType: f.mimetype,
        }));
        const data = await this.followupsService.addBlockAttachments(id, blockId, attachments, req.user.id);
        return { data, message: `${files.length} arquivo(s) enviado(s)` };
    }

    @Get(':id/blocks/:blockId/attachments/:attId/file')
    @RequirePermission('followups.view')
    async serveFile(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Param('attId') attId: string,
        @Res() res: Response,
    ) {
        // Simple serve from disk
        const block = await this.followupsService.findById(id);
        const blk = block.blocks.find((b) => b.id === blockId);
        if (!blk) throw new BadRequestException('Bloco não encontrado');
        const att = blk.attachments.find((a) => a.id === attId);
        if (!att) throw new BadRequestException('Anexo não encontrado');

        const filePath = join(UPLOAD_DIR, att.filePath);
        if (!existsSync(filePath)) throw new BadRequestException('Arquivo não encontrado no servidor');

        if (att.mimeType) res.setHeader('Content-Type', att.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${att.fileName}"`);
        return res.sendFile(filePath);
    }

    @Delete(':id/blocks/:blockId/attachments/:attId')
    @RequirePermission('followups.edit')
    async deleteAttachment(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Param('attId') attId: string,
    ) {
        const att = await this.followupsService.removeBlockAttachment(id, blockId, attId);
        try {
            const filePath = join(UPLOAD_DIR, att.filePath);
            if (existsSync(filePath)) unlinkSync(filePath);
        } catch { /* ignore */ }
        return { message: 'Anexo removido' };
    }

    // ── Checklist Items ──

    @Post(':id/blocks/:blockId/checklist')
    @RequirePermission('followups.edit')
    async addChecklistItem(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Body(new ZodValidationPipe(createChecklistItemSchema)) body: { text: string; order?: number },
    ) {
        const data = await this.followupsService.addChecklistItem(id, blockId, body);
        return { data, message: 'Item adicionado' };
    }

    @Put(':id/blocks/:blockId/checklist/:itemId')
    @RequirePermission('followups.edit')
    async updateChecklistItem(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Param('itemId') itemId: string,
        @Body(new ZodValidationPipe(updateChecklistItemSchema)) body: { text?: string; checked?: boolean; order?: number },
    ) {
        const data = await this.followupsService.updateChecklistItem(id, blockId, itemId, body);
        return { data, message: 'Item atualizado' };
    }

    @Delete(':id/blocks/:blockId/checklist/:itemId')
    @RequirePermission('followups.edit')
    async removeChecklistItem(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Param('itemId') itemId: string,
    ) {
        await this.followupsService.removeChecklistItem(id, blockId, itemId);
        return { message: 'Item removido' };
    }

    // ── Comments ──

    @Post(':id/blocks/:blockId/comments')
    @RequirePermission('followups.edit')
    async addComment(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Request() req: any,
        @Body(new ZodValidationPipe(createFollowupCommentSchema)) body: { text: string },
    ) {
        const data = await this.followupsService.addComment(id, blockId, req.user.id, body.text);
        return { data, message: 'Comentário adicionado' };
    }

    // ── History ──

    @Get(':id/history')
    @RequirePermission('followups.view')
    async getHistory(@Param('id') id: string) {
        const data = await this.followupsService.getHistory(id);
        return { data };
    }
}
