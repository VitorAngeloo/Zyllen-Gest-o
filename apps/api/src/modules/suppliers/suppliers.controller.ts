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
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) { }

    @Get()
    @RequirePermission('suppliers.view')
    async findAll() {
        const data = await this.suppliersService.findAll();
        return { data };
    }

    @Get(':id')
    @RequirePermission('suppliers.view')
    async findById(@Param('id') id: string) {
        const data = await this.suppliersService.findById(id);
        return { data };
    }

    @Post()
    @RequirePermission('suppliers.create')
    async create(@Body() body: { name: string; cnpj?: string; contact?: string }) {
        const data = await this.suppliersService.create(body);
        return { data, message: 'Fornecedor criado com sucesso' };
    }

    @Put(':id')
    @RequirePermission('suppliers.update')
    async update(@Param('id') id: string, @Body() body: { name?: string; cnpj?: string; contact?: string }) {
        const data = await this.suppliersService.update(id, body);
        return { data, message: 'Fornecedor atualizado com sucesso' };
    }

    @Delete(':id')
    @RequirePermission('suppliers.delete')
    async delete(@Param('id') id: string) {
        await this.suppliersService.delete(id);
        return { message: 'Fornecedor excluído com sucesso' };
    }
}
