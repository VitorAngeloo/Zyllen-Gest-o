import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    UseInterceptors,
    UploadedFiles,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { InventoryService } from './inventory.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import {
    createStockEntrySchema,
    createStockExitSchema,
    approvalActionSchema,
    createMovementTypeSchema,
    reversalReasonSchema,
} from '@zyllen/shared';

const UPLOAD_DIR = join(__dirname, '..', '..', '..', 'uploads', 'media', 'inventory-entry');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const mediaStorage = diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = extname(file.originalname) || '.bin';
        cb(null, `${randomUUID()}${ext}`);
    },
});

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME = /^(image\/(jpeg|png|webp)|video\/(mp4|quicktime|webm))$/;
const ALLOWED_ROLES = new Set(['Administrador', 'Gestor', 'Técnico']);

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    // ── Stock Entry ──
    @Post('entry')
    @RequirePermission('inventory.bipar_entrada')
    @UseInterceptors(FilesInterceptor('files', 10, { storage: mediaStorage, limits: { fileSize: MAX_FILE_SIZE } }))
    async createEntry(
        @Request() req: any,
        @Body(new ZodValidationPipe(createStockEntrySchema)) body: {
            skuId: string;
            toLocationId?: string;
            qty: number;
            movementTypeId: string;
            pin: string;
            reason?: string;
            assetId?: string;
        },
        @UploadedFiles() files?: Express.Multer.File[],
    ) {
        if (files?.length && !ALLOWED_ROLES.has(req.user?.role?.name)) {
            throw new ForbiddenException('Apenas Técnico, Gestor e Administrador podem enviar anexos de mídia');
        }

        for (const file of files ?? []) {
            if (!ALLOWED_MIME.test(file.mimetype)) {
                throw new BadRequestException(
                    `Tipo não permitido: ${file.originalname}. Use JPG, PNG, WEBP, MP4, MOV ou WEBM.`,
                );
            }
        }

        const data = await this.inventoryService.createEntry({
            ...body,
            userId: req.user.id,
            attachments: (files ?? []).map((file) => ({
                fileName: file.originalname,
                filePath: `/uploads/media/inventory-entry/${file.filename}`,
                mimeType: file.mimetype,
                mediaType: file.mimetype.startsWith('image/') ? 'IMAGE' : 'VIDEO',
                uploadedById: req.user.id,
            })),
        });
        return { data, message: 'Entrada registrada com sucesso' };
    }

    // ── Stock Exit ──
    @Post('exit')
    @RequirePermission('inventory.bipar_saida')
    async createExit(
        @Request() req: any,
        @Body(new ZodValidationPipe(createStockExitSchema)) body: {
            skuId: string;
            fromLocationId: string;
            qty: number;
            movementTypeId: string;
            pin: string;
            reason?: string;
            assetId?: string;
        },
    ) {
        const data = await this.inventoryService.createExit({ ...body, userId: req.user.id });
        return { data };
    }

    // ── Approve Exit ──
    @Post('approvals/:id/approve')
    @RequirePermission('approvals.approve')
    @HttpCode(HttpStatus.OK)
    async approveExit(@Param('id') id: string, @Request() req: any, @Body(new ZodValidationPipe(approvalActionSchema)) body: { pin: string }) {
        const data = await this.inventoryService.approveExit(id, req.user.id, body.pin);
        return { data, message: 'Saída aprovada' };
    }

    // ── Reject Exit ──
    @Post('approvals/:id/reject')
    @RequirePermission('approvals.reject')
    @HttpCode(HttpStatus.OK)
    async rejectExit(@Param('id') id: string, @Request() req: any, @Body(new ZodValidationPipe(approvalActionSchema)) body: { pin: string }) {
        const data = await this.inventoryService.rejectExit(id, req.user.id, body.pin);
        return { data };
    }

    // ── Request Reversal ──
    @Post('movements/:id/reversal')
    @RequirePermission('inventory.historico')
    async requestReversal(@Param('id') id: string, @Request() req: any, @Body(new ZodValidationPipe(reversalReasonSchema)) body: { reason: string }) {
        const data = await this.inventoryService.requestReversal(id, req.user.id, body.reason);
        return { data };
    }

    // ── Approve Reversal ──
    @Post('reversals/:id/approve')
    @RequirePermission('approvals.approve')
    @HttpCode(HttpStatus.OK)
    async approveReversal(@Param('id') id: string, @Request() req: any, @Body(new ZodValidationPipe(approvalActionSchema)) body: { pin: string }) {
        const data = await this.inventoryService.approveReversal(id, req.user.id, body.pin);
        return { data, message: 'Reversão aprovada' };
    }

    // ── Pending Approvals ──
    @Get('approvals/pending')
    @RequirePermission('approvals.view')
    async getPendingApprovals() {
        const data = await this.inventoryService.getPendingApprovals();
        return { data };
    }

    // ── Movements History ──
    @Get('movements')
    @RequirePermission('inventory.historico')
    async findAllMovements(
        @Query('skuId') skuId?: string,
        @Query('locationId') locationId?: string,
        @Query('typeId') typeId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.inventoryService.findAllMovements({ skuId, locationId, typeId, skip: (p - 1) * l, take: l });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    // ── Stock Balances ──
    @Get('balances')
    @RequirePermission('inventory.view')
    async getBalances(
        @Query('locationId') locationId?: string,
        @Query('skuId') skuId?: string,
    ) {
        const data = await this.inventoryService.getBalances({ locationId, skuId });
        return { data };
    }

    // ── Movement Types CRUD ──
    @Get('movement-types')
    @RequirePermission('inventory.view')
    async findMovementTypes() {
        const data = await this.inventoryService.findAllMovementTypes();
        return { data };
    }

    @Post('movement-types')
    @RequirePermission('settings.manage')
    async createMovementType(@Body(new ZodValidationPipe(createMovementTypeSchema)) body: { name: string; requiresApproval?: boolean; isFinalWriteOff?: boolean; setsAssetStatus?: string }) {
        const data = await this.inventoryService.createMovementType(body);
        return { data, message: 'Tipo criado' };
    }

    @Put('movement-types/:id')
    @RequirePermission('settings.manage')
    async updateMovementType(@Param('id') id: string, @Body() body: { name?: string; requiresApproval?: boolean; isFinalWriteOff?: boolean; setsAssetStatus?: string }) {
        const data = await this.inventoryService.updateMovementType(id, body);
        return { data, message: 'Tipo atualizado' };
    }

    @Delete('movement-types/:id')
    @RequirePermission('settings.manage')
    async deleteMovementType(@Param('id') id: string) {
        await this.inventoryService.deleteMovementType(id);
        return { message: 'Tipo excluído' };
    }
}
