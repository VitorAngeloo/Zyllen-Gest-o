import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateLocationInput, UpdateLocationInput } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class LocationsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(pagination?: { skip?: number; take?: number }) {
        const [data, total] = await Promise.all([
            this.prisma.location.findMany({
                include: {
                    _count: { select: { assets: true } },
                    company: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                },
                orderBy: { name: 'asc' },
                ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
            }),
            this.prisma.location.count(),
        ]);
        return { data, total };
    }

    async findById(id: string) {
        const location = await this.prisma.location.findUnique({ where: { id } });
        if (!location) throw new NotFoundException('Local não encontrado');
        return location;
    }

    private async write(id: string | null, input: CreateLocationInput | UpdateLocationInput, userId?: string) {
        try {
            return await this.prisma.$transaction(async tx => {
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(184210, 1)`;
                if (id) await tx.$queryRaw`SELECT id FROM "Location" WHERE id = ${id} FOR UPDATE`;
                const previous = id ? await tx.location.findUnique({ where: { id } }) : null;
                if (id && !previous) throw new NotFoundException('Local não encontrado');
                const next = {
                    kind: input.kind === undefined ? previous?.kind ?? null : input.kind,
                    companyId: input.companyId === undefined ? previous?.companyId ?? null : input.companyId,
                    projectId: input.projectId === undefined ? previous?.projectId ?? null : input.projectId,
                    isMainWarehouse: input.isMainWarehouse === undefined ? previous?.isMainWarehouse ?? null : input.isMainWarehouse ? true : null,
                };
                if (next.kind === 'CLIENT') {
                    if (!next.companyId || !await tx.company.findUnique({ where: { id: next.companyId } })) throw new BadRequestException('Local de cliente exige uma empresa válida');
                    if (next.isMainWarehouse) throw new BadRequestException('O estoque principal deve ser interno');
                } else if (next.companyId || next.projectId) throw new BadRequestException('Vínculo com cliente somente em locais de cliente');
                if (next.isMainWarehouse && next.kind !== 'INTERNAL') throw new BadRequestException('Classifique o estoque principal como interno');
                if (next.projectId) {
                    const project = await tx.project.findUnique({ where: { id: next.projectId }, select: { companyId: true } });
                    if (!project || project.companyId !== next.companyId) throw new BadRequestException('A unidade/projeto não pertence à empresa selecionada');
                }
                if (previous?.kind && (previous.kind !== next.kind || previous.companyId !== next.companyId || previous.projectId !== next.projectId)) {
                    const [assets, movements, transfers, minimums] = await Promise.all([
                        tx.asset.count({ where: { currentLocationId: id! } }),
                        tx.stockMovement.count({ where: { OR: [{ fromLocationId: id! }, { toLocationId: id! }] } }),
                        tx.inventoryTransfer.count({ where: { OR: [{ fromLocationId: id! }, { toLocationId: id! }] } }),
                        tx.stockMinimum.count({ where: { locationId: id! } }),
                    ]);
                    if (assets || movements || transfers || minimums) throw new ConflictException('Este local possui patrimônio, histórico ou reserva. Use outro local e uma transferência para mudar a custódia.');
                }
                if (next.isMainWarehouse) await tx.location.updateMany({ where: { isMainWarehouse: true, ...(id ? { id: { not: id } } : {}) }, data: { isMainWarehouse: null } });
                const data = { ...input, ...next };
                const result = id ? await tx.location.update({ where: { id }, data }) : await tx.location.create({ data: { ...data, name: (input as CreateLocationInput).name } });
                if (userId) await tx.auditLog.create({ data: { action: id ? 'LOCATION_UPDATED' : 'LOCATION_CREATED', entityType: 'Location', entityId: result.id, userId, details: { previous, current: next, initialClassification: Boolean(previous && !previous.kind && next.kind) } } });
                return result;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Local com este nome já existe');
            throw error;
        }
    }
    create(data: CreateLocationInput, userId?: string) { return this.write(null, data, userId); }
    update(id: string, data: UpdateLocationInput, userId?: string) { return this.write(id, data, userId); }

    async delete(id: string) {
        await this.findById(id);
        const assetCount = await this.prisma.asset.count({ where: { currentLocationId: id } });
        if (assetCount > 0) {
            throw new ConflictException('Não é possível excluir local com patrimônios vinculados');
        }
        try { return await this.prisma.location.delete({ where: { id } }); }
        catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new ConflictException('Local possui histórico vinculado e não pode ser excluído'); throw error; }
    }
}
