import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

async function main() {
    const dryRun = parseBoolean(process.env.BACKFILL_DRY_RUN, true);
    const batchSize = Number(process.env.BACKFILL_BATCH_SIZE ?? '500');

    if (!Number.isFinite(batchSize) || batchSize <= 0) {
        throw new Error('BACKFILL_BATCH_SIZE inválido. Informe um número inteiro positivo.');
    }

    const exitMovementType = await prisma.movementType.findFirst({
        where: {
            name: { in: ['Saída', 'Saida', 'SAÍDA', 'SAIDA'] },
        },
        select: { id: true, name: true },
    });

    if (!exitMovementType) {
        throw new Error('Tipo de movimentação de saída não encontrado. Cadastre o tipo "Saída" antes de executar o backfill.');
    }

    const totalExits = await prisma.productExit.count();
    console.log(`\n🔎 Backfill ProductExit -> StockMovement`);
    console.log(`Modo: ${dryRun ? 'DRY-RUN (sem escrita)' : 'APPLY (com escrita)'}`);
    console.log(`Lote: ${batchSize}`);
    console.log(`ProductExits totais: ${totalExits}`);

    let processed = 0;
    let alreadyLinked = 0;
    let pendingCreate = 0;
    let created = 0;
    let failed = 0;

    for (let skip = 0; skip < totalExits; skip += batchSize) {
        const exits = await prisma.productExit.findMany({
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            skip,
            take: batchSize,
            select: {
                id: true,
                skuId: true,
                locationId: true,
                quantity: true,
                reason: true,
                createdById: true,
                createdAt: true,
            },
        });

        if (exits.length === 0) break;

        const exitIds = exits.map((exit) => exit.id);
        const existingRefs = await prisma.stockMovement.findMany({
            where: {
                referenceId: { in: exitIds },
                referenceType: { in: ['PRODUCT_EXIT', 'PRODUCT_EXIT_BACKFILL'] },
            },
            select: { referenceId: true },
        });

        const existingRefSet = new Set(existingRefs.map((ref) => ref.referenceId).filter(Boolean) as string[]);

        const toBackfill = exits.filter((exit) => !existingRefSet.has(exit.id));

        processed += exits.length;
        alreadyLinked += exits.length - toBackfill.length;
        pendingCreate += toBackfill.length;

        if (!dryRun) {
            for (const exit of toBackfill) {
                try {
                    await prisma.stockMovement.create({
                        data: {
                            typeId: exitMovementType.id,
                            skuId: exit.skuId,
                            fromLocationId: exit.locationId,
                            qty: exit.quantity,
                            createdByInternalUserId: exit.createdById,
                            pinValidatedAt: null,
                            reason: exit.reason,
                            referenceType: 'PRODUCT_EXIT_BACKFILL',
                            referenceId: exit.id,
                            createdAt: exit.createdAt,
                        },
                    });
                    created += 1;
                } catch (error) {
                    failed += 1;
                    const message = error instanceof Error ? error.message : String(error);
                    console.error(`❌ Falha no ProductExit ${exit.id}: ${message}`);
                }
            }
        }

        console.log(`Lote ${Math.floor(skip / batchSize) + 1}: processados ${processed}/${totalExits}, pendentes no lote ${toBackfill.length}`);
    }

    console.log('\n📊 Resumo do backfill');
    console.log(`- ProductExits processados: ${processed}`);
    console.log(`- Já vinculados ao ledger: ${alreadyLinked}`);
    console.log(`- Pendentes para criar no ledger: ${pendingCreate}`);
    if (!dryRun) {
        console.log(`- Criados no ledger: ${created}`);
        console.log(`- Falhas: ${failed}`);
    }

    if (dryRun) {
        console.log('\nℹ️ Para aplicar a escrita, execute:');
        console.log('BACKFILL_DRY_RUN=false pnpm --filter @zyllen/api backfill:product-exits-ledger');
    }
}

main()
    .catch((error) => {
        console.error('❌ Backfill falhou:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
