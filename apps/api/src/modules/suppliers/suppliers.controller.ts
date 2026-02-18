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
import { SuppliersService } from './suppliers.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { createSupplierSchema, updateSupplierSchema } from '@zyllen/shared';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) { }

    @Get()
    @RequirePermission('suppliers.view')
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.suppliersService.findAll({ skip: (p - 1) * l, take: l });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get(':id')
    @RequirePermission('suppliers.view')
    async findById(@Param('id') id: string) {
        const data = await this.suppliersService.findById(id);
        return { data };
    }

    @Post()
    @RequirePermission('suppliers.create')
    async create(@Body(new ZodValidationPipe(createSupplierSchema)) body: { name: string; cnpj?: string; contact?: string }) {
        const data = await this.suppliersService.create(body);
        return { data, message: 'Fornecedor criado com sucesso' };
    }

    @Put(':id')
    @RequirePermission('suppliers.update')
    async update(@Param('id') id: string, @Body(new ZodValidationPipe(updateSupplierSchema)) body: { name?: string; cnpj?: string; contact?: string }) {
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
