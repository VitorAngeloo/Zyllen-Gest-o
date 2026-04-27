import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';

const prisma = new PrismaClient();

type KeyStats = {
    skuId: string;
    locationId: string;
    movementQty: number;
    movementInQty: number;
    movementOutQty: number;
    movementCount: number;
    balanceQty: number;
};

function makeKey(skuId: string, locationId: string): string {
    return `${skuId}::${locationId}`;
}

function upsertMap(map: Map<string, KeyStats>, skuId: string, locationId: string): KeyStats {
    const key = makeKey(skuId, locationId);
    const current = map.get(key);
    if (current) return current;

    const created: KeyStats = {
        skuId,
        locationId,
        movementQty: 0,
        movementInQty: 0,
        movementOutQty: 0,
        movementCount: 0,
        balanceQty: 0,
    };
    map.set(key, created);
    return created;
}

async function main() {
    const outputFile = process.env.RECONCILE_OUTPUT_FILE;
    const includeZeroDiff = ['1', 'true', 'yes', 'on'].includes((process.env.RECONCILE_INCLUDE_ZERO_DIFF ?? 'false').toLowerCase());

    const [balances, movements] = await Promise.all([
        prisma.stockBalance.findMany({
            select: {
                skuId: true,
                locationId: true,
                quantity: true,
                sku: { select: { skuCode: true, name: true } },
                location: { select: { name: true } },
            },
        }),
        prisma.stockMovement.findMany({
            select: {
                id: true,
                skuId: true,
                qty: true,
                fromLocationId: true,
                toLocationId: true,
            },
        }),
    ]);

    const statsMap = new Map<string, KeyStats>();

    for (const balance of balances) {
        const stats = upsertMap(statsMap, balance.skuId, balance.locationId);
        stats.balanceQty = balance.quantity;
    }

    for (const movement of movements) {
        if (movement.toLocationId) {
            const toStats = upsertMap(statsMap, movement.skuId, movement.toLocationId);
            toStats.movementQty += movement.qty;
            toStats.movementInQty += movement.qty;
            toStats.movementCount += 1;
        }

        if (movement.fromLocationId) {
            const fromStats = upsertMap(statsMap, movement.skuId, movement.fromLocationId);
            fromStats.movementQty -= movement.qty;
            fromStats.movementOutQty += movement.qty;
            fromStats.movementCount += 1;
        }
    }

    const skuInfo = new Map<string, { skuCode: string; skuName: string }>();
    const locationInfo = new Map<string, { locationName: string }>();

    for (const balance of balances) {
        skuInfo.set(balance.skuId, {
            skuCode: balance.sku.skuCode,
            skuName: balance.sku.name,
        });
        locationInfo.set(balance.locationId, {
            locationName: balance.location.name,
        });
    }

    const rows = Array.from(statsMap.values()).map((stats) => {
        const infoSku = skuInfo.get(stats.skuId);
        const infoLocation = locationInfo.get(stats.locationId);
        const diff = stats.balanceQty - stats.movementQty;

        return {
            skuId: stats.skuId,
            skuCode: infoSku?.skuCode ?? 'N/A',
            skuName: infoSku?.skuName ?? 'N/A',
            locationId: stats.locationId,
            locationName: infoLocation?.locationName ?? 'N/A',
            balanceQty: stats.balanceQty,
            projectedByLedgerQty: stats.movementQty,
            diff,
            movementInQty: stats.movementInQty,
            movementOutQty: stats.movementOutQty,
            movementCount: stats.movementCount,
            severity: diff === 0 ? 'OK' : Math.abs(diff) >= 10 ? 'HIGH' : 'MEDIUM',
        };
    });

    const filteredRows = includeZeroDiff ? rows : rows.filter((row) => row.diff !== 0);

    const summary = {
        generatedAt: new Date().toISOString(),
        totalBalances: balances.length,
        totalMovements: movements.length,
        totalKeysCompared: rows.length,
        mismatches: rows.filter((row) => row.diff !== 0).length,
        highSeverity: rows.filter((row) => Math.abs(row.diff) >= 10).length,
        mediumSeverity: rows.filter((row) => row.diff !== 0 && Math.abs(row.diff) < 10).length,
    };

    console.log('\n📊 Reconciliação StockBalance x StockMovement');
    console.log(`- Saldos lidos: ${summary.totalBalances}`);
    console.log(`- Movimentos lidos: ${summary.totalMovements}`);
    console.log(`- Chaves comparadas (SKU×Local): ${summary.totalKeysCompared}`);
    console.log(`- Divergências: ${summary.mismatches}`);
    console.log(`- Severidade alta (|diff| >= 10): ${summary.highSeverity}`);
    console.log(`- Severidade média (|diff| < 10): ${summary.mediumSeverity}`);

    const topDiff = filteredRows
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        .slice(0, 20);

    if (topDiff.length > 0) {
        console.log('\n🔎 Top divergências (máx 20):');
        for (const row of topDiff) {
            console.log(`- ${row.skuCode} (${row.skuName}) @ ${row.locationName}: saldo=${row.balanceQty}, ledger=${row.projectedByLedgerQty}, diff=${row.diff}`);
        }
    } else {
        console.log('\n✅ Nenhuma divergência encontrada.');
    }

    if (outputFile) {
        const payload = {
            summary,
            rows: filteredRows,
        };
        writeFileSync(outputFile, JSON.stringify(payload, null, 2), 'utf-8');
        console.log(`\n💾 Relatório salvo em: ${outputFile}`);
    }
}

main()
    .catch((error) => {
        console.error('❌ Reconciliação falhou:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
