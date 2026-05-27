import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import {
    createScheduleSchema,
    updateScheduleSchema,
    updateInstallerAgendaSchema,
} from '@zyllen/shared';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ScheduleController {
    constructor(private readonly scheduleService: ScheduleService) {}

    @Get('installers')
    @RequirePermission('schedule.view')
    async getInstallers(@Query('onlyActive') onlyActive?: string) {
        const data = await this.scheduleService.findInstallers(onlyActive === 'true');
        return { data };
    }

    @Put('installers/:userId')
    @RequirePermission('schedule.manage_installers')
    async updateInstallerSettings(
        @Param('userId') userId: string,
        @Body(new ZodValidationPipe(updateInstallerAgendaSchema))
        body: { agendaColor?: string; agendaActive?: boolean },
    ) {
        const data = await this.scheduleService.updateInstallerSettings(userId, body);
        return { data, message: 'Configurações do instalador atualizadas' };
    }

    @Get()
    @RequirePermission('schedule.view')
    async findAll(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('installerId') installerId?: string,
        @Query('status') status?: string,
        @Query('type') type?: string,
        @Query('companyId') companyId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '50', 10) || 50));
        const result = await this.scheduleService.findAll({
            startDate,
            endDate,
            installerId,
            status,
            type,
            companyId,
            skip: (p - 1) * l,
            take: l,
        });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get('conflicts')
    @RequirePermission('schedule.view')
    async checkConflicts(
        @Query('installerIds') installerIds: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('excludeId') excludeId?: string,
    ) {
        const ids = (installerIds ?? '').split(',').filter(Boolean);
        if (!ids.length || !startDate || !endDate) return { data: [] };
        const data = await this.scheduleService.checkConflicts({
            installerIds: ids,
            startDate,
            endDate,
            excludeScheduleId: excludeId,
        });
        return { data };
    }

    @Get(':id')
    @RequirePermission('schedule.view')
    async findById(@Param('id') id: string) {
        const data = await this.scheduleService.findById(id);
        return { data };
    }

    @Post()
    @RequirePermission('schedule.create')
    async create(
        @Request() req: any,
        @Body(new ZodValidationPipe(createScheduleSchema)) body: any,
    ) {
        const data = await this.scheduleService.create(body, req.user.id);
        return { data, message: 'Agendamento criado com sucesso' };
    }

    @Put(':id')
    @RequirePermission('schedule.update')
    async update(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(updateScheduleSchema)) body: any,
    ) {
        const data = await this.scheduleService.update(id, body);
        return { data, message: 'Agendamento atualizado com sucesso' };
    }

    @Delete(':id')
    @RequirePermission('schedule.delete')
    async cancel(@Param('id') id: string) {
        const result = await this.scheduleService.cancel(id);
        return result;
    }
}
