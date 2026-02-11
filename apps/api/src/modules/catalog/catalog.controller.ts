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

@Controller('catalog')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CatalogController {
    constructor(private readonly catalogService: CatalogService) { }

    // ── CATEGORIES ──

    @Get('categories')
    @RequirePermission('catalog.view')
    async findAllCategories() {
        const data = await this.catalogService.findAllCategories();
        return { data };
    }

    @Get('categories/:id')
    @RequirePermission('catalog.view')
    async findCategory(@Param('id') id: string) {
        const data = await this.catalogService.findCategoryById(id);
        return { data };
    }

    @Post('categories')
    @RequirePermission('catalog.create')
    async createCategory(@Body() body: { name: string }) {
        const data = await this.catalogService.createCategory(body);
        return { data, message: 'Categoria criada com sucesso' };
    }

    @Put('categories/:id')
    @RequirePermission('catalog.update')
    async updateCategory(@Param('id') id: string, @Body() body: { name?: string }) {
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
    ) {
        const data = await this.catalogService.findAllSkuItems({ categoryId, search });
        return { data };
    }

    @Get('skus/:id')
    @RequirePermission('catalog.view')
    async findSku(@Param('id') id: string) {
        const data = await this.catalogService.findSkuById(id);
        return { data };
    }

    @Post('skus')
    @RequirePermission('catalog.create')
    async createSku(@Body() body: { name: string; brand?: string; barcode?: string; categoryId: string }) {
        const data = await this.catalogService.createSkuItem(body);
        return { data, message: 'SKU criado com sucesso' };
    }

    @Put('skus/:id')
    @RequirePermission('catalog.update')
    async updateSku(@Param('id') id: string, @Body() body: { name?: string; brand?: string; barcode?: string; categoryId?: string }) {
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
