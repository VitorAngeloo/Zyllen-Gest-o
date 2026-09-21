import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Request, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { vehicleCreateSchema, vehicleInputSchema, vehicleReservationCreateSchema, vehicleReservationQuerySchema, vehicleReservationSchema,
    vehicleCheckoutSchema, vehicleReturnSchema, vehicleDashboardQuerySchema,
    type VehicleCreateInput, type VehicleInput, type VehicleReservationCreateInput, type VehicleReservationInput, type VehicleReservationQuery, type VehicleDashboardQuery } from '@zyllen/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { VehiclesService } from './vehicles.service';
import { ManagerGuard } from '../auth/manager.guard';
import { mediaUploadDirectory, verifiedMediaStorage } from '../../infrastructure/storage/verified-media-storage';
import { unlink } from 'fs/promises';
const photoStorage = verifiedMediaStorage(mediaUploadDirectory('vehicles'));
@Controller('vehicles') @UseGuards(JwtAuthGuard, PermissionsGuard)
export class VehiclesController {
    constructor(private readonly vehicles: VehiclesService) {}
    @Get('statistics') @RequirePermission(['vehicles.view', 'schedule.view'])
    async statistics() { return { data: await this.vehicles.statistics() }; }
    @Get('dashboard') @UseGuards(ManagerGuard) @RequirePermission(['vehicles.view', 'schedule.view'])
    async dashboard(@Query(new ZodValidationPipe(vehicleDashboardQuerySchema)) query: VehicleDashboardQuery) { return { data: await this.vehicles.managerDashboard(query) }; }
    @Get('operations') @RequirePermission(['vehicles.view', 'schedule.view'])
    async operations(@Request() req: any) { return { data: await this.vehicles.operations(req.user.id) }; }
    @Get('options') @RequirePermission(['vehicles.view', 'schedule.view'])
    async options() { return { data: await this.vehicles.options() }; }
    @Get('reservations') @RequirePermission(['vehicles.view', 'schedule.view'])
    async reservations(@Query(new ZodValidationPipe(vehicleReservationQuerySchema)) query: VehicleReservationQuery) { return this.vehicles.reservations(query); }
    @Post('reservations') @RequirePermission(['vehicles.reserve', 'schedule.create'])
    async reserve(@Body(new ZodValidationPipe(vehicleReservationCreateSchema)) input: VehicleReservationCreateInput, @Request() req: any) { return { data: await this.vehicles.reserve(input, req.user.id) }; }
    @Post('reservations/:id/checkout') @RequirePermission(['vehicles.reserve', 'schedule.create']) @UseInterceptors(FileInterceptor('odometerPhoto', { storage: photoStorage, limits: { fileSize: 20 * 1024 * 1024, files: 1 } }))
    async checkout(@Param('id') id: string, @Body() body: Record<string, unknown>, @UploadedFile() file: Express.Multer.File, @Request() req: any) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) { if (file?.path) await unlink(file.path).catch(() => undefined); throw new BadRequestException('Reserva invalida'); }
        const parsed = vehicleCheckoutSchema.safeParse(body);
        if (!parsed.success) { if (file?.path) await unlink(file.path).catch(() => undefined); throw new BadRequestException(parsed.error.issues[0]?.message || 'Dados de retirada invalidos'); }
        return { data: await this.vehicles.checkout(id, parsed.data, file, req.user.id) };
    }
    @Post('reservations/:id/return') @RequirePermission(['vehicles.reserve', 'schedule.create']) @UseInterceptors(FileInterceptor('odometerPhoto', { storage: photoStorage, limits: { fileSize: 20 * 1024 * 1024, files: 1 } }))
    async returnVehicle(@Param('id') id: string, @Body() body: Record<string, unknown>, @UploadedFile() file: Express.Multer.File, @Request() req: any) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) { if (file?.path) await unlink(file.path).catch(() => undefined); throw new BadRequestException('Reserva invalida'); }
        const parsed = vehicleReturnSchema.safeParse(body);
        if (!parsed.success) { if (file?.path) await unlink(file.path).catch(() => undefined); throw new BadRequestException(parsed.error.issues[0]?.message || 'Dados de devolucao invalidos'); }
        return { data: await this.vehicles.returnVehicle(id, parsed.data, file, req.user.id) };
    }
    @Put('reservations/:id/cancel') @RequirePermission('schedule.delete')
    async cancel(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) { return { data: await this.vehicles.cancel(id, req.user.id) }; }
    @Put('reservations/:id') @RequirePermission('schedule.update')
    async updateReservation(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(vehicleReservationSchema)) input: VehicleReservationInput, @Request() req: any) { return { data: await this.vehicles.updateReservation(id, input, req.user.id) }; }
    @Get() @RequirePermission(['vehicles.view', 'schedule.view'])
    async list() { return { data: await this.vehicles.list() }; }
    @Post() @RequirePermission('schedule.create')
    async create(@Body(new ZodValidationPipe(vehicleCreateSchema)) input: VehicleCreateInput, @Request() req: any) { return { data: await this.vehicles.create(input, req.user.id) }; }
    @Put(':id') @RequirePermission('schedule.update')
    async update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(vehicleInputSchema)) input: VehicleInput, @Request() req: any) { return { data: await this.vehicles.update(id, input, req.user.id) }; }
}
