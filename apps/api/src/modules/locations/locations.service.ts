import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LocationsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.location.findMany({
            include: {
                _count: { select: { stockBalances: true, assets: true } },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string) {
        const location = await this.prisma.location.findUnique({
            where: { id },
            include: {
                stockBalances: {
                    include: { sku: { select: { id: true, skuCode: true, name: true } } },
                },
            },
        });
        if (!location) throw new NotFoundException('Local não encontrado');
        return location;
    }

    async create(data: { name: string; description?: string }) {
        const existing = await this.prisma.location.findUnique({ where: { name: data.name } });
        if (existing) throw new ConflictException('Local com este nome já existe');
        return this.prisma.location.create({ data });
    }

    async update(id: string, data: { name?: string; description?: string }) {
        await this.findById(id);
        if (data.name) {
            const existing = await this.prisma.location.findFirst({
                where: { name: data.name, NOT: { id } },
            });
            if (existing) throw new ConflictException('Local com este nome já existe');
        }
        return this.prisma.location.update({ where: { id }, data });
    }

    async delete(id: string) {
        const location = await this.findById(id);
        if (location.stockBalances.length > 0) {
            throw new ConflictException('Não é possível excluir local com saldos de estoque');
        }
        return this.prisma.location.delete({ where: { id } });
    }
}
