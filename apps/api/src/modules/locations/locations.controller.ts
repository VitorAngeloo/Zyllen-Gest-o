import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { LocationsService } from './locations.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { createLocationSchema, updateLocationSchema } from '@zyllen/shared';

@Controller('locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) { }

    @Get()
    @RequirePermission('locations.view')
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.locationsService.findAll({ skip: (p - 1) * l, take: l });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get(':id')
    @RequirePermission('locations.view')
    async findById(@Param('id') id: string) {
        const data = await this.locationsService.findById(id);
        return { data };
    }

    @Post()
    @RequirePermission('locations.create')
    async create(@Body(new ZodValidationPipe(createLocationSchema)) body: { name: string; description?: string }) {
        const data = await this.locationsService.create(body);
        return { data, message: 'Local criado com sucesso' };
    }

    @Put(':id')
    @RequirePermission('locations.update')
    async update(@Param('id') id: string, @Body(new ZodValidationPipe(updateLocationSchema)) body: { name?: string; description?: string }) {
        const data = await this.locationsService.update(id, body);
        return { data, message: 'Local atualizado com sucesso' };
    }

    @Delete(':id')
    @RequirePermission('locations.delete')
    async delete(@Param('id') id: string) {
        await this.locationsService.delete(id);
        return { message: 'Local excluído com sucesso' };
    }
}
