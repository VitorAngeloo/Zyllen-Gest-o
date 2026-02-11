import {
    Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
    constructor(private readonly purchasesService: PurchasesService) { }

    @Get()
    @RequirePermission('purchases.view')
    async findAll(@Query('status') status?: string, @Query('supplierId') supplierId?: string) {
        const data = await this.purchasesService.findAll({ status, supplierId });
        return { data };
    }

    @Get(':id')
    @RequirePermission('purchases.view')
    async findById(@Param('id') id: string) {
        const data = await this.purchasesService.findById(id);
        return { data };
    }

    @Post()
    @RequirePermission('purchases.create')
    async createOrder(@Body() body: { supplierId: string; items: { skuId: string; qtyOrdered: number }[] }) {
        const data = await this.purchasesService.createOrder(body);
        return { data, message: 'Pedido de compra criado' };
    }

    @Put(':id/status')
    @RequirePermission('purchases.approve')
    async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
        const data = await this.purchasesService.updateStatus(id, body.status);
        return { data, message: 'Status atualizado' };
    }

    @Post(':id/receive')
    @RequirePermission('purchases.receive')
    async receiveItems(
        @Param('id') id: string,
        @Request() req: any,
        @Body() body: { items: { skuId: string; qtyReceived: number; divergenceNote?: string }[]; locationId: string },
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
