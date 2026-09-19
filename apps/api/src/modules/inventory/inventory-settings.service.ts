import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class InventorySettingsService {
    constructor(private readonly prisma: PrismaService) {}

    async findAllMovementTypes() { return this.prisma.movementType.findMany({ orderBy: { name: 'asc' } }); }

    async createMovementType(data: { name: string; requiresApproval?: boolean; isFinalWriteOff?: boolean; setsAssetStatus?: string }) {
        return this.prisma.movementType.create({ data });
    }

    async updateMovementType(id: string, data: { name?: string; requiresApproval?: boolean; isFinalWriteOff?: boolean; setsAssetStatus?: string }) {
        const existing = await this.prisma.movementType.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Tipo não encontrado');
        return this.prisma.movementType.update({ where: { id }, data });
    }

    async deleteMovementType(id: string) {
        const existing = await this.prisma.movementType.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Tipo não encontrado');
        const count = await this.prisma.stockMovement.count({ where: { typeId: id } });
        if (count > 0) throw new BadRequestException('Tipo com movimentações vinculadas');
        return this.prisma.movementType.delete({ where: { id } });
    }

    async findAllExitReasons(params?: { onlyActive?: boolean }) {
        return this.prisma.exitReason.findMany({
            where: params?.onlyActive ? { active: true } : {},
            orderBy: { name: 'asc' },
        });
    }

    async createExitReason(data: { name?: string }) {
        const name = (data.name ?? '').trim();
        if (!name) throw new BadRequestException('Nome é obrigatório');
        const existing = await this.prisma.exitReason.findUnique({ where: { name } });
        if (existing) throw new ConflictException('Já existe um motivo de saída com esse nome');
        return this.prisma.exitReason.create({ data: { name } });
    }

    async updateExitReason(id: string, data: { name?: string; active?: boolean }) {
        const existing = await this.prisma.exitReason.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Motivo não encontrado');
        if (data.name) {
            const dup = await this.prisma.exitReason.findFirst({ where: { name: data.name.trim(), NOT: { id } } });
            if (dup) throw new ConflictException('Já existe um motivo de saída com esse nome');
        }
        return this.prisma.exitReason.update({
            where: { id },
            data: { ...(data.name ? { name: data.name.trim() } : {}), ...(data.active !== undefined ? { active: data.active } : {}) },
        });
    }

    async deleteExitReason(id: string) {
        const existing = await this.prisma.exitReason.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Motivo não encontrado');
        return this.prisma.exitReason.delete({ where: { id } });
    }
}
