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
    ) {
        const data = await this.assetsService.findAll({ skuId, status, locationId, search });
        return { data };
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

    @Post()
    @RequirePermission('assets.create')
    async create(@Body() body: { skuId: string; currentLocationId?: string }) {
        const data = await this.assetsService.create(body);
        return { data, message: 'Patrimônio criado com sucesso' };
    }

    @Put(':id/status')
    @RequirePermission('assets.create')
    async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
        const data = await this.assetsService.updateStatus(id, body.status);
        return { data, message: 'Status atualizado com sucesso' };
    }

    @Put(':id/location')
    @RequirePermission('assets.create')
    async updateLocation(@Param('id') id: string, @Body() body: { locationId: string | null }) {
        const data = await this.assetsService.updateLocation(id, body.locationId);
        return { data, message: 'Local atualizado com sucesso' };
    }
}
