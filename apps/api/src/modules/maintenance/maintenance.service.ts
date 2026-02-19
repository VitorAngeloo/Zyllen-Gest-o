import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

// OS number generator: OS-YYYYMM-XXXX
function generateOsNumber(): string {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `OS-${ym}-${rand}`;
}

@Injectable()
export class MaintenanceService {
    constructor(private readonly prisma: PrismaService) { }

    // ── Open OS ──
    async openOS(data: {
        assetId?: string;
        openedById?: string;
        openedByContractorId?: string;
        notes?: string;
        formType?: string;
        clientName?: string;
        clientCity?: string;
        clientState?: string;
        location?: string;
        contactName?: string;
        contactPhone?: string;
        contactRole?: string;
        startedAt?: string;
        endedAt?: string;
        scheduledDate?: string;
        formData?: Record<string, unknown>;
    }) {
        // Validate asset if provided
        let asset: any = null;
        if (data.assetId) {
            asset = await this.prisma.asset.findUnique({ where: { id: data.assetId } });
            if (!asset) throw new NotFoundException('Patrimônio não encontrado');
        }

        const formType = data.formType || 'TERCEIRIZADO';

        // Generate unique OS number
        let osNumber = generateOsNumber();
        let attempts = 0;
        while (attempts < 10) {
            const existing = await this.prisma.maintenanceOS.findUnique({ where: { osNumber } });
            if (!existing) break;
            osNumber = generateOsNumber();
            attempts++;
        }
        if (attempts >= 10) {
            throw new ConflictException('Não foi possível gerar um número de OS único. Tente novamente.');
        }

        const os = await this.prisma.maintenanceOS.create({
            data: {
                osNumber,
                formType,
                assetId: data.assetId ?? null,
                openedById: data.openedById ?? null,
                openedByContractorId: data.openedByContractorId ?? null,
                notes: asset
                    ? (data.notes ? `[previousStatus:${asset.status}] ${data.notes}` : `[previousStatus:${asset.status}]`)
                    : (data.notes || null),
                clientName: data.clientName ?? null,
                clientCity: data.clientCity ?? null,
                clientState: data.clientState ?? null,
                location: data.location ?? null,
                contactName: data.contactName ?? null,
                contactPhone: data.contactPhone ?? null,
                contactRole: data.contactRole ?? null,
                startedAt: data.startedAt ? new Date(data.startedAt) : null,
                endedAt: data.endedAt ? new Date(data.endedAt) : null,
                scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
                formData: data.formData ? (data.formData as Prisma.InputJsonValue) : Prisma.JsonNull,
                status: 'OPEN',
            },
            include: {
                asset: { include: { sku: { select: { skuCode: true, name: true } } } },
                openedBy: { select: { name: true } },
                openedByContractor: { select: { name: true } },
            },
        });

        // Update asset status if asset provided
        if (data.assetId && asset) {
            await this.prisma.asset.update({
                where: { id: data.assetId },
                data: { status: 'EM_MANUTENCAO' },
            });
        }

        // Only create audit log if opened by internal user (has userId for FK)
        if (data.openedById) {
            await this.prisma.auditLog.create({
                data: {
                    action: 'MAINTENANCE_OPENED',
                    entityType: 'MaintenanceOS',
                    entityId: os.id,
                    userId: data.openedById,
                    details: { osNumber, formType, asset: asset?.assetCode },
                },
            });
        }

        return os;
    }

    // ── List OS ──
    async findAll(params?: { status?: string; formType?: string; assetId?: string; openedByContractorId?: string; openedById?: string; skip?: number; take?: number }) {
        const where = {
            ...(params?.status ? { status: params.status } : {}),
            ...(params?.formType ? { formType: params.formType } : {}),
            ...(params?.assetId ? { assetId: params.assetId } : {}),
            ...(params?.openedByContractorId ? { openedByContractorId: params.openedByContractorId } : {}),
            ...(params?.openedById ? { openedById: params.openedById } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.maintenanceOS.findMany({
                where,
                include: {
                    asset: { include: { sku: { select: { skuCode: true, name: true } } } },
                    openedBy: { select: { name: true } },
                    openedByContractor: { select: { name: true } },
                    closedBy: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                ...(params?.skip !== undefined ? { skip: params.skip, take: params.take } : {}),
            }),
            this.prisma.maintenanceOS.count({ where }),
        ]);
        // Parse formData JSON for each record
        const parsed = data.map((os) => ({
            ...os,
        }));
        return { data: parsed, total };
    }

    // ── Find by ID ──
    async findById(id: string) {
        const os = await this.prisma.maintenanceOS.findUnique({
            where: { id },
            include: {
                asset: { include: { sku: true, currentLocation: true } },
                openedBy: { select: { name: true } },
                openedByContractor: { select: { name: true } },
                closedBy: { select: { name: true } },
            },
        });
        if (!os) throw new NotFoundException('OS não encontrada');
        return os;
    }

    // ── Update status ──
    async updateStatus(id: string, status: string, userId: string, notes?: string, isContractor = false) {
        const validStatuses = ['OPEN', 'IN_PROGRESS', 'CLOSED'];
        if (!validStatuses.includes(status)) {
            throw new BadRequestException(`Status inválido. Use: ${validStatuses.join(', ')}`);
        }

        const os = await this.findById(id);
        if (os.status === 'CLOSED') throw new BadRequestException('OS já encerrada');

        const updateData: any = { status };
        // Preserve the [previousStatus:...] tag when updating notes
        if (notes) {
            const prevTag = os.notes?.match(/\[previousStatus:\w+\]/);
            updateData.notes = prevTag ? `${prevTag[0]} ${notes}` : notes;
        }
        if (status === 'CLOSED') {
            updateData.closedById = userId;
            updateData.completedAt = new Date();
            // Restore previous asset status from the notes field (only if asset exists)
            if (os.assetId) {
                const previousStatusMatch = os.notes?.match(/\[previousStatus:(\w+)\]/);
                const previousStatus = previousStatusMatch ? previousStatusMatch[1] : 'ATIVO';
                await this.prisma.asset.update({
                    where: { id: os.assetId },
                    data: { status: previousStatus },
                });
            }
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

        // Only create audit log for internal users (AuditLog FK references InternalUser)
        if (!isContractor) {
            await this.prisma.auditLog.create({
                data: {
                    action: status === 'CLOSED' ? 'MAINTENANCE_CLOSED' : 'MAINTENANCE_UPDATED',
                    entityType: 'MaintenanceOS',
                    entityId: id,
                    userId,
                    details: { status, asset: os.asset?.assetCode },
                },
            });
        }

        return updated;
    }

    // ── Update form data (progressive fill) ──
    async updateFormData(id: string, userId: string, data: {
        formData: Record<string, unknown>;
        notes?: string;
        clientName?: string;
        clientCity?: string;
        clientState?: string;
        location?: string;
        contactName?: string;
        contactPhone?: string;
        contactRole?: string;
        startedAt?: string;
        endedAt?: string;
    }, isContractor = false) {
        const os = await this.findById(id);
        if (os.status === 'CLOSED') throw new BadRequestException('OS já encerrada');

        // Ownership check
        if (isContractor && os.openedByContractorId !== userId) {
            throw new BadRequestException('OS não pertence a este terceirizado');
        }

        const updateData: any = {
            formData: data.formData,
        };
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.clientName !== undefined) updateData.clientName = data.clientName;
        if (data.clientCity !== undefined) updateData.clientCity = data.clientCity;
        if (data.clientState !== undefined) updateData.clientState = data.clientState;
        if (data.location !== undefined) updateData.location = data.location;
        if (data.contactName !== undefined) updateData.contactName = data.contactName;
        if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
        if (data.contactRole !== undefined) updateData.contactRole = data.contactRole;
        if (data.startedAt !== undefined) updateData.startedAt = data.startedAt ? new Date(data.startedAt) : null;
        if (data.endedAt !== undefined) updateData.endedAt = data.endedAt ? new Date(data.endedAt) : null;

        const updated = await this.prisma.maintenanceOS.update({
            where: { id },
            data: updateData,
            include: {
                asset: { include: { sku: { select: { name: true } } } },
                openedBy: { select: { name: true } },
                openedByContractor: { select: { name: true } },
            },
        });

        return updated;
    }

    // ── Find all contractors ──
    async findAllContractors() {
        return this.prisma.contractorUser.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                city: true,
                state: true,
                cpf: true,
                isActive: true,
                createdAt: true,
                _count: { select: { maintenanceOrders: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
}
