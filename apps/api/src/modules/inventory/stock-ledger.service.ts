import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StockLedgerService {
    constructor(private readonly prisma: PrismaService) { }

    async registerExitMovement(tx: any, data: {
        skuId: string;
        fromLocationId: string;
        qty: number;
        userId: string;
        reason?: string;
        assetId?: string;
        movementTypeId?: string;
        movementTypeName?: string;
        referenceType?: string;
        referenceId?: string;
    }) {
        const moveType = data.movementTypeId
            ? await tx.movementType.findUnique({ where: { id: data.movementTypeId } })
            : await tx.movementType.findFirst({ where: { name: data.movementTypeName ?? 'Saída' } })
                ?? await tx.movementType.findFirst();

        if (!moveType) {
            throw new NotFoundException('Tipo de movimentação não configurado. Execute o seed.');
        }

        const balance = await tx.stockBalance.findUnique({
            where: { skuId_locationId: { skuId: data.skuId, locationId: data.fromLocationId } },
        });
        if (!balance || balance.quantity < data.qty) {
            throw new BadRequestException(`Saldo insuficiente. Disponível: ${balance?.quantity ?? 0}`);
        }

        const movement = await tx.stockMovement.create({
            data: {
                typeId: moveType.id,
                skuId: data.skuId,
                fromLocationId: data.fromLocationId,
                qty: data.qty,
                reason: data.reason,
                createdByInternalUserId: data.userId,
                pinValidatedAt: new Date(),
                assetId: data.assetId,
                referenceType: data.referenceType,
                referenceId: data.referenceId,
            },
            include: {
                type: { select: { name: true } },
                sku: { select: { skuCode: true, name: true } },
                fromLocation: { select: { name: true } },
            },
        });

        await tx.stockBalance.update({
            where: { skuId_locationId: { skuId: data.skuId, locationId: data.fromLocationId } },
            data: { quantity: { decrement: data.qty } },
        });

        return { movement, moveType };
    }
}
