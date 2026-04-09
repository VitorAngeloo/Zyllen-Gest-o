import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Code generator: AC-YYYYMM-XXXX
function generateFollowupCode(): string {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `AC-${ym}-${rand}`;
}

const FOLLOWUP_INCLUDE = {
    company: { select: { id: true, name: true, cnpj: true, address: true, city: true, state: true, phone: true } },
    createdBy: { select: { id: true, name: true, email: true } },
    blocks: {
        orderBy: { order: 'asc' as const },
        include: {
            attachments: { orderBy: { createdAt: 'desc' as const } },
            comments: {
                orderBy: { createdAt: 'asc' as const },
                include: { author: { select: { id: true, name: true } } },
            },
        },
    },
};

@Injectable()
export class FollowupsService {
    constructor(private readonly prisma: PrismaService) { }

    // ── Create ──
    async create(data: {
        companyId: string;
        createdById: string;
        responsibleName?: string;
        responsibleContact?: string;
    }) {
        // Validate company exists
        const company = await this.prisma.company.findUnique({ where: { id: data.companyId } });
        if (!company) throw new NotFoundException('Empresa não encontrada');

        // Generate unique code
        let code = generateFollowupCode();
        let attempts = 0;
        while (attempts < 10) {
            const existing = await this.prisma.followup.findUnique({ where: { code } });
            if (!existing) break;
            code = generateFollowupCode();
            attempts++;
        }
        if (attempts >= 10) {
            throw new BadRequestException('Não foi possível gerar um código único. Tente novamente.');
        }

        const followup = await this.prisma.followup.create({
            data: {
                code,
                companyId: data.companyId,
                createdById: data.createdById,
                responsibleName: data.responsibleName ?? null,
                responsibleContact: data.responsibleContact ?? null,
                status: 'IN_PROGRESS',
            },
            include: FOLLOWUP_INCLUDE,
        });

        // History
        await this.prisma.followupHistory.create({
            data: {
                followupId: followup.id,
                userId: data.createdById,
                action: 'CREATED',
                details: { code, companyName: company.name },
            },
        });

        return followup;
    }

    // ── List ──
    async findAll(params?: {
        status?: string;
        companyId?: string;
        search?: string;
        skip?: number;
        take?: number;
    }) {
        const where: Prisma.FollowupWhereInput = {};
        if (params?.status) where.status = params.status;
        if (params?.companyId) where.companyId = params.companyId;
        if (params?.search) {
            where.OR = [
                { code: { contains: params.search, mode: 'insensitive' } },
                { company: { name: { contains: params.search, mode: 'insensitive' } } },
                { responsibleName: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.prisma.followup.findMany({
                where,
                include: {
                    company: { select: { id: true, name: true, cnpj: true } },
                    createdBy: { select: { id: true, name: true } },
                    _count: { select: { blocks: true } },
                },
                orderBy: { createdAt: 'desc' },
                ...(params?.skip !== undefined ? { skip: params.skip, take: params.take } : {}),
            }),
            this.prisma.followup.count({ where }),
        ]);

        return { data, total };
    }

    // ── Find by ID ──
    async findById(id: string) {
        const followup = await this.prisma.followup.findUnique({
            where: { id },
            include: FOLLOWUP_INCLUDE,
        });
        if (!followup) throw new NotFoundException('Acompanhamento não encontrado');
        return followup;
    }

    // ── Update ──
    async update(id: string, userId: string, data: {
        responsibleName?: string;
        responsibleContact?: string;
        status?: string;
    }) {
        const followup = await this.findById(id);

        if (data.status) {
            const valid = ['IN_PROGRESS', 'PENDING', 'COMPLETED'];
            if (!valid.includes(data.status)) {
                throw new BadRequestException(`Status inválido. Use: ${valid.join(', ')}`);
            }
        }

        const updateData: any = {};
        if (data.responsibleName !== undefined) updateData.responsibleName = data.responsibleName;
        if (data.responsibleContact !== undefined) updateData.responsibleContact = data.responsibleContact;
        if (data.status !== undefined) updateData.status = data.status;

        const updated = await this.prisma.followup.update({
            where: { id },
            data: updateData,
            include: FOLLOWUP_INCLUDE,
        });

        // History
        await this.prisma.followupHistory.create({
            data: {
                followupId: id,
                userId,
                action: data.status ? 'STATUS_CHANGED' : 'UPDATED',
                details: {
                    ...(data.status ? { status: data.status, previousStatus: followup.status } : {}),
                    ...(data.responsibleName !== undefined ? { responsibleName: data.responsibleName } : {}),
                    ...(data.responsibleContact !== undefined ? { responsibleContact: data.responsibleContact } : {}),
                },
            },
        });

        return updated;
    }

    // ── Delete ──
    async remove(id: string) {
        await this.findById(id);
        await this.prisma.followup.delete({ where: { id } });
    }

    // ── Blocks ──

    async addBlock(followupId: string, userId: string, data: {
        type: string;
        title?: string;
        content?: string;
    }) {
        await this.findById(followupId);

        // Get max order
        const maxOrder = await this.prisma.followupBlock.aggregate({
            where: { followupId },
            _max: { order: true },
        });
        const order = (maxOrder._max.order ?? -1) + 1;

        const block = await this.prisma.followupBlock.create({
            data: {
                followupId,
                type: data.type,
                title: data.title ?? null,
                content: data.content ?? null,
                order,
            },
            include: {
                attachments: true,
                comments: { include: { author: { select: { id: true, name: true } } } },
            },
        });

        await this.prisma.followupHistory.create({
            data: {
                followupId,
                userId,
                action: 'BLOCK_ADDED',
                details: { blockId: block.id, type: data.type, title: data.title },
            },
        });

        return block;
    }

    async updateBlock(followupId: string, blockId: string, userId: string, data: {
        title?: string;
        content?: string;
    }) {
        const block = await this.prisma.followupBlock.findFirst({
            where: { id: blockId, followupId },
        });
        if (!block) throw new NotFoundException('Bloco não encontrado');

        const updated = await this.prisma.followupBlock.update({
            where: { id: blockId },
            data: {
                ...(data.title !== undefined ? { title: data.title } : {}),
                ...(data.content !== undefined ? { content: data.content } : {}),
            },
            include: {
                attachments: true,
                comments: { include: { author: { select: { id: true, name: true } } } },
            },
        });

        await this.prisma.followupHistory.create({
            data: {
                followupId,
                userId,
                action: 'BLOCK_UPDATED',
                details: { blockId, title: data.title },
            },
        });

        return updated;
    }

    async removeBlock(followupId: string, blockId: string, userId: string) {
        const block = await this.prisma.followupBlock.findFirst({
            where: { id: blockId, followupId },
        });
        if (!block) throw new NotFoundException('Bloco não encontrado');

        await this.prisma.followupBlock.delete({ where: { id: blockId } });

        await this.prisma.followupHistory.create({
            data: {
                followupId,
                userId,
                action: 'BLOCK_REMOVED',
                details: { blockId, type: block.type, title: block.title },
            },
        });
    }

    // ── Attachments ──

    async addBlockAttachments(
        followupId: string,
        blockId: string,
        files: { fileName: string; filePath: string; mimeType?: string }[],
        uploadedById?: string,
    ) {
        const block = await this.prisma.followupBlock.findFirst({
            where: { id: blockId, followupId },
        });
        if (!block) throw new NotFoundException('Bloco não encontrado');

        await this.prisma.followupBlockAttachment.createMany({
            data: files.map((f) => ({
                blockId,
                fileName: f.fileName,
                filePath: f.filePath,
                mimeType: f.mimeType ?? null,
                uploadedById: uploadedById ?? null,
            })),
        });

        return this.prisma.followupBlockAttachment.findMany({
            where: { blockId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async removeBlockAttachment(followupId: string, blockId: string, attachmentId: string) {
        const att = await this.prisma.followupBlockAttachment.findFirst({
            where: { id: attachmentId, blockId, block: { followupId } },
        });
        if (!att) throw new NotFoundException('Anexo não encontrado');

        await this.prisma.followupBlockAttachment.delete({ where: { id: attachmentId } });
        return att;
    }

    // ── Comments ──

    async addComment(followupId: string, blockId: string, userId: string, text: string) {
        const block = await this.prisma.followupBlock.findFirst({
            where: { id: blockId, followupId },
        });
        if (!block) throw new NotFoundException('Bloco não encontrado');

        const comment = await this.prisma.followupComment.create({
            data: {
                blockId,
                authorId: userId,
                text,
            },
            include: { author: { select: { id: true, name: true } } },
        });

        return comment;
    }

    // ── History ──

    async getHistory(followupId: string) {
        await this.findById(followupId);
        return this.prisma.followupHistory.findMany({
            where: { followupId },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
}
