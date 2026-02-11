import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuppliersService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.supplier.findMany({
            include: { _count: { select: { purchaseOrders: true } } },
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string) {
        const supplier = await this.prisma.supplier.findUnique({
            where: { id },
            include: {
                purchaseOrders: {
                    select: { id: true, number: true, status: true, createdAt: true },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
        return supplier;
    }

    async create(data: { name: string; cnpj?: string; contact?: string }) {
        if (data.cnpj) {
            const existing = await this.prisma.supplier.findUnique({ where: { cnpj: data.cnpj } });
            if (existing) throw new ConflictException('Fornecedor com este CNPJ já existe');
        }
        return this.prisma.supplier.create({ data });
    }

    async update(id: string, data: { name?: string; cnpj?: string; contact?: string }) {
        await this.findById(id);
        if (data.cnpj) {
            const existing = await this.prisma.supplier.findFirst({
                where: { cnpj: data.cnpj, NOT: { id } },
            });
            if (existing) throw new ConflictException('Fornecedor com este CNPJ já existe');
        }
        return this.prisma.supplier.update({ where: { id }, data });
    }

    async delete(id: string) {
        const supplier = await this.findById(id);
        if (supplier.purchaseOrders.length > 0) {
            throw new ConflictException('Não é possível excluir fornecedor com pedidos vinculados');
        }
        return this.prisma.supplier.delete({ where: { id } });
    }
}
