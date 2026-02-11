import {
    Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { MaintenanceService } from './maintenance.service';

@Controller('maintenance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaintenanceController {
    constructor(private readonly maintenanceService: MaintenanceService) { }

    @Get()
    @RequirePermission('maintenance.view')
    async findAll(@Query('status') status?: string, @Query('assetId') assetId?: string) {
        const data = await this.maintenanceService.findAll({ status, assetId });
        return { data };
    }

    @Get(':id')
    @RequirePermission('maintenance.view')
    async findById(@Param('id') id: string) {
        const data = await this.maintenanceService.findById(id);
        return { data };
    }

    @Post()
    @RequirePermission('maintenance.open')
    async open(@Request() req: any, @Body() body: { assetId: string; notes?: string }) {
        const data = await this.maintenanceService.openOS({ ...body, openedById: req.user.id });
        return { data, message: 'OS aberta com sucesso' };
    }

    @Put(':id/status')
    @RequirePermission('maintenance.execute')
    async updateStatus(
        @Param('id') id: string,
        @Request() req: any,
        @Body() body: { status: string; notes?: string },
    ) {
        const data = await this.maintenanceService.updateStatus(id, body.status, req.user.id, body.notes);
        return { data, message: 'OS atualizada' };
    }
}
