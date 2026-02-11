import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
    constructor(private readonly prisma: PrismaService) { }

    // ── Open OS ──
    async openOS(data: { assetId: string; openedById: string; notes?: string }) {
        const asset = await this.prisma.asset.findUnique({ where: { id: data.assetId } });
        if (!asset) throw new NotFoundException('Patrimônio não encontrado');

        const os = await this.prisma.maintenanceOS.create({
            data: {
                assetId: data.assetId,
                openedById: data.openedById,
                notes: data.notes,
                status: 'OPEN',
            },
            include: {
                asset: { include: { sku: { select: { skuCode: true, name: true } } } },
                openedBy: { select: { name: true } },
            },
        });

        // Update asset status
        await this.prisma.asset.update({
            where: { id: data.assetId },
            data: { status: 'EM_MANUTENCAO' },
        });

        await this.prisma.auditLog.create({
            data: {
                action: 'MAINTENANCE_OPENED',
                entityType: 'MaintenanceOS',
                entityId: os.id,
                userId: data.openedById,
                details: JSON.stringify({ asset: asset.assetCode }),
            },
        });

        return os;
    }

    // ── List OS ──
    async findAll(params?: { status?: string; assetId?: string }) {
        return this.prisma.maintenanceOS.findMany({
            where: {
                ...(params?.status ? { status: params.status } : {}),
                ...(params?.assetId ? { assetId: params.assetId } : {}),
            },
            include: {
                asset: { include: { sku: { select: { skuCode: true, name: true } } } },
                openedBy: { select: { name: true } },
                closedBy: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ── Find by ID ──
    async findById(id: string) {
        const os = await this.prisma.maintenanceOS.findUnique({
            where: { id },
            include: {
                asset: { include: { sku: true, currentLocation: true } },
                openedBy: { select: { name: true } },
                closedBy: { select: { name: true } },
            },
        });
        if (!os) throw new NotFoundException('OS não encontrada');
        return os;
    }

    // ── Update status ──
    async updateStatus(id: string, status: string, userId: string, notes?: string) {
        const validStatuses = ['OPEN', 'IN_PROGRESS', 'CLOSED'];
        if (!validStatuses.includes(status)) {
            throw new BadRequestException(`Status inválido. Use: ${validStatuses.join(', ')}`);
        }

        const os = await this.findById(id);
        if (os.status === 'CLOSED') throw new BadRequestException('OS já encerrada');

        const updateData: any = { status };
        if (notes) updateData.notes = notes;
        if (status === 'CLOSED') {
            updateData.closedById = userId;
            // Restore asset status
            await this.prisma.asset.update({
                where: { id: os.assetId },
                data: { status: 'ATIVO' },
            });
        }

        const updated = await this.prisma.maintenanceOS.update({
            where: { id },
            data: updateData,
            include: {
                asset: { include: { sku: { select: { name: true } } } },
                openedBy: { select: { name: true } },
                closedBy: { select: { name: true } },
            },
        });

        await this.prisma.auditLog.create({
            data: {
                action: status === 'CLOSED' ? 'MAINTENANCE_CLOSED' : 'MAINTENANCE_UPDATED',
                entityType: 'MaintenanceOS',
                entityId: id,
                userId,
                details: JSON.stringify({ status, asset: os.asset.assetCode }),
            },
        });

        return updated;
    }
}
