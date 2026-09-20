import { Prisma } from '@prisma/client';

const CLIENT_STOCK_PREFIX = 'Estoque - ';

type CompanyForStock = {
    id: string;
    name: string;
};

/**
 * Creates the empty, company-level stock used to expose a new client in the
 * inventory area. Project destinations remain separate and explicit.
 */
export async function createClientStock(
    tx: Prisma.TransactionClient,
    company: CompanyForStock,
    actorId: string,
) {
    const current = await tx.location.findFirst({
        where: { kind: 'CLIENT', companyId: company.id, projectId: null },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (current) return current;

    const baseName = `${CLIENT_STOCK_PREFIX}${company.name.trim()}`;
    const nameInUse = await tx.location.findUnique({
        where: { name: baseName },
        select: { id: true },
    });
    const name = nameInUse ? `${baseName} (${company.id.slice(0, 8)})` : baseName;
    const stock = await tx.location.create({
        data: {
            name,
            description: 'Estoque geral do cliente, criado automaticamente no cadastro.',
            kind: 'CLIENT',
            companyId: company.id,
            projectId: null,
            isMainWarehouse: null,
        },
    });

    await tx.auditLog.create({
        data: {
            action: 'CLIENT_STOCK_CREATED_AUTOMATICALLY',
            entityType: 'Location',
            entityId: stock.id,
            userId: actorId,
            details: { companyId: company.id, projectId: null, kind: 'CLIENT' },
        },
    });

    return stock;
}
