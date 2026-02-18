import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Query,
    Body,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { AssetsService } from './assets.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { createAssetSchema, bulkEquipmentSchema, updateAssetStatusSchema, updateAssetLocationSchema } from '@zyllen/shared';

@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetsController {
    constructor(private readonly assetsService: AssetsService) { }

    @Get()
    @RequirePermission('assets.view')
    async findAll(
        @Query('skuId') skuId?: string,
        @Query('status') status?: string,
        @Query('locationId') locationId?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.assetsService.findAll({ skuId, status, locationId, search, skip: (p - 1) * l, take: l });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get('summary')
    @RequirePermission('assets.view')
    async getEquipmentSummary(
        @Query('search') search?: string,
        @Query('categoryId') categoryId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.assetsService.getEquipmentSummary({ search, categoryId, skip: (p - 1) * l, take: l });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get('lookup/:assetCode')
    @RequirePermission('assets.lookup')
    async lookup(@Param('assetCode') assetCode: string) {
        const data = await this.assetsService.lookupByCode(assetCode);
        return { data };
    }

    @Get(':id')
    @RequirePermission('assets.view')
    async findById(@Param('id') id: string) {
        const data = await this.assetsService.findById(id);
        return { data };
    }

    @Get(':id/timeline')
    @RequirePermission('assets.view')
    async getTimeline(@Param('id') id: string) {
        const data = await this.assetsService.getTimeline(id);
        return { data };
    }

    @Post('bulk')
    @RequirePermission('assets.create')
    async bulkRegister(@Body(new ZodValidationPipe(bulkEquipmentSchema)) body: {
        name: string;
        description?: string;
        brand?: string;
        barcode?: string;
        categoryId: string;
        locationId: string;
        quantity: number;
    }) {
        const data = await this.assetsService.bulkRegister(body);
        return { data, message: 'Equipamento cadastrado com sucesso' };
    }

    @Post()
    @RequirePermission('assets.create')
    async create(@Body(new ZodValidationPipe(createAssetSchema)) body: { skuId: string; currentLocationId?: string }) {
        const data = await this.assetsService.create(body);
        return { data, message: 'Patrimônio criado com sucesso' };
    }

    @Put(':id/status')
    @RequirePermission('assets.create')
    async updateStatus(@Param('id') id: string, @Body(new ZodValidationPipe(updateAssetStatusSchema)) body: { status: string }) {
        const data = await this.assetsService.updateStatus(id, body.status);
        return { data, message: 'Status atualizado com sucesso' };
    }

    @Put(':id/location')
    @RequirePermission('assets.create')
    async updateLocation(@Param('id') id: string, @Body(new ZodValidationPipe(updateAssetLocationSchema)) body: { locationId: string | null }) {
        const data = await this.assetsService.updateLocation(id, body.locationId);
        return { data, message: 'Local atualizado com sucesso' };
    }
}
