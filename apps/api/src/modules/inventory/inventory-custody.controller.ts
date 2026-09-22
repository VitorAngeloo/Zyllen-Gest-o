import { Controller, Get, Post, Query, Body, Param, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { custodyQuerySchema, inventoryTransferSchema, uninstallationReviewSchema, CustodyQuery, InventoryTransferInput, UninstallationReviewInput } from '@zyllen/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { InventoryCustodyService } from './inventory-custody.service';
import { InventoryUninstallationService } from './inventory-uninstallation.service';

@Controller('inventory/custody')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryCustodyController {
    constructor(private readonly custody: InventoryCustodyService, private readonly uninstallations: InventoryUninstallationService) {}
    @Get('uninstallations/:locationId') @RequirePermission('inventory.view')
    async uninstallation(@Param('locationId') locationId: string) { return { data: await this.uninstallations.snapshot(locationId) }; }
    @Post('uninstallations/:locationId') @RequirePermission('inventory.bipar_saida')
    async requestUninstallation(@Param('locationId') locationId: string, @Request() req: any,
        @Body(new ZodValidationPipe(uninstallationReviewSchema)) body: UninstallationReviewInput) {
        return { data: await this.uninstallations.request(locationId, body, req.user.id) };
    }
    @Get('options') @RequirePermission('inventory.view')
    async options() { return { data: await this.custody.options() }; }
    @Get('assets') @RequirePermission('inventory.view')
    assets(@Query(new ZodValidationPipe(custodyQuerySchema)) query: CustodyQuery) { return this.custody.assets(query); }
    @Get('transfers') @RequirePermission('inventory.historico')
    history(@Query(new ZodValidationPipe(custodyQuerySchema)) query: CustodyQuery) { return this.custody.history(query); }
    @Post('transfers') @RequirePermission('inventory.bipar_saida')
    async create(@Request() req: any, @Body(new ZodValidationPipe(inventoryTransferSchema)) body: InventoryTransferInput) {
        if (body.kind === 'RETURN') throw new BadRequestException('Registre a devolução na rota de entradas');
        return { data: await this.custody.create(body, req.user.id) };
    }
    @Post('returns') @RequirePermission('inventory.bipar_entrada')
    async returnAssets(@Request() req: any, @Body(new ZodValidationPipe(inventoryTransferSchema)) body: InventoryTransferInput) {
        if (body.kind !== 'RETURN') throw new BadRequestException('Esta rota recebe apenas devoluções');
        return { data: await this.custody.create(body, req.user.id) };
    }
}
