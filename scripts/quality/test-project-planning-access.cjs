const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// Synthetic roles exercise existing permissions; they do not define department access.
module.exports = async ({ run, prisma, http, ok, create, internal, organizer, reader, client, thirdParty, unprivileged }) => {
    const creator = await internal('Somente cadastro QA', ['schedule.create']);
    const editor = await internal('Somente alteração QA', ['schedule.update']);
    const project = ok(await create({ name: 'Proteção cronograma QA' }), 201), base = '/project-services/' + project.id;
    const pendingId = crypto.randomUUID();
    ok(await http(base + '/pending', { actor: organizer, method: 'POST', body: { id: pendingId, type: 'Outra' } }), 201);
    const writes = [
        ['POST', base + '/pending', { id: crypto.randomUUID(), type: 'Outra' }],
        ['PUT', base + '/pending/' + pendingId, { type: 'Outra', expectedVersion: 0 }],
        ['PUT', base + '/pending/' + pendingId + '/resolve', { expectedVersion: 0 }],
        ['POST', base + '/notes', { id: crypto.randomUUID(), text: 'Anotação não autorizada' }],
        ['PUT', base + '/planning', { expected: null, next: { stage: 'pausado', forecast: null } }],
        ['PUT', base + '/observations', { expected: null, next: 'Alteração não autorizada' }],
        ['POST', base + '/cancel', { expectedStatus: 'PENDING', reason: 'Cancelamento não autorizado' }],
    ];
    await run('Planning authorization: anonymous, external, read-only, create-only and unprivileged direct writes cannot change data or audit', async () => {
        const before = await Promise.all([prisma.projectService.findUnique({ where: { id: project.id } }), prisma.projectServicePending.findUnique({ where: { id: pendingId } }), prisma.projectServiceNote.count(), prisma.auditLog.count()]);
        for (const actor of [null, client, thirdParty, reader, creator, unprivileged]) {
            for (const [method, route, body] of writes) {
                const response = await http(route, { actor, method, body }); assert.equal(response.status, actor ? 403 : 401, method + ' ' + route);
            }
        }
        assert.deepEqual(await Promise.all([prisma.projectService.findUnique({ where: { id: project.id } }), prisma.projectServicePending.findUnique({ where: { id: pendingId } }), prisma.projectServiceNote.count(), prisma.auditLog.count()]), before);
    });
    await run('Planning authorization: view, create and update remain independent; no sector or role name grants new access', async () => {
        for (const route of [base, base + '/history', '/project-services/options', '/project-services?limit=1']) {
            assert.equal((await http(route, { actor: reader })).status, 200);
            for (const actor of [editor, creator, unprivileged, client, thirdParty]) assert.equal((await http(route, { actor })).status, 403);
        }
        ok(await http(base + '/notes', { actor: editor, method: 'POST', body: { id: crypto.randomUUID(), text: 'Escrita pelo direito atual de alteração' } }), 201);
        const note = await prisma.projectServiceNote.findFirst({ where: { serviceId: project.id } }); assert.equal(note.authorId, editor.id);
        const permissions = await prisma.screenPermission.findMany({ where: { screen: { in: ['planning', 'chronogram'] } } }); assert.deepEqual(permissions, []);
    });
    await run('Release access: Internos cannot read or write the planning API even if schedule permissions were assigned', async () => {
        const actor = await internal('Bloqueio temporário QA', ['schedule.view', 'schedule.create', 'schedule.update']);
        const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Internos' } });
        const permissions = await prisma.screenPermission.findMany({ where: { screen: 'schedule', action: { in: ['view', 'create', 'update'] } } });
        await prisma.rolePermission.createMany({ data: permissions.map(item => ({ roleId: role.id, screenPermissionId: item.id })), skipDuplicates: true });
        await prisma.internalUser.update({ where: { id: actor.id }, data: { roleId: role.id } });
        for (const route of [base, base + '/history', '/project-services/options', '/project-services?limit=1']) assert.equal((await http(route, { actor })).status, 403);
        for (const [method, route, body] of writes) assert.equal((await http(route, { actor, method, body })).status, 403);
        await prisma.rolePermission.deleteMany({ where: { roleId: role.id, screenPermissionId: { in: permissions.map(item => item.id) } } });
    });
    await prisma.projectServicePending.deleteMany({ where: { serviceId: project.id } });
    await prisma.projectServiceNote.deleteMany({ where: { serviceId: project.id } });
};
