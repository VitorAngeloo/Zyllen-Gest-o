import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Request, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { structureInputSchema, structureListSchema, type StructureInput, type StructureListQuery } from '@zyllen/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { StructuresService } from './structures.service';
const pageSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict();
@Controller('structures')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StructuresController {
    constructor(private readonly service: StructuresService) {}
    @Get() @RequirePermission('schedule.view')
    list(@Query(new ZodValidationPipe(structureListSchema)) query: StructureListQuery) { return this.service.list(query); }
    @Post() @RequirePermission('schedule.create')
    async create(@Body(new ZodValidationPipe(structureInputSchema)) body: StructureInput, @Request() req: any) { return { data: await this.service.create(body, req.user.id) }; }
    @Get(':id/available-cycle') @RequirePermission('schedule.view')
    async available(@Param('id', new ParseUUIDPipe()) id: string) { return { data: await this.service.availableCycle(id) }; }
    @Get(':id/cycles') @RequirePermission('schedule.view')
    cycles(@Param('id', new ParseUUIDPipe()) id: string, @Query(new ZodValidationPipe(pageSchema)) query: z.infer<typeof pageSchema>) { return this.service.cycles(id, query.page, query.limit); }
}
