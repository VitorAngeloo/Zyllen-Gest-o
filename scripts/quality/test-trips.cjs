/* Real Nest HTTP/guards/transactions and disposable PostgreSQL; no production data. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

module.exports = async ({ run, prisma, origin, admin, unprivileged, client, thirdParty, contractor, company, internal }) => {
    assert.match(process.env.DATABASE_URL, /@127\.0\.0\.1:\d+\//, 'Disposable database required');
    await prisma.projectService.deleteMany(); await prisma.trip.deleteMany();
    const crew = await internal('Equipe viagens QA', ['schedule.view', 'schedule.create', 'schedule.update']);
    const reader = await internal('Consulta viagens QA', ['schedule.view']);
    const now = Date.now(), future = days => new Date(now + days * 86_400_000).toISOString();
    const period = { start: new Date(now - 86_400_000).toISOString(), end: new Date(now + 86_400_000).toISOString() };
    async function http(route, method = 'GET', body, actor = admin) {
        const res = await fetch(origin + route, { method, headers: { ...(actor ? { Authorization: 'Bearer ' + actor.token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
        return { status: res.status, body: await res.json() };
    }
    const ok = (res, status = 200) => { assert.equal(res.status, status, JSON.stringify(res.body)); return res.body.data; };
    const input = (overrides = {}) => ({ title: 'Viagem QA', originCity: 'São Paulo', originState: 'SP', destinationCity: 'Rio de Janeiro', destinationState: 'RJ',
        startDate: future(60), endDate: future(61), installerIds: [crew.id], contractorIds: [], serviceIds: [], ...overrides });
    function values(trip, overrides = {}) { return input({ title: trip.title, originCity: trip.originCity, originState: trip.originState, destinationCity: trip.destinationCity, destinationState: trip.destinationState,
        startDate: trip.startDate, endDate: trip.endDate, notes: trip.notes ?? '', installerIds: trip.internalAssignees.map(item => item.id), contractorIds: trip.contractors.map(item => item.id), serviceIds: trip.services.map(item => item.id), ...overrides }); }
    const stats = (overrides = {}, actor = admin) => http('/trips/statistics?' + new URLSearchParams({ ...period, ...overrides }), 'GET', undefined, actor);
    async function service(name, type = 'INSTALLATION', overrides = {}) {
        const project = await prisma.project.create({ data: { name, companyId: company.id } });
        const { status, startDate, completedAt, ...attributes } = overrides;
        const schedule = status ? await prisma.schedule.create({ data: { title: name, type, status, projectId: project.id, companyId: company.id, createdById: admin.id,
            startDate: new Date(startDate ?? future(65)), endDate: new Date(Date.parse(startDate ?? future(65)) + 3_600_000), completedAt } }) : null;
        return prisma.projectService.create({ data: { projectId: project.id, type, scheduleId: schedule?.id, createdAt: new Date(now - 40 * 86_400_000), ...attributes } });
    }
    let trip, project;
    const projectInput = (overrides = {}) => ({
        companyId: company.id, name: 'Instalação com viagem QA', type: 'INSTALLATION',
        address: 'Rua de teste, 10', city: 'Rio de Janeiro', state: 'RJ',
        startDate: future(60), endDate: future(61), installerIds: [crew.id],
        requiresTravel: true, travelOriginCity: 'São Paulo', travelOriginState: 'SP',
        travelParticipantIds: [admin.id], ...overrides,
    });
    await run('Trips: project creation produces one linked trip and a separate calendar event', async () => {
        project = ok(await http('/project-services', 'POST', projectInput()), 201);
        assert.equal(project.type, 'INSTALLATION');
        assert.equal(project.trip.originCity, 'São Paulo');
        assert.equal(project.trip.participantIds[0], admin.id);
        trip = ok(await http('/trips/' + project.trip.id));
        assert.equal(trip.destinationCity, 'Rio de Janeiro');
        assert.equal(trip.destinationState, 'RJ');
        assert.equal(trip.services.length, 1);
        assert.equal(trip.services[0].id, project.id);
        assert.equal(await prisma.trip.count(), 1);
        assert.notEqual(project.schedule.id, trip.scheduleId);
        assert.equal(ok(await http('/schedule/' + trip.scheduleId)).trip.id, trip.id);
        assert.equal(ok(await http('/schedule/' + project.schedule.id)).projectService.id, project.id);
    });
    await run('Trips: direct writes are unavailable; invalid project travel rolls back', async () => {
        assert.equal((await http('/trips', 'POST', input())).status, 404);
        assert.equal((await http('/trips/' + trip.id, 'PUT', input())).status, 404);
        const dashboard = await internal('Dashboard');
        await prisma.internalUser.update({ where: { id: dashboard.id }, data: { roleId: admin.roleId } });
        const before = [await prisma.trip.count(), await prisma.projectService.count(), await prisma.schedule.count()];
        for (const overrides of [
            { travelOriginCity: '' }, { travelOriginState: '' }, { travelParticipantIds: [] },
            { city: '' }, { state: '' }, { startDate: undefined, endDate: undefined },
            { travelParticipantIds: [crypto.randomUUID()] },
            { travelParticipantIds: [dashboard.id] },
        ]) assert.equal((await http('/project-services', 'POST', projectInput({ name: 'Inválido QA', allowConflicts: true, ...overrides }))).status, 400);
        assert.deepEqual([await prisma.trip.count(), await prisma.projectService.count(), await prisma.schedule.count()], before);
    });
    await run('Trips: project updates synchronize route, participants and dates', async () => {
        const startDate = future(62), endDate = future(63);
        project = ok(await http('/project-services/' + project.id, 'PUT', projectInput({
            projectId: project.projectId, name: 'Viagem atualizada QA', city: 'Campinas', state: 'SP',
            startDate, endDate, allowConflicts: true,
        })));
        trip = ok(await http('/trips/' + project.trip.id));
        assert.equal(trip.destinationCity, 'Campinas');
        assert.equal(trip.interstate, false);
        assert.equal(trip.startDate, startDate);
        assert.equal(trip.endDate, endDate);
        assert.equal(trip.internalAssignees[0].id, admin.id);
        assert.equal(await prisma.trip.count(), 1);
    });
    await run('Trips: departure and return use actual timestamps; project cannot erase linked trip', async () => {
        assert.equal((await http('/project-services/' + project.id, 'PUT', projectInput({ projectId: project.projectId, requiresTravel: false }))).status, 400);
        assert.equal((await http('/trips/' + trip.id + '/status', 'PUT', { status: 'DONE' })).status, 400);
        assert.equal((await http('/schedule/' + trip.scheduleId, 'PUT', { status: 'DONE' })).status, 400);
        const before = Date.now();
        trip = ok(await http('/trips/' + trip.id + '/status', 'PUT', { status: 'IN_PROGRESS' }));
        assert(Date.parse(trip.startedAt) >= before && Date.parse(trip.startedAt) <= Date.now());
        assert.equal((await http('/project-services/' + project.id, 'PUT', projectInput({ projectId: project.projectId,
            city: 'Niterói', state: 'RJ', startDate: future(62), endDate: future(63), allowConflicts: true }))).status, 400);
        assert.equal(ok(await http('/trips/' + trip.id)).destinationCity, 'Campinas');
        trip = ok(await http('/trips/' + trip.id + '/status', 'PUT', { status: 'DONE' }));
        assert(trip.completedAt);
        assert.equal(ok(await stats()).tripsCompleted, 1);
    });
    await run('Trips: list, filters, statistics and permissions remain available', async () => {
        const list = await http('/trips?status=DONE&limit=1');
        assert.equal(list.status, 200); assert.equal(list.body.total, 1);
        assert.equal(list.body.data[0].id, trip.id);
        assert.equal((await http('/trips?interstate=true')).body.total, 0);
        assert.equal((await http('/trips?search=' + encodeURIComponent("' OR TRUE --"))).body.total, 0);
        for (const suffix of ['limit=101', 'page=0', 'status=PENDING', 'interstate=1', 'ownerId=abc']) assert.equal((await http('/trips?' + suffix)).status, 400);
        for (const actor of [null, unprivileged, client, thirdParty]) for (const route of ['/trips', '/trips/options', '/trips/' + trip.id, '/trips/statistics?' + new URLSearchParams(period)]) assert.equal((await http(route, 'GET', undefined, actor)).status, actor ? 403 : 401);
        assert.equal((await http('/trips', 'GET', undefined, reader)).status, 200);
        assert.equal((await http('/trips/' + trip.id + '/status', 'PUT', { status: 'IN_PROGRESS' }, reader)).status, 403);
        const options = ok(await http('/trips/options'));
        assert(!/passwordHash|pin4Hash|email|cpf|token/i.test(JSON.stringify(options)));
    });
    await prisma.projectService.deleteMany(); await prisma.trip.deleteMany();
    await run('Operations: legacy calendar events/projects never inflate an empty operational dataset', async () => {
        const data = ok(await stats()); assert.equal(data.installationsCompleted, 0); assert.equal(data.removalsCompleted, 0); assert.equal(data.tripsCompleted, 0); assert.equal(data.tripsPlanned, 0);
        assert.deepEqual(data.current, { plannedTrips: 0, tripsInProgress: 0 }); assert.deepEqual(data.nextInstallations, []); assert.deepEqual(data.nextInterstateTrips, []);
    });
    const bounds = { start: new Date(now - 10 * 86_400_000).toISOString(), end: new Date(now + 10 * 86_400_000).toISOString() };
    let latestId;
    for (let index = 0; index < 7; index++) {
        const created = await service('Instalação concluída ' + index, 'INSTALLATION', { status: 'DONE', completedAt: new Date(now - index * 1000), startDate: future(200) }); if (!index) latestId = created.id;
        await service('Desinstalação concluída ' + index, 'REMOVAL', { status: 'DONE', completedAt: new Date(now - index * 1000), startDate: future(200) });
        await service('Próxima instalação ' + index, 'INSTALLATION', { status: 'SCHEDULED', startDate: future(index + 1), relevant: true, urgency: index === 6 ? 2 : 0 });
    }
    await service('Inclusivo inicial', 'INSTALLATION', { status: 'DONE', completedAt: new Date(bounds.start) });
    await service('Exclusivo final', 'INSTALLATION', { status: 'DONE', completedAt: new Date(bounds.end) });
    await service('Concluída sem data', 'INSTALLATION', { status: 'DONE' });
    await service('Pendente em destaque', 'INSTALLATION', { relevant: true, urgency: 1, requiresTravel: true });
    for (let index = 0; index < 7; index++) {
        const schedule = await prisma.schedule.create({ data: { title: 'Interestadual próxima ' + index, type: 'OTHER', status: 'SCHEDULED', startDate: new Date(future(index + 1)), endDate: new Date(future(index + 1.5)), createdById: admin.id } });
        await prisma.trip.create({ data: { scheduleId: schedule.id, originCity: 'Origem QA', originState: 'SP', destinationCity: 'Destino QA', destinationState: 'RJ' } });
    }
    async function tripFixture(status, attributes = {}) {
        const schedule = await prisma.schedule.create({ data: { title: 'Viagem indicador QA', type: 'OTHER', status, startDate: new Date(attributes.startDate ?? future(2)), endDate: new Date(future(3)), completedAt: attributes.completedAt, createdById: admin.id } });
        return prisma.trip.create({ data: { scheduleId: schedule.id, originCity: 'Origem QA', originState: 'SP', destinationCity: 'Destino QA', destinationState: attributes.state ?? 'RJ' } });
    }
    const sharedTrip = await tripFixture('DONE', { completedAt: new Date(bounds.start), startDate: future(200) });
    const sharedServices = await prisma.projectService.findMany({ where: { type: 'INSTALLATION', schedule: { status: 'DONE' } }, take: 3 });
    await prisma.projectService.updateMany({ where: { id: { in: sharedServices.map(item => item.id) } }, data: { tripId: sharedTrip.id, requiresTravel: true } });
    await tripFixture('DONE', { completedAt: new Date(bounds.end) }); await tripFixture('DONE'); await tripFixture('CANCELLED'); await tripFixture('SCHEDULED', { state: 'SP' });
    await tripFixture('IN_PROGRESS', { startDate: bounds.start }); await tripFixture('SCHEDULED', { startDate: bounds.end });
    await run('Operations: totals use real completion, inclusive/exclusive UTC bounds and one trip despite multiple linked services', async () => {
        const data = ok(await stats(bounds)); assert.equal(data.installationsCompleted, 8); assert.equal(data.removalsCompleted, 7); assert.equal(data.tripsCompleted, 1); assert.equal(data.tripsPlanned, 9);
        assert.deepEqual(data.current, { plannedTrips: 9, tripsInProgress: 1 }); assert.equal(data.dataQuality.servicesCompletedWithoutDate, 1); assert.equal(data.dataQuality.tripsCompletedWithoutDate, 1); assert.equal(data.dataQuality.travelWithoutBooking, 1);
    });
    await run('Operations: each section is bounded to five, sorted by its purpose and excludes unknown actual dates/private notes', async () => {
        const data = ok(await stats(bounds)); for (const key of ['nextInstallations', 'relevantInstallations', 'latestInstallations', 'latestRemovals', 'nextInterstateTrips']) assert.equal(data[key].length, 5, key);
        assert.equal(data.latestInstallations[0].id, latestId); assert.equal(data.nextInstallations[0].name, 'Próxima instalação 0'); assert.equal(data.relevantInstallations[0].urgency, 2); assert.equal(data.relevantInstallations[1].startDate, null);
        assert(data.latestInstallations.every(item => item.completedAt)); assert(data.nextInterstateTrips.every(item => item.originState !== item.destinationState));
        assert(!/notes|passwordHash|pin4Hash|email|cpf|token|mapsUrl/i.test(JSON.stringify(data)));
    });
    await run('Operations: another database time zone and equivalent offset instants preserve all counts and ordering', async () => {
        await prisma.$executeRawUnsafe("SET TIME ZONE 'UTC'"); const utc = ok(await stats(bounds)); await prisma.$executeRawUnsafe("SET TIME ZONE 'America/Sao_Paulo'"); const local = ok(await stats(bounds));
        for (const key of Object.keys(utc).filter(key => key !== 'generatedAt')) assert.deepEqual(local[key], utc[key], key);
        const offset = value => new Date(Date.parse(value) - 3 * 3_600_000).toISOString().replace('Z', '-03:00'); const equivalent = ok(await stats({ start: offset(bounds.start), end: offset(bounds.end) })); assert.deepEqual(equivalent.period, utc.period); assert.equal(equivalent.tripsCompleted, utc.tripsCompleted);
    });
    await run('Operations: unknown persisted types/statuses are reported rather than reclassified as active or completed', async () => {
        const before = ok(await stats(bounds));
        await prisma.projectService.update({ where: { id: latestId }, data: { type: 'MAINTENANCE' } });
        await prisma.schedule.update({ where: { id: sharedTrip.scheduleId }, data: { status: 'LEGACY_UNKNOWN' } });
        try {
            const after = ok(await stats(bounds)); assert.equal(after.dataQuality.unclassified, 2); assert.equal(after.installationsCompleted, before.installationsCompleted - 1); assert.equal(after.tripsCompleted, 0);
            assert(!after.latestInstallations.some(item => item.id === latestId));
        } finally {
            await prisma.projectService.update({ where: { id: latestId }, data: { type: 'INSTALLATION' } }); await prisma.schedule.update({ where: { id: sharedTrip.scheduleId }, data: { status: 'DONE' } });
        }
    });
    await run('Operations: malformed, inverted, oversized or injected period/type queries are rejected', async () => {
        for (const override of [{ start: 'bad' }, { start: '2026-01-01' }, { end: period.start }, { start: '2000-01-01T00:00:00Z' }, { type: 'INSTALLATION' }, { companyId: company.id }, { limit: '100' }]) assert.equal((await stats(override)).status, 400);
        assert.equal((await stats({}, reader)).status, 200);
    });
};
if (require.main === module) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-statistics.cjs'), '--trips'], { stdio: 'inherit', windowsHide: true }); process.exitCode = result.status ?? 1;
}
