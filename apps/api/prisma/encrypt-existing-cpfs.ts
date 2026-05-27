/**
 * Script de migração única: criptografa CPFs já existentes no banco.
 * Execute com: node --env-file=.env -r ts-node/register prisma/encrypt-existing-cpfs.ts
 * IMPORTANTE: rode apenas uma vez. Após executar, os CPFs no banco estarão no formato "ivhex:datahex".
 */
import { PrismaClient } from '@prisma/client';
import { createCipheriv, createHmac } from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function isAlreadyEncrypted(value: string): boolean {
    // CPFs criptografados têm formato "32hexchars:hexdata"
    return /^[0-9a-f]{32}:[0-9a-f]+$/i.test(value);
}

function encryptCPF(cpf: string): string {
    const keyHex = process.env.CPF_ENCRYPTION_KEY!;
    const key = Buffer.from(keyHex, 'hex');
    const iv = createHmac('sha256', key).update(cpf).digest().subarray(0, 16);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    return iv.toString('hex') + ':' + cipher.update(cpf, 'utf8', 'hex') + cipher.final('hex');
}

async function main() {
    if (!process.env.CPF_ENCRYPTION_KEY || process.env.CPF_ENCRYPTION_KEY.length !== 64) {
        throw new Error('CPF_ENCRYPTION_KEY inválida no .env');
    }

    const prisma = new PrismaClient();

    try {
        // ── ContractorUser ──
        const contractors = await prisma.contractorUser.findMany({
            where: { cpf: { not: null } },
            select: { id: true, cpf: true },
        });

        let contractorUpdated = 0;
        for (const c of contractors) {
            if (!c.cpf || isAlreadyEncrypted(c.cpf)) continue;
            await prisma.contractorUser.update({
                where: { id: c.id },
                data: { cpf: encryptCPF(c.cpf) },
            });
            contractorUpdated++;
        }
        console.log(`ContractorUser: ${contractorUpdated}/${contractors.length} CPFs criptografados`);

        // ── ExternalUser ──
        const externals = await prisma.externalUser.findMany({
            where: { cpf: { not: null } },
            select: { id: true, cpf: true },
        });

        let externalUpdated = 0;
        for (const e of externals) {
            if (!e.cpf || isAlreadyEncrypted(e.cpf)) continue;
            await prisma.externalUser.update({
                where: { id: e.id },
                data: { cpf: encryptCPF(e.cpf) },
            });
            externalUpdated++;
        }
        console.log(`ExternalUser: ${externalUpdated}/${externals.length} CPFs criptografados`);

        console.log('Migração concluída com sucesso.');
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
