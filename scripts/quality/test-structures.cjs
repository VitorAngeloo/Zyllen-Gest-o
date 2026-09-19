const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
module.exports = async ({ run, prisma, origin, tech, unprivileged, client, thirdParty, company, internal }) => {
    const actor = await internal('Estruturas QA', ['schedule.view', 'schedule.create', 'schedule.update']);
    const reader = await internal('Leitura estruturas QA', ['schedule.view']);
    const http = async (route, method = 'GET', body, user = actor) => {
        const response = await fetch(origin + route, { method, headers: { ...(user ? { Authorization: `Bearer ${user.token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
        return { status: response.status, body: await response.json() };
    };
    const ok = (response, expected = 200) => { assert.equal(response.status, expected, JSON.stringify(response.body)); return response.body.data; };
    const createStructure = (changes = {}) => http('/structures', 'POST', { companyId: company.id, name: 'Sala ciclo QA', kind: 'ROOM', ...changes });
    const input = changes => ({ companyId: company.id, name: 'Instalação sala QA', type: 'INSTALLATION', ...changes });
    const create = changes => http('/project-services', 'POST', input(changes));
    const status = (id, state) => http(`/project-services/${id}/status`, 'PUT', { status: state });
    const scheduleStatus = (row, state) => http(`/schedule/${row.schedule.id}`, 'PUT', { status: state });
    const cycles = async () => ok(await http(`/structures/${structure.id}/cycles`));
    const totals = () => Promise.all([prisma.project.count(), prisma.projectService.count(), prisma.structureCycle.count(), prisma.schedule.count(), prisma.auditLog.count()]);
    const startDate = new Date(Date.now() + 12 * 86_400_000).toISOString(), endDate = new Date(Date.parse(startDate) + 3_600_000).toISOString();
    const dated = { startDate, endDate, installerIds: [tech.id], allowConflicts: true };
    let structure, installation, cycle, removed, cancelled, next;
    await run('Structures: explicit identity, client isolation, validated kind and case-insensitive duplicate names', async () => {
        structure = ok(await createStructure(), 201);
        assert.equal(structure.kind, 'ROOM'); assert.equal(structure.company.id, company.id);
        assert.equal((await createStructure({ name: 'SALA CICLO QA' })).status, 409);
        for (const changes of [{ kind: 'ASSET' }, { name: ' ' }, { companyId: crypto.randomUUID() }, { unexpected: true }]) assert.equal((await createStructure(changes)).status, 400);
        const other = await prisma.company.create({ data: { name: 'Outro cliente ciclos QA' } });
        assert.equal((await createStructure({ companyId: other.id })).status, 201);
        assert.equal(ok(await http(`/structures?companyId=${company.id}&search=Sala`)).filter(row => row.id === structure.id).length, 1);
    });
    await run('Structures: legacy services stay unlinked; invalid client/structure rolls back entire creation', async () => {
        const legacy = ok(await create(), 201); assert.equal(legacy.structureCycle, null);
        const before = await totals();
        for (const changes of [{ structureId: crypto.randomUUID() }, { companyId: (await prisma.company.findFirst({ where: { name: 'Outro cliente ciclos QA' } })).id, structureId: structure.id }]) {
            assert.equal((await create(changes)).status, 400); assert.deepEqual(await totals(), before);
        }
    });
    await run('Structures: installation starts one pending cycle; competing installation rolls back', async () => {
        installation = ok(await create({ structureId: structure.id, ...dated }), 201); cycle = installation.structureCycle;
        assert.equal(cycle.structureId, structure.id); assert.equal(cycle.installationId, installation.id);
        const rows = await cycles(); assert.equal(rows.length, 1); assert.equal(rows[0].status, 'PLANNED'); assert.equal(rows[0].installedAt, null); assert.equal(rows[0].durationDays, null);
        const before = await totals(); assert.equal((await create({ structureId: structure.id })).status, 409); assert.deepEqual(await totals(), before);
    });
    await run('Structures: removal requires corresponding completed installation, not scheduled dates', async () => {
        assert.equal((await create({ type: 'REMOVAL', structureId: structure.id, removalCycleId: cycle.id })).status, 400);
        assert.equal(ok(await http(`/structures/${structure.id}/available-cycle`)), null);
        assert.equal((await create({ type: 'REMOVAL', structureId: structure.id })).status, 400);
        assert.equal((await create({ removalCycleId: cycle.id })).status, 400);
    });
    await run('Structures: canonical actual completion drives installation date and elapsed duration', async () => {
        ok(await scheduleStatus(installation, 'DONE'));
        const actual = new Date(Date.now() - 5 * 86_400_000 - 120_000);
        await prisma.schedule.update({ where: { id: installation.schedule.id }, data: { completedAt: actual } });
        const row = (await cycles())[0]; assert.equal(row.installedAt, actual.toISOString()); assert.equal(row.status, 'INSTALLED'); assert.equal(row.durationDays, 5);
        assert.notEqual(row.installedAt, installation.schedule.startDate); assert.equal(ok(await http(`/structures/${structure.id}/available-cycle`)).id, cycle.id);
    });
    await run('Structures: cancelled removal attempt remains visible; another explicit project may retry once', async () => {
        cancelled = ok(await create({ type: 'REMOVAL', name: 'Tentativa cancelada QA', structureId: structure.id, removalCycleId: cycle.id }), 201);
        assert.equal((await create({ type: 'REMOVAL', structureId: structure.id, removalCycleId: cycle.id })).status, 409);
        ok(await status(cancelled.id, 'CANCELLED'));
        removed = ok(await create({ type: 'REMOVAL', name: 'Desinstalação vigente QA', structureId: structure.id, removalCycleId: cycle.id, ...dated }), 201);
        const row = (await cycles())[0]; assert.equal(row.removals.length, 2); assert.equal(row.removals[0].status, 'CANCELLED'); assert.equal(row.removals[1].id, removed.id);
        assert.equal(ok(await http(`/structures/${structure.id}/available-cycle`)), null);
        assert.equal((await status(cancelled.id, 'PENDING')).status, 409);
    });
    await run('Structures: agenda and project endpoints cannot change linked type or detach history', async () => {
        assert.equal((await http(`/schedule/${removed.schedule.id}`, 'PUT', { type: 'INSTALLATION' })).status, 400);
        assert.equal((await http(`/project-services/${installation.id}`, 'PUT', input({ type: 'REMOVAL', projectId: installation.projectId, ...dated }))).status, 400);
        assert.equal((await http(`/project-services/${installation.id}`, 'PUT', input({ structureId: null, projectId: installation.projectId, ...dated }))).status, 400);
        const preserved = ok(await http(`/project-services/${installation.id}`, 'PUT', input({ projectId: installation.projectId, ...dated })));
        assert.equal(preserved.structureCycle.id, cycle.id);
    });
    await run('Structures: installation cannot reopen or cancel while removal remains current', async () => {
        assert.equal((await scheduleStatus(installation, 'SCHEDULED')).status, 400);
        assert.equal((await status(installation.id, 'CANCELLED')).status, 400);
        assert.equal((await create({ structureId: structure.id })).status, 409);
    });
    await run('Structures: removal completion closes cycle using real dates and permits a separate new cycle', async () => {
        ok(await scheduleStatus(removed, 'DONE'));
        const old = (await cycles())[0]; assert.equal(old.status, 'REMOVED'); assert(old.removedAt); assert.equal(old.durationDays, 5);
        next = ok(await create({ structureId: structure.id }), 201);
        const history = await cycles(); assert.equal(history.length, 2); assert.equal(history[0].id, next.structureCycle.id); assert.equal(history[1].id, cycle.id); assert.equal(history[1].installedAt, old.installedAt); assert.equal(history[1].removedAt, old.removedAt);
        assert.equal((await scheduleStatus(removed, 'SCHEDULED')).status, 400); assert.equal((await scheduleStatus(installation, 'SCHEDULED')).status, 400);
        assert.equal((await status(cancelled.id, 'PENDING')).status, 400);
    });
    await run('Structures: cancelling an unstarted cycle preserves it and releases another installation', async () => {
        ok(await status(next.id, 'CANCELLED'));
        const latest = ok(await create({ structureId: structure.id }), 201);
        assert.equal((await cycles()).length, 3); assert.equal((await cycles()).find(row => row.id === next.structureCycle.id).status, 'CANCELLED');
        assert.notEqual(latest.structureCycle.id, next.structureCycle.id);
        assert.equal((await status(next.id, 'PENDING')).status, 409);
    });
    await run('Structures: existing unstarted service can be explicitly linked once; invalid linkage is atomic', async () => {
        const other = ok(await createStructure({ name: 'Totem associação QA', kind: 'TOTEM' }), 201);
        const draft = ok(await create({ name: 'Projeto existente associação QA' }), 201);
        const linked = ok(await http(`/project-services/${draft.id}`, 'PUT', input({ name: draft.name, projectId: draft.projectId, structureId: other.id })));
        assert.equal(linked.structureCycle.structureId, other.id);
        assert.equal((await http(`/project-services/${draft.id}`, 'PUT', input({ projectId: draft.projectId, structureId: structure.id }))).status, 400);
        assert.equal((await prisma.projectService.findUnique({ where: { id: draft.id }, include: { installationCycle: true } })).installationCycle.structureId, other.id);
    });
    await run('Structures: missing actual date and unknown legacy status remain explicit and cannot close a cycle', async () => {
        const row = ok(await createStructure({ name: 'Qualidade de ciclos QA' }), 201);
        const service = ok(await create({ structureId: row.id, ...dated }), 201);
        ok(await status(service.id, 'DONE'));
        await prisma.schedule.update({ where: { id: service.schedule.id }, data: { completedAt: null } });
        const history = ok(await http(`/structures/${row.id}/cycles`)); assert.equal(history[0].status, 'UNCLASSIFIED'); assert.equal(history[0].durationDays, null);
        assert.equal(ok(await http(`/structures/${row.id}/available-cycle`)), null);
        assert.equal((await create({ type: 'REMOVAL', removalCycleId: service.structureCycle.id })).status, 400);
        await prisma.schedule.update({ where: { id: service.schedule.id }, data: { status: 'LEGACY_UNKNOWN' } });
        assert.equal(ok(await http(`/structures/${row.id}/cycles`))[0].status, 'UNCLASSIFIED');
        assert.equal((await create({ structureId: row.id })).status, 409);
    });
    await run('Structures: authorization, pagination, minimal contracts and immutable database history', async () => {
        for (const user of [unprivileged, client, thirdParty]) assert.equal((await http('/structures', 'GET', undefined, user)).status, 403);
        assert.equal((await http('/structures', 'GET', undefined, null)).status, 401);
        assert.equal((await http('/structures', 'POST', { companyId: company.id, name: 'Sem permissão QA', kind: 'ROOM' }, reader)).status, 403);
        assert.equal((await http(`/structures/${structure.id}/cycles?page=0`)).status, 400);
        assert.equal((await http('/structures?limit=101')).status, 400);
        assert.equal((await http('/structures?unexpected=true')).status, 400);
        assert.equal((await http('/structures/invalid/cycles')).status, 400);
        assert.equal((await http(`/structures/${crypto.randomUUID()}/cycles`)).status, 404);
        const page = await http(`/structures/${structure.id}/cycles?limit=1&page=2`); assert.equal(page.body.total, 3); assert.equal(page.body.data.length, 1);
        await assert.rejects(() => prisma.operationalStructure.delete({ where: { id: structure.id } }), error => error.code === 'P2003');
        await assert.rejects(() => prisma.projectService.delete({ where: { id: installation.id } }), error => error.code === 'P2003');
        assert((await prisma.auditLog.count({ where: { action: 'STRUCTURE_CYCLE_LINK' } })) >= 5);
        const json = JSON.stringify(ok(await http(`/structures/${structure.id}/cycles`, 'GET', undefined, reader))); assert(!/pin4Hash|passwordHash|formData|witnessDocument|email/.test(json));
    });
};
if (require.main === module) { const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-statistics.cjs'), '--structures'], { stdio: 'inherit', windowsHide: true }); process.exitCode = result.status ?? 1; }
