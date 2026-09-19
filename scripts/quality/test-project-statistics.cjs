/* Real HTTP and a disposable PostgreSQL database, supplied by the shared harness. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

module.exports = async ({ run, prisma, origin, admin, unprivileged, client, thirdParty, contractor, company, internal }) => {
    assert.match(process.env.DATABASE_URL, /@127\.0\.0\.1:\d+\//, 'Disposable database required');
    await prisma.projectService.deleteMany();
    const now = Date.now(), start = new Date(now - 86_400_000), end = new Date(now);
    const query = { start: start.toISOString(), end: end.toISOString(), type: 'ALL' };
    const reader = await internal('Leitor indicadores QA', ['schedule.view']);
    async function stats(overrides = {}, actor = admin) {
        const response = await fetch(origin + '/project-services/statistics?' + new URLSearchParams({ ...query, ...overrides }), {
            headers: actor ? { Authorization: 'Bearer ' + actor.token } : {},
        });
        return { status: response.status, body: await response.json() };
    }
    const ok = value => { assert.equal(value.status, 200, JSON.stringify(value.body)); return value.body.data; };
    async function fixture(name, status, type = 'INSTALLATION', overrides = {}) {
        const project = await prisma.project.create({ data: { companyId: company.id, name } });
        const schedule = status === 'PENDING' || overrides.unscheduled ? null : await prisma.schedule.create({ data: {
            projectId: project.id, companyId: company.id, title: name, type, createdById: admin.id, status,
            startDate: new Date(now + 10 * 86_400_000), endDate: new Date(now + 10 * 86_400_000 + 3_600_000),
            completedAt: overrides.completedAt ?? null, cancelledAt: overrides.cancelledAt ?? null,
            installers: { create: { installerId: admin.id } },
        } });
        return prisma.projectService.create({ data: {
            projectId: project.id, scheduleId: schedule?.id, type, urgency: overrides.urgency ?? 0,
            relevant: overrides.relevant ?? false, createdAt: new Date(now - 40 * 86_400_000),
            cancelledAt: overrides.unscheduled ? overrides.cancelledAt : null,
            notes: 'Nota privada não selecionada nos indicadores',
        } });
    }
    await run('Project statistics: confirmed empty state excludes legacy projects, free events and recurrences', async () => {
        assert(await prisma.schedule.count() > 0); assert(await prisma.project.count() > 0);
        const data = ok(await stats());
        assert.deepEqual(data.current, { total: 0, active: 0, pending: 0, scheduled: 0, inProgress: 0, done: 0, cancelled: 0 });
        assert.equal(data.completedInPeriod, 0); assert.equal(data.cancelledInPeriod, 0); assert.deepEqual(data.highlights, []);
    });
    const pending = await fixture('Pendente antigo QA', 'PENDING', 'INSTALLATION', { relevant: true });
    const scheduled = await fixture('Agendado urgente QA', 'SCHEDULED', 'REMOVAL', { urgency: 2 });
    const progress = await fixture('Em andamento QA', 'IN_PROGRESS', 'INSTALLATION', { urgency: 1, relevant: true, completedAt: start });
    const done = await fixture('Concluído início inclusivo QA', 'DONE', 'INSTALLATION', { completedAt: start });
    await fixture('Concluído fim exclusivo QA', 'DONE', 'REMOVAL', { completedAt: end });
    await fixture('Concluído sem data QA', 'DONE');
    await fixture('Concluído anterior QA', 'DONE', 'REMOVAL', { completedAt: new Date(start.getTime() - 1) });
    const cancelled = await fixture('Cancelado sem agenda QA', 'CANCELLED', 'INSTALLATION', { unscheduled: true, cancelledAt: start });
    await fixture('Cancelado realizado QA', 'CANCELLED', 'REMOVAL', { cancelledAt: new Date(now - 1000) });
    await fixture('Cancelado fim exclusivo QA', 'CANCELLED', 'REMOVAL', { cancelledAt: end });
    await fixture('Cancelado sem data QA', 'CANCELLED');
    await run('Project statistics: six totals reconcile unique projects, current backlog and actual half-open event dates', async () => {
        const data = ok(await stats());
        assert.deepEqual(data.current, { total: 11, active: 3, pending: 1, scheduled: 1, inProgress: 1, done: 4, cancelled: 4 });
        assert.equal(data.completedInPeriod, 1); assert.equal(data.cancelledInPeriod, 2);
        assert.deepEqual(data.dataQuality, { completedWithoutDate: 1, cancelledWithoutDate: 1, unclassified: 0 });
        assert.equal(data.current.total, data.current.active + data.current.done + data.current.cancelled);
        assert.equal(data.current.active, data.current.pending + data.current.scheduled + data.current.inProgress);
        const anotherPeriod = ok(await stats({ start: new Date(now - 3_600_000).toISOString() }));
        assert.deepEqual(anotherPeriod.current, data.current);
        assert.equal(anotherPeriod.completedInPeriod, 0); assert.equal(anotherPeriod.cancelledInPeriod, 1);
    });
    await run('Project statistics: service filters partition counts and apply to summaries, history and highlights', async () => {
        const all = ok(await stats()), installation = ok(await stats({ type: 'INSTALLATION' })), removal = ok(await stats({ type: 'REMOVAL' }));
        for (const key of Object.keys(all.current)) assert.equal(installation.current[key] + removal.current[key], all.current[key]);
        for (const key of ['completedInPeriod', 'cancelledInPeriod']) assert.equal(installation[key] + removal[key], all[key]);
        assert(installation.highlights.every(value => value.type === 'INSTALLATION')); assert(removal.highlights.every(value => value.type === 'REMOVAL'));
        assert.equal(installation.current.total, 6); assert.equal(removal.current.total, 5);
    });
    await run('Project statistics: bounded highlights prioritize urgency/dedicated relevance and select no private fields', async () => {
        const marker = await prisma.projectServiceMarker.create({ data: { name: 'Modelo QA', nameKey: crypto.randomUUID() } });
        await prisma.projectService.update({ where: { id: scheduled.id }, data: { markerId: marker.id } });
        const data = ok(await stats());
        assert.deepEqual(data.highlights.map(value => value.id), [scheduled.id, progress.id, pending.id]);
        assert.equal(data.highlights[0].markerName, marker.name); assert.equal(data.highlights[2].startDate, null);
        assert.equal(data.highlights[0].startDate, new Date(now + 10 * 86_400_000).toISOString());
        assert(!/notes|passwordHash|pin4Hash|token|mapsUrl|email|cpf/i.test(JSON.stringify(data)));
    });
    await run('Project statistics: aggregates cover more than one page and multiple executors never multiply projects', async () => {
        await prisma.projectServiceInternal.createMany({ data: [{ serviceId: pending.id, userId: admin.id }, { serviceId: pending.id, userId: reader.id }] });
        await prisma.projectServiceContractor.create({ data: { serviceId: pending.id, userId: contractor.id } });
        const projects = Array.from({ length: 59 }, (_, index) => ({ id: crypto.randomUUID(), companyId: company.id, name: 'Lote pendente ' + index }));
        await prisma.project.createMany({ data: projects });
        await prisma.projectService.createMany({ data: projects.map(value => ({ projectId: value.id, type: 'INSTALLATION', createdAt: new Date(now) })) });
        const data = ok(await stats());
        assert.equal(data.current.pending, 60); assert.equal(data.current.active, 62); assert.equal(data.current.total, 70);
        assert.equal(data.highlights.length, 5); assert.equal(data.highlights[2].id, pending.id);
    });
    await run('Project statistics: reopens remove current completion/cancellation from history, preserving prior audit evidence', async () => {
        async function setStatus(id, status) {
            const response = await fetch(origin + `/project-services/${id}/status`, { method: 'PUT', headers: { Authorization: 'Bearer ' + admin.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
            assert.equal(response.status, 200, JSON.stringify(await response.json()));
        }
        await setStatus(done.id, 'IN_PROGRESS'); await setStatus(cancelled.id, 'PENDING');
        const data = ok(await stats());
        assert.equal(data.completedInPeriod, 0); assert.equal(data.cancelledInPeriod, 1);
        assert.equal(data.current.inProgress, 2); assert.equal(data.current.pending, 61);
        assert.equal((await prisma.schedule.findUnique({ where: { id: done.scheduleId } })).completedAt, null);
        const audit = await prisma.auditLog.findMany({ where: { entityId: { in: [done.id, done.scheduleId, cancelled.id] } } });
        assert(JSON.stringify(audit).includes(start.toISOString()), 'Prior actual date stays auditable');
    });
    await run('Project statistics: UTC/offset-equivalent bounds remain stable under another database session time zone', async () => {
        await prisma.$executeRawUnsafe("SET TIME ZONE 'UTC'"); const utc = ok(await stats());
        await prisma.$executeRawUnsafe("SET TIME ZONE 'America/Sao_Paulo'"); const local = ok(await stats());
        for (const key of ['current', 'completedInPeriod', 'cancelledInPeriod', 'highlights', 'dataQuality']) assert.deepEqual(local[key], utc[key]);
        const offset = value => new Date(value.getTime() - 3 * 3_600_000).toISOString().replace('Z', '-03:00');
        const equivalent = ok(await stats({ start: offset(start), end: offset(end) }));
        assert.deepEqual(equivalent.period, utc.period); assert.equal(equivalent.cancelledInPeriod, utc.cancelledInPeriod);
    });
    await run('Project statistics: unknown statuses stay visible as data quality gaps instead of becoming active', async () => {
        await prisma.schedule.update({ where: { id: scheduled.scheduleId }, data: { status: 'LEGACY_UNKNOWN' } });
        try { const data = ok(await stats()); assert.equal(data.dataQuality.unclassified, 1); assert(!data.highlights.some(value => value.id === scheduled.id)); assert.equal(data.current.total, data.current.active + data.current.done + data.current.cancelled + 1); }
        finally { await prisma.schedule.update({ where: { id: scheduled.scheduleId }, data: { status: 'SCHEDULED' } }); }
    });
    await run('Project statistics: endpoint enforces JWT, internal audience and schedule.view; read-only roles can query', async () => {
        assert.equal((await stats({}, reader)).status, 200);
        for (const actor of [null, unprivileged, client, thirdParty]) assert.equal((await stats({}, actor)).status, actor ? 403 : 401);
    });
    await run('Project statistics: malformed, inverted, oversized and unexpected query fields are rejected', async () => {
        for (const value of [{ type: 'SUPPORT' }, { type: 'REMOVAL\' OR TRUE --' }, { start: 'bad' }, { start: '2026-01-01' }, { end: query.start },
            { start: query.end, end: query.start }, { start: '2000-01-01T00:00:00Z' }, { companyId: company.id }, { limit: '100' }]) assert.equal((await stats(value)).status, 400);
    });
};
if (require.main === module) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-statistics.cjs'), '--project-statistics'], { stdio: 'inherit', windowsHide: true });
    process.exitCode = result.status ?? 1;
}
