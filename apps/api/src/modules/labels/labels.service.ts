import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LabelsService {
    constructor(private readonly prisma: PrismaService) { }

    // ── Register print job ──
    async registerPrint(data: { assetId: string; printedById: string }) {
        const asset = await this.prisma.asset.findUnique({
            where: { id: data.assetId },
            include: { sku: { select: { skuCode: true, name: true, barcode: true } } },
        });
        if (!asset) throw new NotFoundException('Patrimônio não encontrado');

        const printJob = await this.prisma.labelPrintJob.create({
            data: {
                assetId: data.assetId,
                printedById: data.printedById,
            },
            include: {
                asset: {
                    include: { sku: { select: { skuCode: true, name: true, barcode: true } } },
                },
                printedBy: { select: { name: true } },
            },
        });

        // AuditLog
        await this.prisma.auditLog.create({
            data: {
                action: 'LABEL_PRINTED',
                entityType: 'LabelPrintJob',
                entityId: printJob.id,
                userId: data.printedById,
                details: JSON.stringify({ assetCode: asset.assetCode, sku: asset.sku.skuCode }),
            },
        });

        return printJob;
    }

    // ── List print history ──
    async findAll(params?: { assetId?: string }) {
        return this.prisma.labelPrintJob.findMany({
            where: params?.assetId ? { assetId: params.assetId } : {},
            include: {
                asset: {
                    include: { sku: { select: { skuCode: true, name: true } } },
                },
                printedBy: { select: { name: true } },
            },
            orderBy: { printedAt: 'desc' },
        });
    }

    // ── Get label data (for PDF generation) ──
    async getLabelData(assetId: string) {
        const asset = await this.prisma.asset.findUnique({
            where: { id: assetId },
            include: {
                sku: { include: { category: true } },
                currentLocation: true,
            },
        });
        if (!asset) throw new NotFoundException('Patrimônio não encontrado');

        return {
            assetCode: asset.assetCode,
            skuCode: asset.sku.skuCode,
            skuName: asset.sku.name,
            brand: asset.sku.brand,
            barcode: asset.sku.barcode,
            category: asset.sku.category.name,
            location: asset.currentLocation?.name ?? 'Sem local',
            status: asset.status,
        };
    }

    // ── Label Templates CRUD ──
    async findAllTemplates() {
        return this.prisma.labelTemplate.findMany({ orderBy: { name: 'asc' } });
    }

    async createTemplate(data: { name: string; layout: string }) {
        return this.prisma.labelTemplate.create({ data });
    }

    async updateTemplate(id: string, data: { name?: string; layout?: string }) {
        const existing = await this.prisma.labelTemplate.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Template não encontrado');
        return this.prisma.labelTemplate.update({ where: { id }, data });
    }

    async deleteTemplate(id: string) {
        const existing = await this.prisma.labelTemplate.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Template não encontrado');
        return this.prisma.labelTemplate.delete({ where: { id } });
    }
}
