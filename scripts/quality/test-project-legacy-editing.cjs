const assert = require('node:assert/strict');
const crypto = require('node:crypto');
module.exports = async ({ run, prisma, http, ok, reader, organizer, client, thirdParty, unprivileged, importer, snapshot }) => {
    const id = snapshot.rows[0].id, route = `/project-services/legacy/records/${id}`;
    const read = async () => ok(await http(route));
    const core = ({ pending, annotations, id, sourceId, source, editingAvailable, version, editedAt, editedBy, ...data }) => data;
    const put = (body, actor = organizer) => http(route, { method: 'PUT', actor, body });
    const counts = () => Promise.all([prisma.project.count(), prisma.company.count(), prisma.projectService.count(), prisma.schedule.count(), prisma.internalUser.count()]);
    const before = await counts(); const original = await prisma.projectPlanningLegacyRecord.findUnique({ where: { id } });
    let current = await read();
    await run('Legacy editing: core fields persist in a working copy, preserve original source/hash/IDs and audit the authenticated author', async () => {
        assert.equal(current.version, 0); assert.equal(current.editingAvailable, true);
        current = ok(await put({ expectedVersion: current.version, data: { ...core(current), name: 'Cliente alterado QA', service: 'MAINTENANCE', location: 'Brasília/DF', start: '2025-02-10', end: '2025-02-12', original: null,
            technician: 'Texto livre QA', planning: { stage: 'predef', forecast: '2025-03' }, specifications: { category: 'tela', equipment: ['Tela QA'], room: null }, notes: 'Observação alterada' } }));
        assert.equal(current.version, 1); assert.equal(current.original, '2025-01-10'); assert.equal(current.name, 'Cliente alterado QA'); assert(current.editedAt); assert(current.editedBy);
        assert.deepEqual(await prisma.projectPlanningLegacyRecord.findUnique({ where: { id } }), original);
        const audit = await prisma.auditLog.findFirst({ where: { entityId: id, action: 'PROJECT_LEGACY_UPDATE' } }); assert.equal(audit.userId, organizer.id); assert.equal(audit.details.previous.name, original.payload.name);
        assert.deepEqual(await counts(), before); assert.equal((await importer.importSnapshot(snapshot)).alreadyImported, true); assert.equal((await read()).name, current.name);
        assert.equal((await http('/project-services/legacy/records?limit=100')).body.data.find(item => item.id === id)?.name ?? (await read()).name, current.name);
    });
    await run('Legacy editing: stale versions, forged metadata, impossible dates and invalid status dates cannot overwrite a record', async () => {
        const baseline = await read(), data = core(baseline);
        assert.equal((await put({ expectedVersion: 0, data })).status, 409);
        for (const patch of [{ start: '2025-02-30' }, { start: null, planning: { stage: 'agendado', forecast: null } }, { end: '2024-01-01' }, { source: { name: 'forged' } }, { editedBy: 'forged' }]) assert.equal((await put({ expectedVersion: baseline.version, data: { ...data, ...patch } })).status, 400);
        assert.equal((await put({ expectedVersion: baseline.version, data, userId: organizer.id })).status, 400); assert.deepEqual(await read(), baseline);
        const races = await Promise.all(['A', 'B'].map(text => put({ expectedVersion: baseline.version, data: { ...data, notes: 'Concurrent ' + text } })));
        assert.deepEqual(races.map(item => item.status).sort(), [200, 409]); current = await read(); assert.equal(current.version, baseline.version + 1);
    });
    await run('Legacy editing: source pending IDs are editable, new pending/notes are idempotent and authorship comes from the session', async () => {
        ok(await http(route + '/pending/p1', { actor: organizer, method: 'PUT', body: { expectedVersion: 0, type: 'Outra', responsible: 'Área QA', deadline: '2025-03-01', detail: 'Pendência alterada' } }));
        assert.equal((await http(route + '/pending/p1', { actor: organizer, method: 'PUT', body: { expectedVersion: 0, type: 'Outra', detail: 'Stale' } })).status, 409);
        const pending = { id: crypto.randomUUID(), type: 'Aguardando contrato', responsible: '', deadline: null, detail: 'Nova pendência QA' };
        for (let attempt = 0; attempt < 2; attempt++) ok(await http(route + '/pending', { actor: organizer, method: 'POST', body: pending }), 201);
        current = await read(); assert.equal(current.pending.filter(item => item.sourceId === pending.id).length, 1); assert(current.pending.find(item => item.sourceId === pending.id).createdBy);
        for (let attempt = 0; attempt < 2; attempt++) ok(await http(route + '/pending/p1/resolve', { actor: organizer, method: 'PUT', body: { expectedVersion: 1 } }));
        const note = { id: crypto.randomUUID(), text: 'Anotação do planejamento QA' };
        for (let attempt = 0; attempt < 2; attempt++) ok(await http(route + '/notes', { actor: organizer, method: 'POST', body: note }), 201);
        current = await read(); assert.equal(current.annotations.length, 1); assert(current.annotations[0].author); assert(current.annotations[0].date);
        assert.equal(current.pending.find(item => item.sourceId === 'p1').open, false);
        assert.deepEqual(await prisma.projectPlanningLegacyRecord.findUnique({ where: { id } }), original); assert.deepEqual(await counts(), before);
    });
    await run('Legacy editing: quick changes preserve unrelated fields, cancellation requires a reason, and history remains readable', async () => {
        current = await read();
        ok(await http(route + '/planning', { actor: organizer, method: 'PUT', body: { expected: current.planning, next: { stage: 'kickoff', forecast: '2025-04' } } }));
        ok(await http(route + '/observations', { actor: organizer, method: 'PUT', body: { expected: current.notes, next: 'Observação rápida QA' } }));
        assert.equal((await http(route + '/planning', { actor: organizer, method: 'PUT', body: { expected: { stage: 'kickoff', forecast: '2025-04' }, next: { stage: 'cancelado', forecast: null } } })).status, 400);
        assert.equal((await http(route + '/cancel', { actor: organizer, method: 'POST', body: { expectedStage: 'kickoff', reason: '' } })).status, 400);
        ok(await http(route + '/cancel', { actor: organizer, method: 'POST', body: { expectedStage: 'kickoff', reason: 'Cancelamento justificado QA' } }), 201);
        current = await read(); assert.equal(current.planning.stage, 'cancelado'); assert.equal(current.pending.length, 2); assert.equal(current.annotations.length, 1);
        const history = await http(route + '/history?limit=2', { actor: reader }); assert.equal(history.status, 200); assert(history.body.total >= 8); assert.equal(history.body.data[0].reason, 'Cancelamento justificado QA'); assert(history.body.data[0].changes.length > 0);
        assert.deepEqual(await counts(), before);
    });
    await run('Legacy editing: readers and external/third-party accounts cannot mutate or forge an actor, and physical deletion stays unavailable', async () => {
        const current = await read();
        for (const actor of [reader, client, thirdParty, unprivileged, null]) {
            const expected = actor ? 403 : 401;
            for (const [suffix, method, body] of [['', 'PUT', { expectedVersion: current.version, data: core(current) }], ['/pending', 'POST', { id: crypto.randomUUID(), type: 'Outra' }], ['/notes', 'POST', { id: crypto.randomUUID(), text: 'Denied' }], ['/cancel', 'POST', { expectedStage: 'cancelado', reason: 'Denied test' }]]) assert.equal((await http(route + suffix, { actor, method, body })).status, expected);
        }
        assert.equal((await http(route, { actor: organizer, method: 'DELETE' })).status, 404);
        assert.deepEqual(await prisma.projectPlanningLegacyRecord.findUnique({ where: { id } }), original);
    });
};
