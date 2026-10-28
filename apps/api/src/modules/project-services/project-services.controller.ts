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
import { projectPendingCreateSchema, projectPendingUpdateSchema, projectPendingResolveSchema, projectNoteCreateSchema, type ProjectPendingCreate, type ProjectPendingUpdate, type ProjectNoteCreate } from '@zyllen/shared';
import { ProjectCollaborationService } from './project-collaboration.service';
import { PROJECT_PLANNING_ACCESS, projectPlanningChangeSchema, projectObservationsChangeSchema, projectCancellationSchema } from '@zyllen/shared';
import { ProjectActionsService } from './project-actions.service';
import { ProjectHistoryService } from './project-history.service';
import { ProjectPlanningGuard } from './project-planning.guard';
import { ProjectLegacyService } from './project-legacy.service';

const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50),
    status: z.enum(PROJECT_SERVICE_STATUSES).optional(), type: z.enum(PROJECT_SERVICE_TYPES).optional(), search: z.string().trim().max(200).optional() }).strict();

@Controller('project-services')
@UseGuards(JwtAuthGuard, ProjectPlanningGuard, PermissionsGuard)
export class ProjectServicesController {
    constructor(private readonly services: ProjectServicesService, private readonly statistics: ProjectStatisticsService, private readonly collaboration: ProjectCollaborationService, private readonly actions: ProjectActionsService, private readonly history: ProjectHistoryService, private readonly legacy: ProjectLegacyService) {}
    @Get('legacy/records') @RequirePermission(PROJECT_PLANNING_ACCESS.view)
    async legacyList(@Query(new ZodValidationPipe(z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(100) }).strict())) query: { page: number; limit: number }) {
        return this.legacy.list(query.page, query.limit);
    }
    @Get('legacy/records/:id') @RequirePermission(PROJECT_PLANNING_ACCESS.view)
    async legacyDetail(@Param('id') id: string) { return { data: await this.legacy.find(id) }; }
    @Get('statistics') @RequirePermission(PROJECT_PLANNING_ACCESS.view)
    async stats(@Query(new ZodValidationPipe(projectStatisticsQuerySchema)) query: ProjectStatisticsQuery) {
        return { data: await this.statistics.get(query) };
    }
    @Get('options') @RequirePermission(PROJECT_PLANNING_ACCESS.view)
    async options() { return { data: await this.services.options() }; }
    @Post('markers') @RequirePermission(PROJECT_PLANNING_ACCESS.createProject)
    async marker(@Body(new ZodValidationPipe(projectServiceMarkerSchema)) body: { name: string }, @Request() req: any) {
        return { data: await this.services.marker(body.name, req.user.id) };
    }
    @Get() @RequirePermission(PROJECT_PLANNING_ACCESS.view)
    async list(@Query(new ZodValidationPipe(listSchema)) query: z.infer<typeof listSchema>) { return this.services.list(query); }
    @Get(':id') @RequirePermission(PROJECT_PLANNING_ACCESS.view)
    async find(@Param('id') id: string) { return { data: await this.services.find(id) }; }
    @Get(':id/history') @RequirePermission(PROJECT_PLANNING_ACCESS.history)
    async changes(@Param('id') id: string, @Query(new ZodValidationPipe(z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(30) }).strict())) query: { page: number; limit: number }) {
        return this.history.list(id, query.page, query.limit);
    }
    @Put(':id/planning') @RequirePermission(PROJECT_PLANNING_ACCESS.editProject)
    async planning(@Param('id') id: string, @Body(new ZodValidationPipe(projectPlanningChangeSchema)) body: z.infer<typeof projectPlanningChangeSchema>, @Request() req: any) {
        return { data: await this.actions.planning(id, body, req.user.id) };
    }
    @Put(':id/observations') @RequirePermission(PROJECT_PLANNING_ACCESS.editProject)
    async observations(@Param('id') id: string, @Body(new ZodValidationPipe(projectObservationsChangeSchema)) body: z.infer<typeof projectObservationsChangeSchema>, @Request() req: any) {
        return { data: await this.actions.observations(id, body, req.user.id) };
    }
    @Post(':id/cancel') @RequirePermission(PROJECT_PLANNING_ACCESS.cancel)
    async cancel(@Param('id') id: string, @Body(new ZodValidationPipe(projectCancellationSchema)) body: z.infer<typeof projectCancellationSchema>, @Request() req: any) {
        return { data: await this.actions.cancel(id, body, req.user.id) };
    }
    @Post(':id/pending') @RequirePermission(PROJECT_PLANNING_ACCESS.createPending)
    async addPending(@Param('id') id: string, @Body(new ZodValidationPipe(projectPendingCreateSchema)) body: ProjectPendingCreate, @Request() req: any) {
        return { data: await this.collaboration.addPending(id, body, req.user.id) };
    }
    @Put(':id/pending/:pendingId') @RequirePermission(PROJECT_PLANNING_ACCESS.editPending)
    async updatePending(@Param('id') id: string, @Param('pendingId') pendingId: string, @Body(new ZodValidationPipe(projectPendingUpdateSchema)) body: ProjectPendingUpdate, @Request() req: any) {
        return { data: await this.collaboration.updatePending(id, pendingId, body, req.user.id) };
    }
    @Put(':id/pending/:pendingId/resolve') @RequirePermission(PROJECT_PLANNING_ACCESS.resolvePending)
    async resolvePending(@Param('id') id: string, @Param('pendingId') pendingId: string, @Body(new ZodValidationPipe(projectPendingResolveSchema)) body: { expectedVersion: number }, @Request() req: any) {
        return { data: await this.collaboration.resolvePending(id, pendingId, body.expectedVersion, req.user.id) };
    }
    @Post(':id/notes') @RequirePermission(PROJECT_PLANNING_ACCESS.annotate)
    async addNote(@Param('id') id: string, @Body(new ZodValidationPipe(projectNoteCreateSchema)) body: ProjectNoteCreate, @Request() req: any) {
        return { data: await this.collaboration.addNote(id, body, req.user.id) };
    }
    @Post() @RequirePermission(PROJECT_PLANNING_ACCESS.createProject)
    async create(@Body(new ZodValidationPipe(projectServiceInputSchema)) body: ProjectServiceInput, @Request() req: any) {
        return { data: await this.services.create(body, req.user.id) };
    }
    @Put(':id/status') @RequirePermission(PROJECT_PLANNING_ACCESS.editProject)
    async status(@Param('id') id: string, @Body(new ZodValidationPipe(projectServiceStatusSchema)) body: { status: ProjectServiceStatus }, @Request() req: any) {
        return { data: await this.services.status(id, body.status, req.user.id) };
    }
    @Put(':id') @RequirePermission(PROJECT_PLANNING_ACCESS.editProject)
    async update(@Param('id') id: string, @Body(new ZodValidationPipe(projectServiceInputSchema)) body: ProjectServiceInput, @Request() req: any) {
        return { data: await this.services.update(id, body, req.user.id) };
    }
}
