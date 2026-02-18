import {
    Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { MaintenanceService } from './maintenance.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { createMaintenanceSchema, updateMaintenanceStatusSchema, updateOsFormDataSchema } from '@zyllen/shared';

@Controller('maintenance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaintenanceController {
    constructor(private readonly maintenanceService: MaintenanceService) { }

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
}
