import { Body, Controller, Get, Param, Put, Query, Request, UseGuards } from '@nestjs/common';
import { operationsStatisticsQuerySchema, tripListQuerySchema, tripStatusSchema, type OperationsStatisticsQuery, type TripListQuery, type TripStatusInput } from '@zyllen/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { TripsService } from './trips.service';
import { OperationsStatisticsService } from './operations-statistics.service';

@Controller('trips')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TripsController {
    constructor(private readonly trips: TripsService, private readonly statistics: OperationsStatisticsService) {}
    @Get('statistics') @RequirePermission('schedule.view')
    async stats(@Query(new ZodValidationPipe(operationsStatisticsQuerySchema)) query: OperationsStatisticsQuery) { return { data: await this.statistics.get(query) }; }
    @Get('options') @RequirePermission('schedule.view')
    async options() { return { data: await this.trips.options() }; }
    @Get() @RequirePermission('schedule.view')
    async list(@Query(new ZodValidationPipe(tripListQuerySchema)) query: TripListQuery) { return this.trips.list(query); }
    @Get(':id') @RequirePermission('schedule.view')
    async find(@Param('id') id: string) { return { data: await this.trips.find(id) }; }
    @Put(':id/status') @RequirePermission('schedule.update')
    async status(@Param('id') id: string, @Body(new ZodValidationPipe(tripStatusSchema)) input: TripStatusInput, @Request() req: any) { return { data: await this.trips.status(id, input, req.user.id) }; }
}
