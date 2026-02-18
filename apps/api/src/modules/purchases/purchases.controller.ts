import {
    Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { PurchasesService } from './purchases.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { createPurchaseOrderSchema, receivePurchaseOrderSchema, updatePurchaseStatusSchema } from '@zyllen/shared';

@Controller('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
    constructor(private readonly purchasesService: PurchasesService) { }

    @Get()
    @RequirePermission('purchases.view')
    async findAll(
        @Query('status') status?: string,
        @Query('supplierId') supplierId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.purchasesService.findAll({ status, supplierId, skip: (p - 1) * l, take: l });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get(':id')
    @RequirePermission('purchases.view')
    async findById(@Param('id') id: string) {
        const data = await this.purchasesService.findById(id);
        return { data };
    }

    @Post()
    @RequirePermission('purchases.create')
    async createOrder(@Body(new ZodValidationPipe(createPurchaseOrderSchema)) body: { supplierId: string; items: { skuId: string; qtyOrdered: number }[] }) {
        const data = await this.purchasesService.createOrder(body);
        return { data, message: 'Pedido de compra criado' };
    }

    @Put(':id/status')
    @RequirePermission('purchases.approve')
    async updateStatus(@Param('id') id: string, @Body(new ZodValidationPipe(updatePurchaseStatusSchema)) body: { status: string }) {
        const data = await this.purchasesService.updateStatus(id, body.status);
        return { data, message: 'Status atualizado' };
    }

    @Post(':id/receive')
    @RequirePermission('purchases.receive')
    async receiveItems(
        @Param('id') id: string,
        @Request() req: any,
        @Body(new ZodValidationPipe(receivePurchaseOrderSchema)) body: { items: { skuId: string; qtyReceived: number; divergenceNote?: string }[]; locationId: string },
    ) {
        const data = await this.purchasesService.receiveItems({
            purchaseOrderId: id,
            receivedById: req.user.id,
            items: body.items,
            locationId: body.locationId,
        });
        return { data, message: 'Recebimento registrado' };
    }
}
