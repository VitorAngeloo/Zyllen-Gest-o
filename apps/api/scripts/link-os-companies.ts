/**
 * One-shot migration: link MaintenanceOS records to Company via clientName match.
 * Run: npx ts-node scripts/link-os-companies.ts
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually without dotenv dependency
try {
    const envPath = resolve(__dirname, '../.env');
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
} catch { /* .env not found — assume env vars are already set */ }

const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany({ select: { id: true, name: true } });
    const companyMap = new Map<string, string>();
    for (const c of companies) {
        companyMap.set(c.name.toLowerCase().trim(), c.id);
    }
    console.log(`Found ${companies.length} companies`);

    const osList = await prisma.maintenanceOS.findMany({
        where: {
            companyId: null,
            clientName: { not: null },
        },
        select: { id: true, osNumber: true, clientName: true },
    });
    console.log(`Found ${osList.length} OS without companyId (but with clientName)`);

    let updated = 0;
    let noMatch = 0;
    const unmatched: string[] = [];

    for (const os of osList) {
        const key = os.clientName!.toLowerCase().trim();
        const companyId = companyMap.get(key);
        if (companyId) {
            await prisma.maintenanceOS.update({
                where: { id: os.id },
                data: { companyId },
            });
            updated++;
            console.log(`  ✓ ${os.osNumber} → "${os.clientName}"`);
        } else {
            noMatch++;
            unmatched.push(`  ✗ ${os.osNumber} — clientName="${os.clientName}" (sem empresa correspondente)`);
        }
    }

    console.log(`\n--- Resultado ---`);
    console.log(`Vinculadas: ${updated}`);
    console.log(`Sem match:  ${noMatch}`);
    if (unmatched.length > 0) {
        console.log('\nOS sem empresa correspondente:');
        unmatched.forEach((l) => console.log(l));
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
