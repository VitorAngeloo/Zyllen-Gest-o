import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type LabelDataContractV1 = {
    contractVersion: 'v1';
    layoutVersion: '1';
    templateId: string | null;
    assetId: string;
    assetCode: string;
    skuId: string;
    skuCode: string;
    skuName: string;
    description: string;
    brand?: string | null;
    barcode?: string | null;
    barcodeValue: string;
    qrContent: string;
    category: string;
    location: string;
    status: string;
};

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
                details: { assetCode: asset.assetCode, sku: asset.sku.skuCode },
            },
        });

        return printJob;
    }

    // ── Register batch print jobs ──
    async registerPrintBatch(data: { assetIds: string[]; printedById: string }) {
        const assets = await this.prisma.asset.findMany({
            where: { id: { in: data.assetIds } },
            include: {
                sku: { include: { category: true } },
                currentLocation: true,
            },
        });

        if (assets.length === 0) throw new NotFoundException('Nenhum patrimônio encontrado');

        // Create all print jobs in one transaction
        await this.prisma.$transaction(async (tx) => {
            await tx.labelPrintJob.createMany({
                data: assets.map((a) => ({ assetId: a.id, printedById: data.printedById })),
            });
            await tx.auditLog.createMany({
                data: assets.map((a) => ({
                    action: 'LABEL_PRINTED_BATCH',
                    entityType: 'Asset',
                    entityId: a.id,
                    userId: data.printedById,
                    details: { assetCode: a.assetCode, skuCode: a.sku.skuCode },
                })),
            });
        });

        // Return label data for each asset so the frontend can render the print sheet.
        // O QR contém apenas o código de patrimônio, para que o leitor devolva um
        // código limpo e pesquisável (bipagem rápida por patrimônio).
        const labelData = assets.map((asset) => {
            const qrContent = asset.assetCode;
            return {
                assetId: asset.id,
                assetCode: asset.assetCode,
                skuCode: asset.sku.skuCode,
                skuName: asset.sku.name,
                category: asset.sku.category.name,
                location: asset.currentLocation?.name ?? 'Sem local',
                status: asset.status,
                qrContent,
            };
        });

        return { count: assets.length, labelData };
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

        const description = asset.sku.description ?? asset.sku.name;
        const barcodeValue = asset.assetCode;
        // QR contém apenas o código de patrimônio (leitor devolve código limpo).
        const qrContent = asset.assetCode;

        const payload: LabelDataContractV1 = {
            contractVersion: 'v1',
            layoutVersion: '1',
            templateId: null,
            assetId: asset.id,
            assetCode: asset.assetCode,
            skuId: asset.skuId,
            skuCode: asset.sku.skuCode,
            skuName: asset.sku.name,
            description,
            brand: asset.sku.brand,
            barcode: asset.sku.barcode,
            barcodeValue,
            qrContent,
            category: asset.sku.category.name,
            location: asset.currentLocation?.name ?? 'Sem local',
            status: asset.status,
        };

        return payload;
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
