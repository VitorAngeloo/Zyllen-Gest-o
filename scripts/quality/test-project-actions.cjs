const assert = require('node:assert/strict');
const crypto = require('node:crypto');
module.exports = async ({ run, prisma, http, ok, create, organizer, reader, tech, client, thirdParty, start, end }) => {
    const record = ok(await create({ name: 'Ações rápidas QA', planning: { stage: 'kickoff', forecast: '2028-02' }, startDate: start, endDate: end, installerIds: [tech.id], allowConflicts: true }), 201);
    const route = '/project-services/' + record.id;
    const write = (suffix, body, method = 'PUT', actor = organizer) => http(route + suffix, { method, body, actor });
    const read = () => http(route).then(ok);
    await run('Project actions: partial planning/observations preserve unrelated fields, reject stale writes and audit before/after', async () => {
        const next = { stage: 'contrato', forecast: '2028-02' };
        ok(await write('/planning', { expected: record.planning, next }));
        assert.equal((await write('/planning', { expected: record.planning, next: null })).status, 409);
        ok(await write('/observations', { expected: null, next: 'Observação QA' }));
        assert.equal((await write('/observations', { expected: null, next: 'Não sobrescrever' })).status, 409);
        const current = await read(); assert.deepEqual(current.planning, next); assert.equal(current.status, 'SCHEDULED'); assert.deepEqual(current.schedule, record.schedule);
        assert.equal((await prisma.schedule.findUnique({ where: { id: record.schedule.id } })).notes, 'Observação QA');
        const audit = await prisma.auditLog.findFirst({ where: { entityId: record.id, action: 'PROJECT_PLANNING_CHANGE' } }); assert.deepEqual(audit.details.previousPlanning, record.planning); assert.deepEqual(audit.details.planning, next);
        assert.equal((await write('/planning', { expected: next, next, authorId: tech.id })).status, 400);
    });
    await run('Project reschedule: agenda and canonical editor preserve the first actual start; failed and no-op moves do not fabricate history', async () => {
        const shift = days => new Date(Date.parse(start) + days * 86400000).toISOString();
        const move = (day, body = {}) => http('/schedule/' + record.schedule.id, { actor: organizer, method: 'PUT', body: { startDate: shift(day), endDate: new Date(Date.parse(shift(day)) + 3600000).toISOString(), allowConflicts: true, ...body } });
        ok(await move(0)); assert.equal((await read()).originalScheduledStartAt, null);
        assert.equal((await move(1, { endDate: start })).status, 400); assert.equal((await read()).originalScheduledStartAt, null);
        ok(await move(1)); assert.equal((await read()).originalScheduledStartAt, start);
        ok(await move(2)); assert.equal((await read()).originalScheduledStartAt, start);
        const history = (await http(route + '/history?limit=100')).body.data;
        assert(history.some(item => item.changes.some(change => change.field === 'Início agendado' && change.before === start && change.after === shift(1))));
    });
    await run('Project cancellation: reason is mandatory; record, children and dates survive; retries are idempotent and history exposes the reason', async () => {
        ok(await write('/notes', { id: crypto.randomUUID(), text: 'Preservar anotação' }, 'POST'), 201);
        for (const body of [{ expectedStatus: 'SCHEDULED' }, { expectedStatus: 'SCHEDULED', reason: ' ' }]) assert.equal((await write('/cancel', body, 'POST')).status, 400);
        assert.equal((await write('/cancel', { expectedStatus: 'PENDING', reason: 'Cliente solicitou' }, 'POST')).status, 409);
        const input = { expectedStatus: 'SCHEDULED', reason: 'Cliente solicitou o cancelamento QA' };
        ok(await write('/cancel', input, 'POST'), 201); const count = await prisma.auditLog.count(); ok(await write('/cancel', input, 'POST'), 201); assert.equal(await prisma.auditLog.count(), count);
        const current = await read(); assert.equal(current.status, 'CANCELLED'); assert(current.cancelledAt); assert.equal(current.annotations.length, 1); assert.equal(current.originalScheduledStartAt, start); assert.equal(current.notes, 'Observação QA');
        const history = await http(route + '/history?limit=2'); assert.equal(history.body.data.length, 2); assert(history.body.total > 2);
        const all = await http(route + '/history?limit=100', { actor: reader }); assert.equal(all.status, 200); assert(all.body.data.some(item => item.reason === input.reason));
        assert(!JSON.stringify(all.body).match(/password|email|cpf|token/));
        assert.equal((await http(route, { actor: organizer, method: 'DELETE' })).status, 404);
    });
    await run('Project actions: current RBAC protects direct requests and history never includes another project or schedule', async () => {
        for (const actor of [reader, client, thirdParty]) for (const [suffix, body, method] of [['/cancel', { expectedStatus: 'CANCELLED', reason: 'Teste' }, 'POST'], ['/observations', { expected: 'Observação QA', next: 'Alteração negada' }, 'PUT'], ['/planning', { expected: null, next: null }, 'PUT']]) assert.equal((await write(suffix, body, method, actor)).status, 403);
        for (const actor of [client, thirdParty]) assert.equal((await http(route + '/history', { actor })).status, 403);
        assert.equal((await http('/project-services/' + crypto.randomUUID() + '/history')).status, 404);
        assert.equal((await http(route + '/history?limit=101')).status, 400);
        await prisma.auditLog.create({ data: { action: 'PRIVATE_OTHER_PROJECT', entityType: 'ProjectService', entityId: crypto.randomUUID(), userId: organizer.id, details: { reason: 'Never expose' } } });
        assert(!(await http(route + '/history?limit=100')).body.data.some(item => item.action === 'PRIVATE_OTHER_PROJECT'));
    });
    await prisma.projectServiceNote.deleteMany({ where: { serviceId: record.id } });
};
