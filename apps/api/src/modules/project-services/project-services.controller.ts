import { Body, Controller, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { projectServiceInputSchema, projectServiceMarkerSchema, projectServiceStatusSchema, PROJECT_SERVICE_STATUSES, PROJECT_SERVICE_TYPES, type ProjectServiceInput, type ProjectServiceStatus } from '@zyllen/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { ProjectServicesService } from './project-services.service';
import { ProjectStatisticsService } from './project-statistics.service';
import { projectStatisticsQuerySchema, type ProjectStatisticsQuery } from '@zyllen/shared';

const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50),
    status: z.enum(PROJECT_SERVICE_STATUSES).optional(), type: z.enum(PROJECT_SERVICE_TYPES).optional(), search: z.string().trim().max(200).optional() }).strict();

@Controller('project-services')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectServicesController {
    constructor(private readonly services: ProjectServicesService, private readonly statistics: ProjectStatisticsService) {}
    @Get('statistics') @RequirePermission('schedule.view')
    async stats(@Query(new ZodValidationPipe(projectStatisticsQuerySchema)) query: ProjectStatisticsQuery) {
        return { data: await this.statistics.get(query) };
    }
    @Get('options') @RequirePermission('schedule.view')
    async options() { return { data: await this.services.options() }; }
    @Post('markers') @RequirePermission('schedule.create')
    async marker(@Body(new ZodValidationPipe(projectServiceMarkerSchema)) body: { name: string }, @Request() req: any) {
        return { data: await this.services.marker(body.name, req.user.id) };
    }
    @Get() @RequirePermission('schedule.view')
    async list(@Query(new ZodValidationPipe(listSchema)) query: z.infer<typeof listSchema>) { return this.services.list(query); }
    @Get(':id') @RequirePermission('schedule.view')
    async find(@Param('id') id: string) { return { data: await this.services.find(id) }; }
    @Post() @RequirePermission('schedule.create')
    async create(@Body(new ZodValidationPipe(projectServiceInputSchema)) body: ProjectServiceInput, @Request() req: any) {
        return { data: await this.services.create(body, req.user.id) };
    }
    @Put(':id/status') @RequirePermission('schedule.update')
    async status(@Param('id') id: string, @Body(new ZodValidationPipe(projectServiceStatusSchema)) body: { status: ProjectServiceStatus }, @Request() req: any) {
        return { data: await this.services.status(id, body.status, req.user.id) };
    }
    @Put(':id') @RequirePermission('schedule.update')
    async update(@Param('id') id: string, @Body(new ZodValidationPipe(projectServiceInputSchema)) body: ProjectServiceInput, @Request() req: any) {
        return { data: await this.services.update(id, body, req.user.id) };
    }
}
