import {
    Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request,
    ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MaintenanceService } from './maintenance.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { createMaintenanceSchema, updateOsFormDataSchema, updateMaintenanceStatusSchema } from '@zyllen/shared';

/**
 * Contractor-facing maintenance OS endpoints.
 * Only accessible by contractor users — no permissions guard needed.
 * Contractors can view and manage their own OS records.
 */
@Controller('contractor/maintenance')
@UseGuards(JwtAuthGuard)
export class ContractorMaintenanceController {
    constructor(private readonly maintenanceService: MaintenanceService) { }

    private assertContractor(req: any) {
        if (req.user?.type !== 'contractor') {
            throw new ForbiddenException('Acesso restrito a terceirizados');
        }
    }

    @Get()
    async myOrders(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        this.assertContractor(req);
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.maintenanceService.findAll({
            openedByContractorId: req.user.id,
            status: status || undefined,
            skip: (p - 1) * l,
            take: l,
        });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get(':id')
    async findOne(@Request() req: any, @Param('id') id: string) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) {
            throw new ForbiddenException('OS não pertence a este terceirizado');
        }
        return { data: os };
    }

    @Post()
    async openOS(
        @Request() req: any,
        @Body(new ZodValidationPipe(createMaintenanceSchema)) body: {
            assetId?: string;
            notes?: string;
            formType?: string;
            clientName?: string;
            clientCity?: string;
            clientState?: string;
            location?: string;
            startedAt?: string;
            endedAt?: string;
            scheduledDate?: string;
            formData?: Record<string, unknown>;
        },
    ) {
        this.assertContractor(req);
        const data = await this.maintenanceService.openOS({
            assetId: body.assetId,
            openedByContractorId: req.user.id,
            notes: body.notes,
            formType: body.formType || 'TERCEIRIZADO',
            clientName: body.clientName,
            clientCity: body.clientCity,
            clientState: body.clientState,
            location: body.location,
            startedAt: body.startedAt,
            endedAt: body.endedAt,
            scheduledDate: body.scheduledDate,
            formData: body.formData,
        });
        return { data, message: 'OS aberta com sucesso' };
    }

    @Put(':id/form-data')
    async updateFormData(
        @Request() req: any,
        @Param('id') id: string,
        @Body(new ZodValidationPipe(updateOsFormDataSchema)) body: {
            formData: Record<string, unknown>;
            notes?: string;
            clientName?: string;
            clientCity?: string;
            clientState?: string;
            location?: string;
            startedAt?: string;
            endedAt?: string;
        },
    ) {
        this.assertContractor(req);
        const data = await this.maintenanceService.updateFormData(id, req.user.id, body, true);
        return { data, message: 'Dados atualizados' };
    }

    @Put(':id/status')
    async updateStatus(
        @Request() req: any,
        @Param('id') id: string,
        @Body(new ZodValidationPipe(updateMaintenanceStatusSchema)) body: { status: string; notes?: string },
    ) {
        this.assertContractor(req);
        const os = await this.maintenanceService.findById(id);
        if (os.openedByContractorId !== req.user.id) {
            throw new ForbiddenException('OS não pertence a este terceirizado');
        }
        // Contractors can only update to IN_PROGRESS (not close)
        if (body.status === 'CLOSED') {
            throw new ForbiddenException('Terceirizados não podem encerrar OS. Solicite o encerramento a um colaborador.');
        }
        const data = await this.maintenanceService.updateStatus(id, body.status, req.user.id, body.notes, true);
        return { data, message: 'OS atualizada' };
    }
}
