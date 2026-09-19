import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { inventoryStatisticsQuerySchema, InventoryStatisticsQuery, stockMinimumSchema, StockMinimumInput } from '@zyllen/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { InventoryStatisticsService } from './inventory-statistics.service';
@Controller('inventory') @UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryStatisticsController {
    constructor(private readonly stats: InventoryStatisticsService) {}
    @Get('statistics') @RequirePermission('inventory.view')
    async statistics(@Query(new ZodValidationPipe(inventoryStatisticsQuerySchema)) query: InventoryStatisticsQuery) { return { data: await this.stats.statistics(query) }; }
    @Get('minimum-options') @RequirePermission('inventory.view')
    async options() { return { data: await this.stats.options() }; }
    @Get('minimums') @RequirePermission('inventory.view')
    async minimums(@Query(new ZodValidationPipe(z.object({ locationId: z.string().uuid() }).strict())) query: { locationId: string }) { return { data: await this.stats.minimums(query.locationId) }; }
    @Post('minimums') @RequirePermission('settings.manage')
    async save(@Request() req: any, @Body(new ZodValidationPipe(stockMinimumSchema)) body: StockMinimumInput) { return { data: await this.stats.saveMinimum(body, req.user.id) }; }
}
