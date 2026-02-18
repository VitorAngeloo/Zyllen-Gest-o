import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogService {
    constructor(private readonly prisma: PrismaService) { }

    // ═══════════════════════════════════════════
    // CATEGORIES
    // ═══════════════════════════════════════════

    async findAllCategories(pagination?: { skip?: number; take?: number }) {
        const [data, total] = await Promise.all([
            this.prisma.category.findMany({
                include: { _count: { select: { skuItems: true } } },
                orderBy: { name: 'asc' },
                ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
            }),
            this.prisma.category.count(),
        ]);
        return { data, total };
    }

    async findCategoryById(id: string) {
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: { skuItems: { select: { id: true, skuCode: true, name: true } } },
        });
        if (!category) throw new NotFoundException('Categoria não encontrada');
        return category;
    }

    async createCategory(data: { name: string }) {
        const existing = await this.prisma.category.findUnique({ where: { name: data.name } });
        if (existing) throw new ConflictException('Categoria com este nome já existe');
        return this.prisma.category.create({ data });
    }

    async updateCategory(id: string, data: { name?: string }) {
        await this.findCategoryById(id);
        if (data.name) {
            const existing = await this.prisma.category.findFirst({
                where: { name: data.name, NOT: { id } },
            });
            if (existing) throw new ConflictException('Categoria com este nome já existe');
        }
        return this.prisma.category.update({ where: { id }, data });
    }

    async deleteCategory(id: string) {
        const category = await this.findCategoryById(id);
        if (category.skuItems.length > 0) {
            throw new ConflictException('Não é possível excluir categoria com SKUs vinculados');
        }
        return this.prisma.category.delete({ where: { id } });
    }

    // ═══════════════════════════════════════════
    // SKU ITEMS
    // ═══════════════════════════════════════════

    async findAllSkuItems(params?: { categoryId?: string; search?: string; skip?: number; take?: number }) {
        const where = {
            ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
            ...(params?.search ? {
                OR: [
                    { name: { contains: params.search } },
                    { skuCode: { contains: params.search } },
                    { barcode: { contains: params.search } },
                ],
            } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.skuItem.findMany({
                where,
                include: {
                    category: { select: { id: true, name: true } },
                    _count: { select: { assets: true } },
                },
                orderBy: { name: 'asc' },
                ...(params?.skip !== undefined ? { skip: params.skip, take: params.take } : {}),
            }),
            this.prisma.skuItem.count({ where }),
        ]);
        return { data, total };
    }

    async findSkuById(id: string) {
        const sku = await this.prisma.skuItem.findUnique({
            where: { id },
            include: {
                category: true,
                assets: { select: { id: true, assetCode: true, status: true } },
            },
        });
        if (!sku) throw new NotFoundException('SKU não encontrado');
        return sku;
    }

    async createSkuItem(data: { name: string; description?: string; brand?: string; barcode?: string; categoryId: string }) {
        // Verify category exists
        const category = await this.prisma.category.findUnique({ where: { id: data.categoryId } });
        if (!category) throw new NotFoundException('Categoria não encontrada');

        // Generate unique 6-digit SKU code
        const skuCode = await this.generateUniqueSku();

        return this.prisma.skuItem.create({
            data: { ...data, skuCode },
            include: { category: { select: { id: true, name: true } } },
        });
    }

    async updateSkuItem(id: string, data: { name?: string; description?: string; brand?: string; barcode?: string; categoryId?: string }) {
        await this.findSkuById(id);
        if (data.categoryId) {
            const category = await this.prisma.category.findUnique({ where: { id: data.categoryId } });
            if (!category) throw new NotFoundException('Categoria não encontrada');
        }
        return this.prisma.skuItem.update({
            where: { id },
            data,
            include: { category: { select: { id: true, name: true } } },
        });
    }

    async deleteSkuItem(id: string) {
        const sku = await this.findSkuById(id);
        if (sku.assets.length > 0) {
            throw new ConflictException('Não é possível excluir SKU com patrimônios vinculados');
        }
        return this.prisma.skuItem.delete({ where: { id } });
    }

    // ── Generate Unique 6-digit SKU Code ──
    private async generateUniqueSku(): Promise<string> {
        const MAX_RETRIES = 100;
        for (let i = 0; i < MAX_RETRIES; i++) {
            const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
            const existing = await this.prisma.skuItem.findUnique({ where: { skuCode: code } });
            if (!existing) return code;
        }
        throw new ConflictException('Não foi possível gerar um SKU único. Tente novamente.');
    }
}
