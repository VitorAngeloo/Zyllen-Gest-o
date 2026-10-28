/* Reviewed offline snapshot -> read-only legacy tables. No operational enrollment. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../..');
const canonical = input => input && typeof input === 'object' ? Array.isArray(input) ? `[${input.map(canonical).join(',')}]` : `{${Object.keys(input).sort().map(key => `${JSON.stringify(key)}:${canonical(input[key])}`).join(',')}}` : JSON.stringify(input);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function buildSnapshot(staging, summary, metadata) {
    if (!Array.isArray(staging) || staging.length !== Object.values(summary.totals).reduce((count, value) => count + value, 0)) throw new Error('Staging totals mismatch');
    if (staging.some(row => row.sourceHash !== summary.sourceHash || hash(canonical(row.sourceData)) !== row.payloadHash)) throw new Error('Staging source integrity mismatch');
    const records = staging.filter(row => row.collection === 'registros'), pending = staging.filter(row => row.collection === 'pendencias'), notes = staging.filter(row => row.collection === 'anotacoes');
    const ids = new Set(records.map(row => row.legacyId));
    if (ids.size !== records.length || pending.concat(notes).some(row => !ids.has(row.sourceData.Registro))) throw new Error('Duplicate record or orphan child');
    return { ...metadata, sourceSha256: summary.sourceHash, rows: records.map(row => {
        const source = row.sourceData, converted = row.converted;
        const actions = pending.filter(item => item.sourceData.Registro === row.legacyId), annotations = notes.filter(item => item.sourceData.Registro === row.legacyId);
        return { id: row.originKey, sourceId: row.legacyId, rawSource: { record: source, pending: actions.map(item => item.sourceData), annotations: annotations.map(item => item.sourceData) },
            payload: { name: source.Cliente, location: source['Cidade/UF'] || '', service: converted.service, planning: converted.planning, specifications: converted.specifications,
                start: converted.legacyDates['Início'] ?? null, end: converted.legacyDates.Fim ?? null, original: converted.legacyDates['Data original'] ?? null,
                technician: source['Técnico'] || '', notes: source['Observação'] || '',
                pending: actions.map(item => ({ sourceId: item.legacyId, type: item.sourceData.Tipo || '', responsible: item.sourceData['Responsável'] || '', deadline: item.converted.deadline ?? null,
                    detail: item.sourceData.Detalhe || '', open: item.sourceData['Situação'] === 'Aberta', createdAt: item.sourceData['Criada em'] || '', createdBy: item.sourceData['Criada por'] || '', resolvedAt: item.sourceData['Resolvida em'] || '', resolvedBy: item.sourceData['Resolvida por'] || '' })),
                annotations: annotations.map(item => ({ sourceId: item.legacyId, date: item.sourceData.Data || '', author: item.sourceData.Autor || '', text: item.sourceData.Texto || '' })) } };
    }) };
}
module.exports = { buildSnapshot };
async function main() {
    const option = name => { const index = process.argv.indexOf(name); if (index < 0 || !process.argv[index + 1]) throw new Error('Missing ' + name); return process.argv[index + 1]; };
    const folder = path.resolve(option('--staging')), archive = path.resolve(option('--archive'));
    if (path.dirname(folder) !== path.join(root, 'tmp')) throw new Error('Expected private preparation under repository/tmp');
    const summary = JSON.parse(fs.readFileSync(path.join(folder, 'summary.json'), 'utf8'));
    if (summary.sourceHash !== option('--expect-source-sha256') || hash(fs.readFileSync(archive)) !== option('--expect-archive-sha256')) throw new Error('Reviewed source checksums do not match');
    const snapshot = buildSnapshot(JSON.parse(fs.readFileSync(path.join(folder, 'staging.json'), 'utf8')), summary,
        { sourceName: path.basename(archive), artifactSha256: option('--expect-archive-sha256'), importedBy: option('--release-id') });
    const fromApi = createRequire(path.join(root, 'apps/api/package.json'));
    if (!process.argv.includes('--apply')) {
        const sharedPath = path.resolve(option('--shared-build'));
        if (!sharedPath.startsWith(path.join(root, 'tmp') + path.sep)) throw new Error('Expected isolated shared build');
        const { projectLegacyPayloadSchema } = require(sharedPath);
        snapshot.rows.forEach(row => projectLegacyPayloadSchema.parse(row.payload));
        console.log(JSON.stringify({ dryRun: true, records: snapshot.rows.length, pending: snapshot.rows.reduce((count, row) => count + row.payload.pending.length, 0), sourceSha256: summary.sourceHash }));
        return;
    }
    const dotenv = createRequire(fromApi.resolve('@nestjs/config/package.json'))('dotenv');
    const env = dotenv.parse(fs.readFileSync(path.join(root, 'apps/api/.env')));
    const { PrismaClient } = fromApi('@prisma/client');
    const { ProjectLegacyImportService } = require(path.join(root, 'apps/api/dist/modules/project-services/project-legacy-import.service.js'));
    const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
    try {
        const result = await new ProjectLegacyImportService(prisma).importSnapshot(snapshot);
        console.log(JSON.stringify({ ...result, scope: 'read-only legacy snapshot', operationalWrites: false }));
    } finally { await prisma.$disconnect(); }
}
if (require.main === module) main().catch(error => {
    // Do not print Prisma's contextual error, which can contain connection information.
    console.error('Legacy import failed: ' + (error?.issues ? 'source validation failed' : error?.code || error?.message || 'unknown error'));
    process.exitCode = 1;
});
