import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { LocationsService } from './locations.service';

@Controller('locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) { }

    @Get()
    @RequirePermission('locations.view')
    async findAll() {
        const data = await this.locationsService.findAll();
        return { data };
    }

    @Get(':id')
    @RequirePermission('locations.view')
    async findById(@Param('id') id: string) {
        const data = await this.locationsService.findById(id);
        return { data };
    }

    @Post()
    @RequirePermission('locations.create')
    async create(@Body() body: { name: string; description?: string }) {
        const data = await this.locationsService.create(body);
        return { data, message: 'Local criado com sucesso' };
    }

    @Put(':id')
    @RequirePermission('locations.update')
    async update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
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
