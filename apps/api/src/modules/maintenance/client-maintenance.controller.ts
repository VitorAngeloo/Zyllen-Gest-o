import {
    Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request,
    ForbiddenException, BadRequestException, Res, NotFoundException,
} from '@nestjs/common';
import { join } from 'path';
import { existsSync } from 'fs';
import { extname } from 'path';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MaintenanceService } from './maintenance.service';
import { Public } from '../auth/public.decorator';

const UPLOAD_DIR = join(__dirname, '..', '..', '..', 'uploads', 'maintenance');

/**
 * Client portal — read-only access to OS linked to their company.
 * Clients can also sign and lock SIGNATURE followup blocks.
 */
@Controller('client/maintenance')
@UseGuards(JwtAuthGuard)
export class ClientMaintenanceController {
    constructor(private readonly maintenanceService: MaintenanceService) { }

    private assertExternal(req: any) {
        if (req.user?.type !== 'external') {
            throw new ForbiddenException('Acesso restrito a clientes');
        }
    }

    private assertCompany(req: any) {
        this.assertExternal(req);
        if (!req.user?.companyId) {
            throw new ForbiddenException('Usuário não está vinculado a uma empresa');
        }
    }

    @Get()
    async listMyCompanyOrders(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        this.assertCompany(req);
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(50, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.maintenanceService.findAll({
            companyId: req.user.companyId,
            formType: 'INSTALACAO_SALA',
            status: status || undefined,
            skip: (p - 1) * l,
            take: l,
        });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get(':id')
    async findOne(@Request() req: any, @Param('id') id: string) {
        this.assertCompany(req);
        const os = await this.maintenanceService.findById(id);
        if (os.companyId !== req.user.companyId) throw new ForbiddenException('OS não pertence à sua empresa');
        if (os.formType !== 'INSTALACAO_SALA') throw new ForbiddenException('Tipo de OS não disponível no portal');
        return { data: os };
    }

    @Get(':id/followup-blocks')
    async listFollowupBlocks(@Request() req: any, @Param('id') id: string) {
        this.assertCompany(req);
        const os = await this.maintenanceService.findById(id);
        if (os.companyId !== req.user.companyId) throw new ForbiddenException('OS não pertence à sua empresa');
        const data = await this.maintenanceService.findFollowupBlocks(id);
        return { data };
    }

    // Clients can only update SIGNATURE blocks (to draw their signature)
    @Put(':id/followup-blocks/:blockId')
    async signBlock(
        @Request() req: any,
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Body() body: { content?: string },
    ) {
        this.assertCompany(req);
        const os = await this.maintenanceService.findById(id);
        if (os.companyId !== req.user.companyId) throw new ForbiddenException('OS não pertence à sua empresa');
        const blocks = await this.maintenanceService.findFollowupBlocks(id);
        const block = blocks.find((b: any) => b.id === blockId);
        if (!block) throw new BadRequestException('Bloco não encontrado');
        if (block.type !== 'SIGNATURE') throw new ForbiddenException('Clientes só podem assinar blocos de assinatura');
        const data = await this.maintenanceService.updateFollowupBlock(id, blockId, { content: body.content });
        return { data, message: 'Assinatura salva' };
    }

    // Client signs the witnessSignature field in formData
    @Put(':id/witness-signature')
    async signWitness(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { signature: string },
    ) {
        this.assertCompany(req);
        if (!body.signature) throw new BadRequestException('Assinatura é obrigatória');
        const data = await this.maintenanceService.clientSignWitness(id, req.user.companyId, body.signature);
        return { data, message: 'Assinatura salva com sucesso' };
    }

    @Post(':id/followup-blocks/:blockId/lock')
    async lockBlock(
        @Request() req: any,
        @Param('id') id: string,
        @Param('blockId') blockId: string,
    ) {
        this.assertCompany(req);
        const os = await this.maintenanceService.findById(id);
        if (os.companyId !== req.user.companyId) throw new ForbiddenException('OS não pertence à sua empresa');
        const data = await this.maintenanceService.lockFollowupBlock(id, blockId);
        return { data, message: 'Assinatura confirmada e bloqueada' };
    }

    // Public file serve — no auth required (URL is not guessable)
    @Get(':id/attachments/:attachmentId/file')
    @Public()
    async serveFile(
        @Param('id') id: string,
        @Param('attachmentId') attachmentId: string,
        @Res() res: Response,
    ) {
        const attachments = await this.maintenanceService.findAttachments(id);
        const att = attachments.find((a) => a.id === attachmentId);
        if (!att) throw new BadRequestException('Anexo não encontrado');

        const filePath = join(UPLOAD_DIR, att.filePath);
        if (!existsSync(filePath)) throw new BadRequestException('Arquivo não encontrado no servidor');

        const EXT_MIME: Record<string, string> = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
            '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
        };
        const mime = att.mimeType || EXT_MIME[extname(att.fileName).toLowerCase()] || 'application/octet-stream';
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `inline; filename="${att.fileName}"`);
        return res.sendFile(filePath);
    }

    @Get(':id/followup-blocks/:blockId/attachments/:attId/file')
    @Public()
    async serveFollowupFile(
        @Param('id') id: string,
        @Param('blockId') blockId: string,
        @Param('attId') attId: string,
        @Res() res: Response,
    ) {
        const blocks = await this.maintenanceService.findFollowupBlocks(id);
        const block = blocks.find((b: any) => b.id === blockId);
        if (!block) throw new BadRequestException('Bloco não encontrado');
        const att = block.attachments.find((a: any) => a.id === attId);
        if (!att) throw new BadRequestException('Anexo não encontrado');

        const filePath = join(UPLOAD_DIR, att.filePath);
        if (!existsSync(filePath)) throw new BadRequestException('Arquivo não encontrado no servidor');

        const EXT_MIME: Record<string, string> = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
            '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
        };
        const mime = att.mimeType || EXT_MIME[extname(att.fileName).toLowerCase()] || 'application/octet-stream';
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `inline; filename="${att.fileName}"`);
        return res.sendFile(filePath);
    }
}
