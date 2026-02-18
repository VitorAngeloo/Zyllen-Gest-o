import {
    Controller,
    Get,
    Post,
    Query,
    Body,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { ProductExitsService } from './product-exits.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { createProductExitSchema } from '@zyllen/shared';

@Controller('product-exits')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductExitsController {
    constructor(private readonly productExitsService: ProductExitsService) { }

    @Post()
    @RequirePermission('inventory.exit')
    async create(
        @Body(new ZodValidationPipe(createProductExitSchema)) body: {
            skuId: string;
            locationId: string;
            quantity: number;
            reason?: string;
        },
        @Req() req: any,
    ) {
        const userId = req.user?.sub || req.user?.id;
        const data = await this.productExitsService.create({
            ...body,
            createdById: userId,
        });
        return { data, message: 'Saída registrada com sucesso' };
    }

    @Get()
    @RequirePermission('inventory.view')
    async findAll(
        @Query('skuId') skuId?: string,
        @Query('locationId') locationId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '50', 10) || 50));
        const result = await this.productExitsService.findAll({
            skuId, locationId, startDate, endDate, search,
            skip: (p - 1) * l, take: l,
        });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get('report')
    @RequirePermission('inventory.view')
    async getReport(
        @Query('groupBy') groupBy?: string,
        @Query('skuId') skuId?: string,
        @Query('locationId') locationId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const validGroupBy = ['day', 'month', 'year'].includes(groupBy ?? '')
            ? (groupBy as 'day' | 'month' | 'year')
            : 'day';
        const data = await this.productExitsService.getReport({
            groupBy: validGroupBy, skuId, locationId, startDate, endDate,
        });
        return { data };
    }

    @Get('summary')
    @RequirePermission('inventory.view')
    async getSummary(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const data = await this.productExitsService.getSummary({ startDate, endDate });
        return { data };
    }
}
