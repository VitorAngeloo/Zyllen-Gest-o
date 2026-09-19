import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { vehicleCreateSchema, vehicleInputSchema, vehicleReservationCreateSchema, vehicleReservationQuerySchema, vehicleReservationSchema,
    type VehicleCreateInput, type VehicleInput, type VehicleReservationCreateInput, type VehicleReservationInput, type VehicleReservationQuery } from '@zyllen/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { VehiclesService } from './vehicles.service';
@Controller('vehicles') @UseGuards(JwtAuthGuard, PermissionsGuard)
export class VehiclesController {
    constructor(private readonly vehicles: VehiclesService) {}
    @Get('statistics') @RequirePermission('schedule.view')
    async statistics() { return { data: await this.vehicles.statistics() }; }
    @Get('options') @RequirePermission('schedule.view')
    async options() { return { data: await this.vehicles.options() }; }
    @Get('reservations') @RequirePermission('schedule.view')
    async reservations(@Query(new ZodValidationPipe(vehicleReservationQuerySchema)) query: VehicleReservationQuery) { return this.vehicles.reservations(query); }
    @Post('reservations') @RequirePermission('schedule.create')
    async reserve(@Body(new ZodValidationPipe(vehicleReservationCreateSchema)) input: VehicleReservationCreateInput, @Request() req: any) { return { data: await this.vehicles.reserve(input, req.user.id) }; }
    @Put('reservations/:id/cancel') @RequirePermission('schedule.delete')
    async cancel(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) { return { data: await this.vehicles.cancel(id, req.user.id) }; }
    @Put('reservations/:id') @RequirePermission('schedule.update')
    async updateReservation(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(vehicleReservationSchema)) input: VehicleReservationInput, @Request() req: any) { return { data: await this.vehicles.updateReservation(id, input, req.user.id) }; }
    @Get() @RequirePermission('schedule.view')
    async list() { return { data: await this.vehicles.list() }; }
    @Post() @RequirePermission('schedule.create')
    async create(@Body(new ZodValidationPipe(vehicleCreateSchema)) input: VehicleCreateInput, @Request() req: any) { return { data: await this.vehicles.create(input, req.user.id) }; }
    @Put(':id') @RequirePermission('schedule.update')
    async update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(vehicleInputSchema)) input: VehicleInput, @Request() req: any) { return { data: await this.vehicles.update(id, input, req.user.id) }; }
}
