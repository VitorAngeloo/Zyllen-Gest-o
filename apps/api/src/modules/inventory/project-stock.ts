import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type ProjectStockInput = {
    companyId: string;
    projectId: string;
    actorId: string;
};

/** Resolve o estoque de um projeto e o cria somente na primeira saída. */
export async function resolveProjectStock(tx: Prisma.TransactionClient, input: ProjectStockInput) {
    // Serializa a criação automática para preservar nome único e um destino por projeto.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(184210, 2)`;

    const project = await tx.project.findUnique({
        where: { id: input.projectId },
        select: { id: true, name: true, companyId: true, company: { select: { name: true } } },
    });
    if (!project || project.companyId !== input.companyId) {
        throw new BadRequestException('O projeto selecionado não pertence ao cliente informado');
    }

    const current = await tx.location.findFirst({
        where: { kind: 'CLIENT', companyId: input.companyId, projectId: input.projectId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (current) return current;

    const baseName = `Estoque - ${project.company.name.trim()} - ${project.name.trim()}`;
    const nameInUse = await tx.location.findUnique({ where: { name: baseName }, select: { id: true } });
    const name = nameInUse ? `${baseName} (${project.id})` : baseName;
    const stock = await tx.location.create({
        data: {
            name,
            description: 'Estoque do projeto, criado automaticamente na primeira saída.',
            kind: 'CLIENT',
            companyId: input.companyId,
            projectId: input.projectId,
            isMainWarehouse: null,
        },
    });

    await tx.auditLog.create({
        data: {
            action: 'PROJECT_STOCK_CREATED_AUTOMATICALLY',
            entityType: 'Location',
            entityId: stock.id,
            userId: input.actorId,
            details: { companyId: input.companyId, projectId: input.projectId, kind: 'CLIENT' },
        },
    });
    return stock;
}
