const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
module.exports = async ({ run, prisma, http, ok, reader, organizer, client, thirdParty, unprivileged }) => {
    const { ProjectLegacyImportService } = require(path.resolve(__dirname, '../../apps/api/src/modules/project-services/project-legacy-import.service.ts'));
    const importer = new ProjectLegacyImportService(prisma);
    const payload = { name: 'Histórico sintético QA', location: 'Goiânia/GO', service: 'REMOVAL', planning: { stage: 'concluido', forecast: '2025-01' },
        specifications: { category: 'sala', equipment: ['Projetor legado QA'], room: null }, start: '2025-01-10', end: null, original: '2025-01-09', technician: 'Texto sem conta QA', notes: 'Dado de origem QA',
        pending: [{ sourceId: 'p1', type: 'Aguardando contrato', responsible: '', deadline: null, detail: 'Histórico', open: true, createdAt: '', createdBy: '', resolvedAt: '', resolvedBy: '' }], annotations: [] };
    const snapshot = { sourceName: 'source-qa.zip', sourceSha256: 'a'.repeat(64), artifactSha256: 'b'.repeat(64), importedBy: 'synthetic-release-qa',
        rows: Array.from({ length: 105 }, (_, index) => ({ id: crypto.randomUUID(), sourceId: 'legacy-' + index, payload: { ...payload, name: payload.name + index }, rawSource: { record: { ID: 'legacy-' + index, original: 'Unmodified' } } })) };
    const counts = () => Promise.all([prisma.project.count(), prisma.company.count(), prisma.projectService.count(), prisma.schedule.count(), prisma.internalUser.count(), prisma.auditLog.count()]);
    let batch;
    await run('Legacy snapshot: import preserves source and is idempotent without creating clients, projects, schedules, accounts or real completion', async () => {
        const before = await counts(); batch = await importer.importSnapshot(snapshot); assert.equal(batch.records, 105); assert.equal(batch.alreadyImported, false);
        assert.deepEqual(await counts(), before); const retry = await importer.importSnapshot(snapshot); assert.equal(retry.alreadyImported, true); assert.equal(await prisma.projectPlanningLegacyRecord.count(), 105);
        const stored = await prisma.projectPlanningLegacyRecord.findUnique({ where: { id: snapshot.rows[0].id } }); assert.deepEqual(stored.rawSource, snapshot.rows[0].rawSource); assert.equal(stored.payload.end, null); assert(!Object.hasOwn(stored.payload, 'completedAt'));
    });
    await run('Legacy snapshot: conflicting content, duplicate identities and malformed days cannot overwrite a source or partially import', async () => {
        await assert.rejects(() => importer.importSnapshot({ ...snapshot, rows: snapshot.rows.map((row, index) => index ? row : { ...row, payload: { ...row.payload, notes: 'Changed' } }) }), /conteúdo diferente/);
        await assert.rejects(() => importer.importSnapshot({ ...snapshot, sourceSha256: 'c'.repeat(64) }), /Identidade de origem/);
        await assert.rejects(() => importer.importSnapshot({ ...snapshot, rows: [snapshot.rows[0], snapshot.rows[0]] }));
        await assert.rejects(() => importer.importSnapshot({ ...snapshot, sourceSha256: 'd'.repeat(64), rows: [{ ...snapshot.rows[0], payload: { ...payload, start: '2027-02-29' } }] }));
        assert.equal(await prisma.projectPlanningLegacyImport.count(), 1); assert.equal(await prisma.projectPlanningLegacyRecord.count(), 105);
        await assert.rejects(() => prisma.projectPlanningLegacyImport.delete({ where: { id: batch.id } }), error => error.code === 'P2003');
    });
    await run('Legacy snapshot API: paginated authorized reads expose provenance; no HTTP import or physical deletion is available', async () => {
        const id = snapshot.rows[0].id, route = '/project-services/legacy/records';
        const page = await http(route + '?page=1&limit=1', { actor: reader }); assert.equal(page.body.total, 105); assert.equal(page.body.data.length, 1);
        const last = await http(route + '?page=2&limit=1', { actor: reader }); assert.equal(last.body.data.length, 1);
        const detail = ok(await http(route + '/' + id, { actor: reader })); assert.equal(detail.source.sha256, snapshot.sourceSha256); assert.equal(detail.planning.stage, 'concluido'); assert.equal(detail.end, null); assert(!Object.hasOwn(detail, 'rawSource'));
        for (const actor of [null, client, thirdParty, unprivileged]) assert.equal((await http(route, { actor })).status, actor ? 403 : 401);
        for (const method of ['POST', 'DELETE']) assert.equal((await http(route + '/' + id, { actor: organizer, method, body: { notes: 'no write' } })).status, 404);
        assert.equal((await http('/project-services/' + id + '/notes', { actor: organizer, method: 'POST', body: { id: crypto.randomUUID(), text: 'no mutation' } })).status, 404);
        assert.equal((await http(route + '?limit=101', { actor: reader })).status, 400);
    });
    await require('./test-project-legacy-editing.cjs')({ run, prisma, http, ok, reader, organizer, client, thirdParty, unprivileged, importer, snapshot });
    await prisma.projectPlanningLegacyEdit.deleteMany({ where: { record: { importId: batch.id } } });
    await prisma.projectPlanningLegacyRecord.deleteMany({ where: { importId: batch.id } });
    await prisma.projectPlanningLegacyImport.delete({ where: { id: batch.id } });
};
