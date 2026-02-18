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
import { CatalogService } from './catalog.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { createCategorySchema, createSkuItemSchema, updateCategorySchema, updateSkuItemSchema } from '@zyllen/shared';

@Controller('catalog')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CatalogController {
    constructor(private readonly catalogService: CatalogService) { }

    // ── CATEGORIES ──

    @Get('categories')
    @RequirePermission('catalog.view')
    async findAllCategories(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.catalogService.findAllCategories({ skip: (p - 1) * l, take: l });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get('categories/:id')
    @RequirePermission('catalog.view')
    async findCategory(@Param('id') id: string) {
        const data = await this.catalogService.findCategoryById(id);
        return { data };
    }

    @Post('categories')
    @RequirePermission('catalog.create')
    async createCategory(@Body(new ZodValidationPipe(createCategorySchema)) body: { name: string }) {
        const data = await this.catalogService.createCategory(body);
        return { data, message: 'Categoria criada com sucesso' };
    }

    @Put('categories/:id')
    @RequirePermission('catalog.update')
    async updateCategory(@Param('id') id: string, @Body(new ZodValidationPipe(updateCategorySchema)) body: { name?: string }) {
        const data = await this.catalogService.updateCategory(id, body);
        return { data, message: 'Categoria atualizada com sucesso' };
    }

    @Delete('categories/:id')
    @RequirePermission('catalog.delete')
    async deleteCategory(@Param('id') id: string) {
        await this.catalogService.deleteCategory(id);
        return { message: 'Categoria excluída com sucesso' };
    }

    // ── SKU ITEMS ──

    @Get('skus')
    @RequirePermission('catalog.view')
    async findAllSkus(
        @Query('categoryId') categoryId?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.catalogService.findAllSkuItems({ categoryId, search, skip: (p - 1) * l, take: l });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get('skus/:id')
    @RequirePermission('catalog.view')
    async findSku(@Param('id') id: string) {
        const data = await this.catalogService.findSkuById(id);
        return { data };
    }

    @Post('skus')
    @RequirePermission('catalog.create')
    async createSku(@Body(new ZodValidationPipe(createSkuItemSchema)) body: { name: string; description?: string; brand?: string; barcode?: string; categoryId: string }) {
        const data = await this.catalogService.createSkuItem(body);
        return { data, message: 'SKU criado com sucesso' };
    }

    @Put('skus/:id')
    @RequirePermission('catalog.update')
    async updateSku(@Param('id') id: string, @Body(new ZodValidationPipe(updateSkuItemSchema)) body: { name?: string; description?: string; brand?: string; barcode?: string; categoryId?: string }) {
        const data = await this.catalogService.updateSkuItem(id, body);
        return { data, message: 'SKU atualizado com sucesso' };
    }

    @Delete('skus/:id')
    @RequirePermission('catalog.delete')
    async deleteSku(@Param('id') id: string) {
        await this.catalogService.deleteSkuItem(id);
        return { message: 'SKU excluído com sucesso' };
    }
}
