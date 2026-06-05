/**
 * Migration: assign codePrefix to every SkuItem and renumber all Assets.
 * Run: npx ts-node --transpile-only scripts/migrate-asset-prefixes.ts
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

try {
    const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
} catch { /* ignore */ }

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Map: item name (lowercase) → 3-letter prefix
const PREFIX_MAP: Record<string, string> = {
    // Adaptadores
    'plug fêmea 10 a':                                  'PFA',
    'plug macho 10 a':                                  'PMA',
    'adaptador tipo t':                                 'ATT',
    'adaptador tipo t com interruptor':                 'ATI',
    'mini dp p/ hdmi':                                  'MDH',
    'mini dp p/ dp':                                    'MDP',
    'dp p/ hdmi':                                       'DPH',
    'adaptador eua para bra':                           'AEB',
    'adaptador 2 pinos para 3 (sem uso)':               'AP2',
    // Alto falantes
    'arandela 6co3q+':                                  'AR6',
    'arandela ci6s plana':                              'ARS',
    'arandela ci6sa angulada':                          'ARA',
    'subwoofer frahm sw10 g1(down fire)':               'FS1',
    'subwoofer frahm sw10 g2 (front fire)':             'FS2',
    'subwoofer frahm sw12 g1 (down fire)':              'FG1',
    'subwoofer frahm sw12 g2 (front fire)':             'FG2',
    'subwoofer jbl 8\'\'':                              'SJ8',
    'subwoofer jbl 10\'\'':                             'SJ1',
    'subwoofer jbl 12\'\'':                             'SJ2',
    'subwoofer aat cube 8\'\'':                         'SAA',
    // Amplificadores
    'amplificador':                                     'AMP',
    'receiver 5.1':                                     'RCV',
    'home sense 400.5':                                 'HMS',
    // Cabos
    'cabo hdmi pequeno':                                'CHP',
    'cabo de rede / patch cord':                        'CRD',
    'rolo de fio polarizado':                           'RFP',
    'cabo rca mono para subwoofer 5m':                  'CM5',
    'cabo rca mono para subwoofer 15m':                 'CM1',
    'cabo rca duplo para subwoofer 5m':                 'CD5',
    'cabo rca duplo para subwoofer 15m':                'CD1',
    'cabo optico 5m':                                   'OPT',
    'cabo dp':                                          'CDP',
    'cabo de força notebook':                           'CFN',
    'cabo hdmi fibra 15 mt':                            'CHF',
    'extensor usb 20m':                                 'EX2',
    'cabo de força tv':                                 'CFT',
    'cabo de força pc':                                 'CFP',
    // Cabo de áudio
    'cabo p2':                                          'CP2',
    'cabo rca duplo p/ mono':                           'CDM',
    // Câmera
    'camera wifi':                                      'CWF',
    // Energia
    'condicionador de energia 110v':                    'CE1',
    'condicionador de energia 220v':                    'CE2',
    'transformador 110x220':                            'TRF',
    // Extensão
    'extensão de tomada':                               'ETM',
    'extensão com filtro de linha':                     'EFL',
    'filtro de linha':                                  'FLN',
    // Fonte externa
    'fonte 5v':                                         'F5V',
    'fonte 12v':                                        'F12',
    'fonte para projetor':                              'FPJ',
    'fonte mini dell 65w':                              'FD6',
    'fonte mini dell 90w':                              'FD9',
    'fonte mini dell 45w':                              'FD4',
    // Informativo
    'plaquinha de sala imersiva':                       'PSI',
    'plaquinha de sala interativa':                     'PSA',
    'plaquinha de tela interativa':                     'PTI',
    // Kit computador
    'cooler 120mm':                                     'CL1',
    'placa de vídeo 5060 16gb':                         'P56',
    'mini dell':                                        'MDE',
    'adaptador usb wifi':                               'AWF',
    'placa wifi':                                       'PWF',
    'placa wifi p/ dell':                               'PWD',
    'gabinete':                                         'GAB',
    'ssd nvme 500gb':                                   'S50',
    'hd 2tb':                                           'HD2',
    'placa de video rtx quadro 4500':                   'Q45',
    'rtx quadro a400':                                  'QA4',
    'ram ddr4 16gb':                                    'R16',
    'ram ddr4 32gb':                                    'R32',
    'ssd nvme 1tb':                                     'S1T',
    'fonte 850w':                                       'F85',
    'intel nuc':                                        'NUC',
    'ryzen 7 5700g':                                    'R57',
    'placa b550m':                                      'PMB',
    'placa de vídeo rtx a2000':                         'A20',
    'placa de vídeo rx 7600xt':                         'P76',
    'rtx quadro p2200':                                 'QP2',
    'ssd nvme 250gb':                                   'S25',
    'ram ddr 5 32gb':                                   'R5D',
    'placa wifi p/dell':                                'PWD', // fallback
    // Periférico de sala
    'passador de fio':                                  'PFI',
    'capa para projetor':                               'CPP',
    'roteador':                                         'ROT',
    'tranca eletronica totem':                          'TET',
    // Periféricos
    'teclado k400':                                     'TK4',
    'webcam':                                           'WBC',
    'mousepad':                                         'MPD',
    'kit teclado logitech':                             'KTL',
    'headsets':                                         'HDS',
    'mouse':                                            'MOU',
    // Passador de slide
    'passador de slide':                                'PSL',
    // Projetor
    'projetor gt2000 hdr':                              'G20',
    'projetor gt2100 hdr':                              'G21',
    // Suporte
    'kit suporte projetor':                             'KSP',
    // Tablet
    'tablet s6/s10 lite':                               'TBL',
    'tablet s9':                                        'TB9',
};

function normalize(s: string): string {
    return s.toLowerCase().trim()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, ' ');
}

async function main() {
    const skus = await prisma.skuItem.findMany({
        include: { _count: { select: { assets: true } } },
        orderBy: { name: 'asc' },
    });

    console.log(`\n=== Atribuindo prefixos (${skus.length} itens) ===`);
    let matched = 0;
    let unmatched: string[] = [];

    for (const sku of skus) {
        const key = normalize(sku.name);
        const prefix = PREFIX_MAP[key];
        if (prefix) {
            await prisma.skuItem.update({ where: { id: sku.id }, data: { codePrefix: prefix } });
            console.log(`  ✓ ${prefix} → ${sku.name} (${sku._count.assets} assets)`);
            matched++;
        } else {
            unmatched.push(sku.name);
        }
    }

    if (unmatched.length) {
        console.log('\n⚠️  Itens sem prefixo no mapa:');
        unmatched.forEach(n => console.log('  ✗', n));
    }

    // Reload with prefixes
    const skusWithPrefix = await prisma.skuItem.findMany({
        where: { codePrefix: { not: null } },
        include: { assets: { orderBy: { createdAt: 'asc' } } },
    });

    console.log('\n=== Renumerando assets por prefixo ===');
    let totalRenamed = 0;

    for (const sku of skusWithPrefix) {
        const prefix = sku.codePrefix!;
        if (!sku.assets.length) continue;

        for (let i = 0; i < sku.assets.length; i++) {
            const newCode = `${prefix}-${String(i + 1).padStart(5, '0')}`;
            await prisma.asset.update({
                where: { id: sku.assets[i].id },
                data: { assetCode: newCode },
            });
            totalRenamed++;
        }

        // Update per-prefix sequence
        await prisma.assetCodeSequence.upsert({
            where: { id: prefix },
            update: { currentValue: sku.assets.length },
            create: { id: prefix, currentValue: sku.assets.length },
        });

        console.log(`  ${prefix}: ${sku.assets.length} assets → ${prefix}-00001 … ${prefix}-${String(sku.assets.length).padStart(5, '0')}`);
    }

    // Remove old global sequence
    await prisma.assetCodeSequence.deleteMany({ where: { id: 'ASSET_CODE' } });

    console.log(`\n✅ Prefixos atribuídos: ${matched}/${skus.length}`);
    console.log(`✅ Assets renomeados: ${totalRenamed}`);
    if (unmatched.length) console.log(`⚠️  Itens sem prefixo: ${unmatched.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
