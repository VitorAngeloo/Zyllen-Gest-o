const assert = require('node:assert/strict');
const crypto = require('node:crypto');
module.exports = async ({ run, prisma, http, ok, create, organizer, reader, admin, client, thirdParty }) => {
    assert.match(process.env.DATABASE_URL, /@127\.0\.0\.1:\d+\//, 'Disposable database required');
    const project = ok(await create({ name: 'Colaboração QA' }), 201);
    const other = ok(await create({ name: 'Outro projeto colaboração QA' }), 201);
    const route = '/project-services/' + project.id;
    const pending = { id: crypto.randomUUID(), type: 'Aguardando equipamento ou logística', responsible: 'Responsável textual QA', deadline: '2028-02-29', detail: 'Conferir modelo QA' };
    const note = { id: crypto.randomUUID(), text: 'Combinado registrado QA' };
    const write = (path, body, method = 'POST', actor = organizer) => http(path, { method, actor, body });
    const read = () => http(route).then(ok);
    await run('Collaboration: multiple independent actions and notes persist with authenticated authors and appear in list/detail', async () => {
        ok(await write(route + '/pending', pending), 201);
        ok(await write(route + '/pending', { ...pending, id: crypto.randomUUID(), type: 'Aguardando kickoff', deadline: null }), 201);
        ok(await write(route + '/notes', note), 201);
        const record = await read(); assert.equal(record.pending.length, 2); assert.equal(record.annotations.length, 1);
        const item = record.pending.find(item => item.id === pending.id);
        assert.equal(item.createdBy.id, organizer.id); assert.equal(item.deadline, pending.deadline); assert.equal(item.version, 0); assert.equal(item.resolvedAt, null);
        assert.equal(record.annotations[0].author.id, organizer.id); assert(Math.abs(Date.parse(record.annotations[0].createdAt) - Date.now()) < 5000);
        const list = await http('/project-services?limit=100'); assert.equal(list.body.data.find(row => row.id === project.id).pending.length, 2);
        assert.equal(record.status, 'PENDING'); assert.equal(record.schedule, null);
    });
    await run('Collaboration: retrying the same create is idempotent and cannot reuse another actor, project or payload', async () => {
        const before = await prisma.auditLog.count();
        await Promise.all([write(route + '/pending', pending), write(route + '/pending', pending)]).then(values => values.forEach(value => ok(value, 201)));
        ok(await write(route + '/notes', note), 201); assert.equal(await prisma.auditLog.count(), before);
        assert.equal((await write(route + '/notes', note, 'POST', admin)).status, 409);
        assert.equal((await write('/project-services/' + other.id + '/pending', pending)).status, 409);
        assert.equal((await write(route + '/notes', { ...note, text: 'Outro texto' })).status, 409);
        assert.equal((await read()).pending.length, 2); assert.equal((await read()).annotations.length, 1);
    });
    await run('Collaboration: versioned edits preserve creator and audit before/after; stale writes fail without overwriting', async () => {
        const values = { type: pending.type, responsible: 'Outro responsável QA', deadline: null, detail: 'Conferência atualizada', expectedVersion: 0 };
        ok(await write(route + '/pending/' + pending.id, values, 'PUT'));
        assert.equal((await write(route + '/pending/' + pending.id, { ...values, detail: 'Edição antiga' }, 'PUT')).status, 409);
        const record = await read(), item = record.pending.find(item => item.id === pending.id);
        assert.equal(item.version, 1); assert.equal(item.detail, values.detail); assert.equal(item.createdBy.id, organizer.id);
        const audit = await prisma.auditLog.findFirst({ where: { entityId: project.id, action: 'PROJECT_PENDING_UPDATE' } });
        assert.equal(audit.details.previous.detail, pending.detail); assert.equal(audit.details.next.detail, values.detail); assert.equal(audit.userId, organizer.id);
    });
    await run('Collaboration: resolution is traceable and idempotent; resolved rows and notes cannot be edited or removed', async () => {
        assert.equal((await write(route + '/pending/' + pending.id + '/resolve', { expectedVersion: 0 }, 'PUT')).status, 409);
        ok(await write(route + '/pending/' + pending.id + '/resolve', { expectedVersion: 1 }, 'PUT'));
        const before = await prisma.auditLog.count(); ok(await write(route + '/pending/' + pending.id + '/resolve', { expectedVersion: 1 }, 'PUT')); assert.equal(await prisma.auditLog.count(), before);
        const item = (await read()).pending.find(item => item.id === pending.id);
        assert(item.resolvedAt); assert.equal(item.resolvedBy.id, organizer.id); assert.equal(item.version, 2);
        assert.equal((await write(route + '/pending/' + pending.id, { type: pending.type, expectedVersion: 2 }, 'PUT')).status, 409);
        for (const path of [route + '/notes/' + note.id, route + '/pending/' + pending.id]) assert.equal((await http(path, { method: 'DELETE', actor: organizer })).status, 404);
        assert.equal((await write(route + '/notes/' + note.id, { text: 'Trocar autoria' }, 'PUT')).status, 404);
        await assert.rejects(() => prisma.projectService.delete({ where: { id: project.id } }), error => error.code === 'P2003');
    });
    await run('Collaboration: forged author/time, month-only deadline, blanks and extra fields fail without partial writes', async () => {
        const before = await Promise.all([prisma.projectServicePending.count(), prisma.projectServiceNote.count(), prisma.auditLog.count()]);
        for (const body of [{ ...pending, id: crypto.randomUUID(), createdById: admin.id }, { ...pending, id: crypto.randomUUID(), deadline: '2027-01' }, { ...pending, id: crypto.randomUUID(), deadline: '2027-02-29' }, { ...pending, id: crypto.randomUUID(), type: ' ' }]) assert.equal((await write(route + '/pending', body)).status, 400);
        for (const body of [{ ...note, id: crypto.randomUUID(), authorId: admin.id }, { ...note, id: crypto.randomUUID(), createdAt: '2000-01-01T00:00:00Z' }, { ...note, text: ' ' }]) assert.equal((await write(route + '/notes', body)).status, 400);
        assert.deepEqual(await Promise.all([prisma.projectServicePending.count(), prisma.projectServiceNote.count(), prisma.auditLog.count()]), before);
    });
    await run('Collaboration: permissions and parent identity prevent writes to foreign or missing resources', async () => {
        for (const actor of [reader, client, thirdParty]) {
            assert.equal((await write(route + '/notes', { ...note, id: crypto.randomUUID() }, 'POST', actor)).status, 403);
            assert.equal((await write(route + '/pending/' + pending.id + '/resolve', { expectedVersion: 2 }, 'PUT', actor)).status, 403);
        }
        const foreign = '/project-services/' + other.id + '/pending/' + pending.id;
        assert.equal((await write(foreign + '/resolve', { expectedVersion: 2 }, 'PUT')).status, 404);
        assert.equal((await write('/project-services/' + crypto.randomUUID() + '/notes', { ...note, id: crypto.randomUUID() })).status, 404);
        assert.equal((await http(route, { actor: reader })).status, 200);
        assert(!JSON.stringify((await read()).annotations).match(/password|email|token|cpf/));
    });
    // Only these disposable fixtures: later statistics suites rebuild their own services.
    await prisma.projectServiceNote.deleteMany({ where: { serviceId: { in: [project.id, other.id] } } });
    await prisma.projectServicePending.deleteMany({ where: { serviceId: { in: [project.id, other.id] } } });
};
