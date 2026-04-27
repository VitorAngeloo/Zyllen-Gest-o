import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PurchasesService {
    constructor(private readonly prisma: PrismaService) { }

    private readonly validStatuses = ['DRAFT', 'SENT', 'PARTIAL', 'COMPLETED', 'CANCELLED'] as const;

    private readonly allowedStatusTransitions: Record<(typeof this.validStatuses)[number], (typeof this.validStatuses)[number][]> = {
        DRAFT: ['SENT', 'CANCELLED'],
        SENT: ['PARTIAL', 'COMPLETED', 'CANCELLED'],
        PARTIAL: ['PARTIAL', 'COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
    };

    // ── Create PO ──
    async createOrder(data: { supplierId: string; items: { skuId: string; qtyOrdered: number }[] }) {
        const supplier = await this.prisma.supplier.findUnique({ where: { id: data.supplierId } });
        if (!supplier) throw new NotFoundException('Fornecedor não encontrado');

        // Generate order number (PO-YYYYMMDD-NNN)
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await this.prisma.purchaseOrder.count({
            where: { number: { startsWith: `PO-${today}`, mode: 'insensitive' as const } },
        });
        const number = `PO-${today}-${String(count + 1).padStart(3, '0')}`;

        return this.prisma.purchaseOrder.create({
            data: {
                supplierId: data.supplierId,
                number,
                status: 'DRAFT',
                items: {
                    create: data.items.map((item) => ({
                        skuId: item.skuId,
                        qtyOrdered: item.qtyOrdered,
                    })),
                },
            },
            include: {
                supplier: { select: { name: true } },
                items: { include: { sku: { select: { skuCode: true, name: true } } } },
            },
        });
    }

    // ── List POs ──
    async findAll(params?: { status?: string; supplierId?: string; skip?: number; take?: number }) {
        const where = {
            ...(params?.status ? { status: params.status } : {}),
            ...(params?.supplierId ? { supplierId: params.supplierId } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.purchaseOrder.findMany({
                where,
                include: {
                    supplier: { select: { name: true } },
                    _count: { select: { items: true, receivings: true } },
                },
                orderBy: { createdAt: 'desc' },
                ...(params?.skip !== undefined ? { skip: params.skip, take: params.take } : {}),
            }),
            this.prisma.purchaseOrder.count({ where }),
        ]);
        return { data, total };
    }

    // ── Find PO by ID ──
    async findById(id: string) {
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                supplier: true,
                items: { include: { sku: { select: { skuCode: true, name: true } } } },
                receivings: {
                    include: {
                        receivedBy: { select: { name: true } },
                        items: { include: { sku: { select: { skuCode: true, name: true } } } },
                    },
                    orderBy: { receivedAt: 'desc' },
                },
            },
        });
        if (!po) throw new NotFoundException('Pedido não encontrado');
        return po;
    }

    // ── Update PO status ──
    async updateStatus(id: string, status: string) {
        if (!this.validStatuses.includes(status as (typeof this.validStatuses)[number])) {
            throw new BadRequestException(`Status inválido: ${this.validStatuses.join(', ')}`);
        }

        const po = await this.findById(id);
        if (po.status === status) {
            return po;
        }

        const allowedNext = this.allowedStatusTransitions[po.status as keyof typeof this.allowedStatusTransitions] ?? [];
        if (!allowedNext.includes(status as (typeof this.validStatuses)[number])) {
            throw new BadRequestException(`Transição inválida: ${po.status} -> ${status}`);
        }

        return this.prisma.purchaseOrder.update({ where: { id }, data: { status } });
    }

    // ── Receive items (partial receiving) ──
    async receiveItems(data: {
        purchaseOrderId: string;
        receivedById: string;
        items: { skuId: string; qtyReceived: number; divergenceNote?: string }[];
        locationId: string;
    }) {
        const po = await this.findById(data.purchaseOrderId);
        if (['COMPLETED', 'CANCELLED'].includes(po.status)) {
            throw new BadRequestException('Pedido já finalizado ou cancelado');
        }

        const location = await this.prisma.location.findUnique({ where: { id: data.locationId } });
        if (!location) throw new NotFoundException('Local não encontrado');

        const orderedMap = new Map<string, number>();
        for (const item of po.items) {
            orderedMap.set(item.skuId, item.qtyOrdered);
        }

        const payloadSkuMap = new Map<string, { qtyReceived: number; divergenceNote?: string }>();
        for (const item of data.items) {
            if (!orderedMap.has(item.skuId)) {
                throw new BadRequestException(`Item ${item.skuId} não pertence ao pedido ${po.number}`);
            }
            if (payloadSkuMap.has(item.skuId)) {
                throw new BadRequestException(`Item ${item.skuId} informado mais de uma vez no recebimento`);
            }
            payloadSkuMap.set(item.skuId, { qtyReceived: item.qtyReceived, divergenceNote: item.divergenceNote });
        }

        const normalizedItems = Array.from(payloadSkuMap.entries()).map(([skuId, payload]) => ({
            skuId,
            qtyReceived: payload.qtyReceived,
            divergenceNote: payload.divergenceNote,
        }));

        return this.prisma.$transaction(async (tx) => {
            const alreadyReceivedItems = await tx.receivingItem.findMany({
                where: { receiving: { purchaseOrderId: data.purchaseOrderId } },
                select: { skuId: true, qtyReceived: true },
            });

            const alreadyReceivedMap = new Map<string, number>();
            for (const item of alreadyReceivedItems) {
                alreadyReceivedMap.set(item.skuId, (alreadyReceivedMap.get(item.skuId) ?? 0) + item.qtyReceived);
            }

            for (const item of normalizedItems) {
                const orderedQty = orderedMap.get(item.skuId) ?? 0;
                const alreadyReceivedQty = alreadyReceivedMap.get(item.skuId) ?? 0;
                const projectedTotal = alreadyReceivedQty + item.qtyReceived;
                if (projectedTotal > orderedQty) {
                    throw new BadRequestException(
                        `Recebimento excede pedido para o item ${item.skuId}. Pedido: ${orderedQty}, já recebido: ${alreadyReceivedQty}, tentativa: ${item.qtyReceived}`,
                    );
                }
            }

            const entryType = await tx.movementType.findFirst({ where: { name: 'Entrada' } })
                ?? await tx.movementType.findFirst();
            if (!entryType) throw new NotFoundException('Tipo de movimentação "Entrada" não configurado. Execute o seed.');

            // Create receiving record
            const receiving = await tx.receiving.create({
                data: {
                    purchaseOrderId: data.purchaseOrderId,
                    receivedById: data.receivedById,
                    items: {
                        create: normalizedItems.map((item) => ({
                            skuId: item.skuId,
                            qtyReceived: item.qtyReceived,
                            divergenceNote: item.divergenceNote,
                        })),
                    },
                },
                include: {
                    items: { include: { sku: { select: { skuCode: true, name: true } } } },
                },
            });

            // Update stock balances and create stock movements for each received item
            for (const item of normalizedItems) {
                await tx.stockBalance.upsert({
                    where: { skuId_locationId: { skuId: item.skuId, locationId: data.locationId } },
                    update: { quantity: { increment: item.qtyReceived } },
                    create: { skuId: item.skuId, locationId: data.locationId, quantity: item.qtyReceived },
                });

                // Create StockMovement for audit trail
                await tx.stockMovement.create({
                    data: {
                        typeId: entryType.id,
                        skuId: item.skuId,
                        toLocationId: data.locationId,
                        qty: item.qtyReceived,
                        reason: `Recebimento PO ${po.number}`,
                        createdByInternalUserId: data.receivedById,
                        pinValidatedAt: new Date(),
                    },
                });
            }

            // Check if PO is fully received
            const allReceivings = await tx.receiving.findMany({
                where: { purchaseOrderId: data.purchaseOrderId },
                include: { items: true },
            });

            // Sum received per SKU
            const receivedMap = new Map<string, number>();
            for (const r of allReceivings) {
                for (const ri of r.items) {
                    receivedMap.set(ri.skuId, (receivedMap.get(ri.skuId) ?? 0) + ri.qtyReceived);
                }
            }

            // Check against ordered items
            const allReceived = po.items.every((item) => {
                const received = receivedMap.get(item.skuId) ?? 0;
                return received >= item.qtyOrdered;
            });

            const newStatus = allReceived ? 'COMPLETED' : 'PARTIAL';
            await tx.purchaseOrder.update({
                where: { id: data.purchaseOrderId },
                data: { status: newStatus },
            });

            // AuditLog
            await tx.auditLog.create({
                data: {
                    action: 'PURCHASE_RECEIVED',
                    entityType: 'Receiving',
                    entityId: receiving.id,
                    userId: data.receivedById,
                    details: {
                        po: po.number,
                        items: normalizedItems.map((i) => ({ skuId: i.skuId, qty: i.qtyReceived })),
                        newStatus,
                    },
                },
            });

            return { receiving, poStatus: newStatus };
        });
    }
}
