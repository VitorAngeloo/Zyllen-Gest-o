import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { StructureInput, StructureListQuery, StructureRecord } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { cycleInclude, cycleRecord } from './structure-cycles.service';

@Injectable()
export class StructuresService {
    constructor(private readonly prisma: PrismaService) {}
    async list(query: StructureListQuery) {
        const where: Prisma.OperationalStructureWhereInput = { ...(query.companyId ? { companyId: query.companyId } : {}), ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}) };
        const [rows, total] = await this.prisma.retry(() => this.prisma.$transaction([
            this.prisma.operationalStructure.findMany({ where, include: { company: { select: { id: true, name: true } } }, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
            this.prisma.operationalStructure.count({ where }),
        ]));
        return { data: rows.map(row => ({ id: row.id, name: row.name, kind: row.kind as StructureRecord['kind'], company: row.company, createdAt: row.createdAt.toISOString() })), total, page: query.page, limit: query.limit };
    }
    async create(input: StructureInput, actorId: string) {
        try {
            return await this.prisma.$transaction(async tx => {
                if (!await tx.company.findUnique({ where: { id: input.companyId } })) throw new BadRequestException('Cliente não encontrado');
                const row = await tx.operationalStructure.create({ data: { ...input, nameKey: input.name.normalize('NFKC').toLocaleLowerCase('pt-BR') }, include: { company: { select: { id: true, name: true } } } });
                await tx.auditLog.create({ data: { action: 'STRUCTURE_CREATE', entityType: 'OperationalStructure', entityId: row.id, userId: actorId, details: { companyId: input.companyId, name: input.name, kind: input.kind } } });
                return { id: row.id, name: row.name, kind: row.kind as StructureRecord['kind'], company: row.company, createdAt: row.createdAt.toISOString() };
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Já existe uma estrutura com este nome para o cliente');
            throw error;
        }
    }
    async cycles(id: string, page: number, limit: number) {
        return this.prisma.retry(() => this.prisma.$transaction(async tx => {
            if (!await tx.operationalStructure.findUnique({ where: { id } })) throw new NotFoundException('Estrutura não encontrada');
            const [rows, total] = await Promise.all([
                tx.structureCycle.findMany({ where: { structureId: id }, include: cycleInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
                tx.structureCycle.count({ where: { structureId: id } }),
            ]);
            return { data: rows.map(row => cycleRecord(row)), total, page, limit };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
    }
    async availableCycle(id: string) {
        const rows = await this.cycles(id, 1, 1), row = rows.data[0];
        return row?.status === 'INSTALLED' && !row.removals.some(item => item.status !== 'CANCELLED') ? row : null;
    }
}
