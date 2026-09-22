import { validateFormData } from './utils/maintenance-form';
import { generateOsNumber } from './utils/os-number';
import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    ConflictException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { Prisma } from '@prisma/client';
import { MaintenanceStatus } from '@zyllen/shared';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { decryptCPFSafe } from '../../infrastructure/security/cpf-crypto';

 // 64 KB



// OS number generator: OS-YYYYMM-XXXX


@Injectable()
export class MaintenanceService {
    constructor(private readonly prisma: PrismaService) { }
    private transactionScope = false;

    // Serializa as mutações de uma mesma OS, incluindo confirmação/edição concorrentes.
    // A versão transacional não abre outra transação nem conecta outro PrismaClient.
    private async withOsLock<T>(osId: string, work: (service: MaintenanceService) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "MaintenanceOS" WHERE "id" = ${osId} FOR UPDATE`;
            const service = new MaintenanceService(tx as unknown as PrismaService);
            service.transactionScope = true;
            return work(service);
        });
    }

    // ── Open OS ──
    async openOS(data: {
        assetId?: string;
        companyId?: string;
        projectId?: string | null;
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
        if (data.openedByContractorId && data.assetId) {
            throw new ForbiddenException('Patrimônio não pode ser associado por este portal');
        }
        // Validate asset if provided
        let asset: any = null;
        if (data.assetId) {
            asset = await this.prisma.asset.findUnique({ where: { id: data.assetId } });
            if (!asset) throw new NotFoundException('Patrimônio não encontrado');
        }

        if (data.formData) validateFormData(data.formData);

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

        const os = await this.prisma.retry(() =>
            this.prisma.maintenanceOS.create({
                data: {
                    osNumber,
                    formType,
                    assetId: data.assetId ?? null,
                    companyId: data.companyId ?? null,
                    projectId: data.projectId ?? null,
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
                    status: MaintenanceStatus.OPEN,
                },
                include: {
                    asset: { include: { sku: { select: { skuCode: true, name: true } } } },
                    company: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                    openedBy: { select: { name: true } },
                    openedByContractor: { select: { name: true } },
                },
            }),
        );

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
    async findAll(params?: { status?: string; formType?: string; assetId?: string; openedByContractorId?: string; openedById?: string; companyId?: string; origin?: 'INTERNAL' | 'CONTRACTOR'; search?: string; skip?: number; take?: number }) {
        const search = params?.search?.trim().slice(0, 120);
        const where: Prisma.MaintenanceOSWhereInput = {
            ...(params?.status ? { status: params.status } : {}),
            ...(params?.formType ? { formType: params.formType } : {}),
            ...(params?.assetId ? { assetId: params.assetId } : {}),
            ...(params?.openedByContractorId ? { openedByContractorId: params.openedByContractorId } : {}),
            ...(params?.openedById ? { openedById: params.openedById } : {}),
            ...(params?.companyId ? { companyId: params.companyId } : {}),
            ...(params?.origin === 'INTERNAL' ? { openedById: { not: null }, openedByContractorId: null } : {}),
            ...(params?.origin === 'CONTRACTOR' ? { openedByContractorId: { not: null } } : {}),
            ...(search ? { OR: [
                { osNumber: { contains: search, mode: 'insensitive' } },
                { clientName: { contains: search, mode: 'insensitive' } },
                { company: { name: { contains: search, mode: 'insensitive' } } },
                { project: { name: { contains: search, mode: 'insensitive' } } },
            ] } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.maintenanceOS.findMany({
                where,
                include: {
                    asset: { include: { sku: { select: { skuCode: true, name: true } } } },
                    company: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                    openedBy: { select: { name: true } },
                    openedByContractor: { select: { name: true } },
                    closedBy: { select: { name: true } },
                },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
                company: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } },
                openedBy: { select: { name: true } },
                openedByContractor: { select: { name: true } },
                assignedTo: { select: { id: true, name: true } },
                closedBy: { select: { name: true } },
                attachments: { orderBy: { createdAt: 'desc' } },
                followupBlocks: {
                    orderBy: { order: 'asc' },
                    include: { attachments: { orderBy: { createdAt: 'asc' } } },
                },
            },
        });
        if (!os) throw new NotFoundException('OS não encontrada');
        return os;
    }

    // Transições válidas entre estados de OS
    private static readonly STATUS_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
        [MaintenanceStatus.OPEN]: [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CLOSED],
        [MaintenanceStatus.IN_PROGRESS]: [MaintenanceStatus.CLOSED],
        [MaintenanceStatus.CLOSED]: [],
    };

    // ── Update status ──
    async updateStatus(id: string, status: string, userId: string, notes?: string, isContractor = false): Promise<Prisma.MaintenanceOSGetPayload<{}>> {
        if (!this.transactionScope) return this.withOsLock(id, (s) => s.updateStatus(id, status, userId, notes, isContractor));
        if (!Object.values(MaintenanceStatus).includes(status as MaintenanceStatus)) {
            throw new BadRequestException(`Status inválido. Use: ${Object.values(MaintenanceStatus).join(', ')}`);
        }

        const os = await this.findById(id);
        if (os.status === MaintenanceStatus.CLOSED) throw new BadRequestException('OS já encerrada');

        const allowed = MaintenanceService.STATUS_TRANSITIONS[os.status as MaintenanceStatus] ?? [];
        if (!allowed.includes(status as MaintenanceStatus)) {
            throw new BadRequestException(
                `Transição inválida: ${os.status} → ${status}. Permitido: ${allowed.join(', ') || 'nenhum'}`,
            );
        }

        const updateData: any = { status };
        // Preserve the [previousStatus:...] tag when updating notes
        if (notes) {
            const prevTag = os.notes?.match(/\[previousStatus:\w+\]/);
            updateData.notes = prevTag ? `${prevTag[0]} ${notes}` : notes;
        }
        if (status === MaintenanceStatus.CLOSED) {
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
                    action: status === MaintenanceStatus.CLOSED ? 'MAINTENANCE_CLOSED' : 'MAINTENANCE_UPDATED',
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
    }, isContractor = false): Promise<Prisma.MaintenanceOSGetPayload<{}>> {
        if (!this.transactionScope) return this.withOsLock(id, (s) => s.updateFormData(id, userId, data, isContractor));
        validateFormData(data.formData);

        const os = await this.findById(id);
        if (os.status === MaintenanceStatus.CLOSED) throw new BadRequestException('OS já encerrada');

        // Ownership check — contractors can only edit their own OS
        if (isContractor && os.openedByContractorId !== userId) {
            throw new ForbiddenException('OS não pertence a este terceirizado');
        }

        // Signature lock — once witness signature is stored, service details are immutable
        const existingFormData = os.formData as Record<string, unknown> | null;
        if (existingFormData?.witnessSignature && data.formData.witnessSignature !== existingFormData.witnessSignature) {
            throw new ForbiddenException('Assinatura registrada é imutável');
        }
        if (existingFormData?.witnessSignature) {
            throw new ForbiddenException('Formulário bloqueado: detalhes do serviço não podem ser alterados após a assinatura do cliente');
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

    // ── Client witness signature ──
    async clientSignWitness(osId: string, companyId: string, signature: string): Promise<Prisma.MaintenanceOSGetPayload<{}>> {
        if (!this.transactionScope) return this.withOsLock(osId, (s) => s.clientSignWitness(osId, companyId, signature));
        if (!signature || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(signature)) {
            throw new BadRequestException('Assinatura inválida');
        }
        const os = await this.findById(osId);
        if (os.companyId !== companyId) throw new ForbiddenException('OS não pertence à sua empresa');
        if (os.status === MaintenanceStatus.CLOSED) throw new BadRequestException('OS já encerrada');

        const existingFormData = (os.formData as Record<string, unknown>) || {};
        if (existingFormData.witnessSignature) throw new ForbiddenException('Assinatura registrada é imutável');
        const newFormData = { ...existingFormData, witnessSignature: signature };
        validateFormData(newFormData);

        return this.prisma.maintenanceOS.update({
            where: { id: osId },
            data: { formData: newFormData as Prisma.InputJsonValue },
        });
    }

    // ── Find all contractors ──
    async findAllContractors() {
        const rows = await this.prisma.contractorUser.findMany({
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
            take: 500,
        });
        return rows.map((r) => ({ ...r, cpf: decryptCPFSafe(r.cpf) }));
    }

    // ── Attachments ──

    async addAttachments(
        osId: string,
        files: { fileName: string; filePath: string; mimeType?: string }[],
        uploadedById?: string,
    ) {
        // Verify OS exists
        await this.findById(osId);

        return this.prisma.maintenanceAttachment.createMany({
            data: files.map((f) => ({
                maintenanceOSId: osId,
                fileName: f.fileName,
                filePath: f.filePath,
                mimeType: f.mimeType ?? null,
                uploadedById: uploadedById ?? null,
            })),
        });
    }

    async findAttachments(osId: string) {
        return this.prisma.maintenanceAttachment.findMany({
            where: { maintenanceOSId: osId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async deleteAttachment(osId: string, attachmentId: string) {
        const att = await this.prisma.maintenanceAttachment.findFirst({
            where: { id: attachmentId, maintenanceOSId: osId },
        });
        if (!att) throw new NotFoundException('Anexo não encontrado');

        await this.prisma.maintenanceAttachment.delete({ where: { id: attachmentId } });
        return att;
    }

    // ── Followup Blocks (Acompanhamento de 7 dias) ──

    async findFollowupBlocks(osId: string) {
        await this.findById(osId);
        return this.prisma.maintenanceOSFollowupBlock.findMany({
            where: { maintenanceOSId: osId },
            orderBy: { order: 'asc' },
            include: { attachments: { orderBy: { createdAt: 'asc' } } },
        });
    }

    async addFollowupBlock(osId: string, data: { type: string; content?: string; order?: number }) {
        await this.findById(osId);
        return this.prisma.maintenanceOSFollowupBlock.create({
            data: {
                maintenanceOSId: osId,
                type: data.type,
                content: data.content ?? null,
                order: data.order ?? 0,
            },
            include: { attachments: true },
        });
    }

    async updateFollowupBlock(osId: string, blockId: string, data: { content?: string; order?: number }): Promise<Prisma.MaintenanceOSFollowupBlockGetPayload<{ include: { attachments: true } }>> {
        if (!this.transactionScope) return this.withOsLock(osId, (s) => s.updateFollowupBlock(osId, blockId, data));
        const block = await this.prisma.maintenanceOSFollowupBlock.findFirst({
            where: { id: blockId, maintenanceOSId: osId },
        });
        if (!block) throw new NotFoundException('Bloco não encontrado');
        if (block.isLocked) throw new ForbiddenException('Este bloco está confirmado e não pode ser alterado');
        return this.prisma.maintenanceOSFollowupBlock.update({
            where: { id: blockId },
            data: {
                ...(data.content !== undefined ? { content: data.content } : {}),
                ...(data.order !== undefined ? { order: data.order } : {}),
            },
            include: { attachments: true },
        });
    }

    async lockFollowupBlock(osId: string, blockId: string): Promise<Prisma.MaintenanceOSFollowupBlockGetPayload<{ include: { attachments: true } }>> {
        if (!this.transactionScope) return this.withOsLock(osId, (s) => s.lockFollowupBlock(osId, blockId));
        const block = await this.prisma.maintenanceOSFollowupBlock.findFirst({
            where: { id: blockId, maintenanceOSId: osId },
        });
        if (!block) throw new NotFoundException('Bloco não encontrado');
        if (block.isLocked) throw new BadRequestException('Bloco já está confirmado');
        if (block.type !== 'SIGNATURE' || !block.content || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(block.content)) {
            throw new BadRequestException('Preencha uma assinatura PNG antes de confirmar');
        }
        return this.prisma.maintenanceOSFollowupBlock.update({
            where: { id: blockId },
            data: { isLocked: true },
            include: { attachments: true },
        });
    }

    async removeFollowupBlock(osId: string, blockId: string): Promise<void> {
        if (!this.transactionScope) return this.withOsLock(osId, (s) => s.removeFollowupBlock(osId, blockId));
        const block = await this.prisma.maintenanceOSFollowupBlock.findFirst({
            where: { id: blockId, maintenanceOSId: osId },
        });
        if (!block) throw new NotFoundException('Bloco não encontrado');
        if (block.isLocked) throw new ForbiddenException('Bloco confirmado é imutável e não pode ser excluído');
        await this.prisma.maintenanceOSFollowupBlock.delete({ where: { id: blockId } });
    }

    async addFollowupBlockAttachments(
        osId: string,
        blockId: string,
        files: { fileName: string; filePath: string; mimeType?: string }[],
    ): Promise<Prisma.MaintenanceOSFollowupBlockGetPayload<{ include: { attachments: true } }> | null> {
        if (!this.transactionScope) return this.withOsLock(osId, (s) => s.addFollowupBlockAttachments(osId, blockId, files));
        const block = await this.prisma.maintenanceOSFollowupBlock.findFirst({
            where: { id: blockId, maintenanceOSId: osId },
        });
        if (!block) throw new NotFoundException('Bloco não encontrado');
        if (block.isLocked) throw new ForbiddenException('Bloco confirmado é imutável');
        await this.prisma.maintenanceOSFollowupAttachment.createMany({
            data: files.map((f) => ({
                blockId,
                fileName: f.fileName,
                filePath: f.filePath,
                mimeType: f.mimeType ?? null,
            })),
        });
        return this.prisma.maintenanceOSFollowupBlock.findUnique({
            where: { id: blockId },
            include: { attachments: { orderBy: { createdAt: 'asc' } } },
        });
    }

    async removeFollowupBlockAttachment(osId: string, blockId: string, attId: string): Promise<Prisma.MaintenanceOSFollowupAttachmentGetPayload<{}>> {
        if (!this.transactionScope) return this.withOsLock(osId, (s) => s.removeFollowupBlockAttachment(osId, blockId, attId));
        const block = await this.prisma.maintenanceOSFollowupBlock.findFirst({ where: { id: blockId, maintenanceOSId: osId } });
        if (!block) throw new NotFoundException('Bloco não encontrado');
        if (block.isLocked) throw new ForbiddenException('Bloco confirmado é imutável');
        const att = await this.prisma.maintenanceOSFollowupAttachment.findFirst({
            where: { id: attId, blockId, block: { maintenanceOSId: osId } },
        });
        if (!att) throw new NotFoundException('Anexo não encontrado');
        await this.prisma.maintenanceOSFollowupAttachment.delete({ where: { id: attId } });
        return att;
    }

}
