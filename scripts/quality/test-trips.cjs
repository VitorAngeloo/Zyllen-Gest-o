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
    const installation = await service('Instalação da viagem QA'), removal = await service('Desinstalação da viagem QA', 'REMOVAL');
    let trip, contractorTrip;
    await run('Trips: multiple services share one canonical calendar event and keep one service per project', async () => {
        trip = ok(await http('/trips', 'POST', input({ serviceIds: [installation.id, removal.id, installation.id], notes: 'Observação interna QA' })), 201);
        assert.equal(trip.services.length, 2); assert.equal(trip.interstate, true); assert.equal(trip.status, 'SCHEDULED');
        assert.equal(trip.startedAt, null); assert.equal(trip.completedAt, null);
        assert.equal(await prisma.trip.count(), 1);
        const linked = await prisma.projectService.findMany({ where: { tripId: trip.id } }); assert.equal(linked.length, 2); assert(linked.every(item => item.requiresTravel));
        assert.equal(await prisma.projectService.count({ where: { projectId: installation.projectId } }), 1);
        const event = ok(await http('/schedule/' + trip.scheduleId));
        assert.equal(event.trip.id, trip.id); assert.equal(event.type, 'OTHER'); assert.equal(event.projectId, null); assert.equal(event.projectService, null);
        const record = ok(await http('/project-services/' + installation.id)); assert.equal(record.trip.id, trip.id);
    });
    await run('Trips: contractor-only travel appears in the agenda and within-state travel remains explicit', async () => {
        contractorTrip = ok(await http('/trips', 'POST', input({ title: 'Terceirizado dentro do estado QA', installerIds: [], contractorIds: [contractor.id], destinationState: 'SP', destinationCity: 'Campinas', startDate: future(70), endDate: future(71) })), 201);
        assert.equal(contractorTrip.internalAssignees.length, 0); assert.equal(contractorTrip.contractors[0].id, contractor.id); assert.equal(contractorTrip.interstate, false);
        const event = ok(await http('/schedule/' + contractorTrip.scheduleId)); assert.equal(event.trip.id, contractorTrip.id); assert.equal(event.installers.length, 0);
        assert.deepEqual(event.trip.contractors, [{ id: contractor.id, name: contractor.name }]);
        const events = ok(await http('/schedule?limit=100')); assert(events.some(item => item.trip?.id === contractorTrip.id));
    });
    await run('Trips: invalid route, interval, staff, foreign service or unknown fields leave no orphan event/audit/association', async () => {
        const before = { events: await prisma.schedule.count(), trips: await prisma.trip.count(), audits: await prisma.auditLog.count() };
        for (const overrides of [{ originState: 'XX' }, { originCity: ' ' }, { endDate: future(59) }, { startDate: '2026-09-18' }, { installerIds: [], contractorIds: [] },
            { installerIds: [crypto.randomUUID()] }, { serviceIds: [crypto.randomUUID()] }, { completedAt: future(62) }]) assert.equal((await http('/trips', 'POST', input(overrides))).status, 400, JSON.stringify(overrides));
        assert.deepEqual({ events: await prisma.schedule.count(), trips: await prisma.trip.count(), audits: await prisma.auditLog.count() }, before);
    });
    await run('Trips: association cannot be stolen; explicit unlink preserves need and prior audit history', async () => {
        const clash = await http('/trips/' + contractorTrip.id, 'PUT', values(contractorTrip, { serviceIds: [installation.id] })); assert.equal(clash.status, 409);
        assert.equal((await prisma.projectService.findUnique({ where: { id: installation.id } })).tripId, trip.id);
        trip = ok(await http('/trips/' + trip.id, 'PUT', values(trip, { serviceIds: [removal.id] })));
        const unlinked = await prisma.projectService.findUnique({ where: { id: installation.id } }); assert.equal(unlinked.tripId, null); assert.equal(unlinked.requiresTravel, true);
        contractorTrip = ok(await http('/trips/' + contractorTrip.id, 'PUT', values(contractorTrip, { serviceIds: [installation.id] })));
        assert.equal(contractorTrip.services[0].id, installation.id);
        const audit = await prisma.auditLog.findMany({ where: { entityId: trip.id, action: 'TRIP_UPDATE' } }); assert(JSON.stringify(audit).includes(installation.id));
    });
    await run('Trips: a linked service cannot erase the travel requirement', async () => {
        const res = await http('/project-services/' + installation.id, 'PUT', { companyId: company.id, name: 'Instalação da viagem QA', type: 'INSTALLATION', requiresTravel: false });
        assert.equal(res.status, 400); assert.equal((await prisma.projectService.findUnique({ where: { id: installation.id } })).requiresTravel, true);
    });
    await run('Trips: conflicts include contractor trips and require an explicit override, while linked service overlap is expected', async () => {
        const before = await prisma.trip.count();
        assert.equal((await http('/trips', 'POST', input({ installerIds: [], contractorIds: [contractor.id], startDate: future(70), endDate: future(71) }))).status, 409);
        assert.equal(await prisma.trip.count(), before);
        const override = ok(await http('/trips', 'POST', input({ installerIds: [], contractorIds: [contractor.id], startDate: future(70), endDate: future(71), allowConflicts: true })), 201);
        assert.equal(override.contractors.length, 1);
        const projectInput = { companyId: company.id, name: 'Conflito projeto com viagem QA', type: 'INSTALLATION', installerIds: [], contractorIds: [contractor.id], startDate: future(70), endDate: future(71) };
        assert.equal((await http('/project-services', 'POST', projectInput)).status, 409);
        const linked = await service('Execução dentro da viagem QA', 'REMOVAL', { status: 'SCHEDULED', startDate: future(60.5) });
        await prisma.scheduleInstaller.create({ data: { scheduleId: linked.scheduleId, installerId: crew.id } });
        await prisma.projectServiceInternal.create({ data: { serviceId: linked.id, userId: crew.id } });
        trip = ok(await http('/trips/' + trip.id, 'PUT', values(trip, { serviceIds: [removal.id, linked.id] })));
        assert.equal((await http('/schedule/' + trip.scheduleId, 'PUT', { startDate: future(60), endDate: future(61.5) })).status, 200);
        assert.equal((await http('/schedule/' + linked.scheduleId, 'PUT', { startDate: future(60.6), endDate: future(60.7) })).status, 200);
        assert.equal((await http('/schedule/' + linked.scheduleId, 'PUT', { startDate: future(70), endDate: future(71), installerIds: [] })).status, 400, 'Cannot remove the sole responsible');
    });
    await run('Trips: calendar changes persist in the same travel record; it cannot become a service or recurring cancellation', async () => {
        trip = ok(await http('/trips/' + trip.id));
        assert.equal(trip.endDate, future(61.5));
        assert.equal((await http('/schedule/' + trip.scheduleId, 'PUT', { type: 'INSTALLATION' })).status, 400);
        assert.equal((await http('/schedule/' + trip.scheduleId, 'PUT', { projectId: installation.projectId })).status, 400);
        assert.equal((await http('/schedule/' + trip.scheduleId + '?cancelSeries=true', 'DELETE')).status, 400);
        assert.equal((await prisma.schedule.findUnique({ where: { id: trip.scheduleId } })).status, 'SCHEDULED');
    });
    await run('Trips: departure/return require explicit actions, planned future dates never become actual execution', async () => {
        assert.equal((await http('/trips/' + trip.id + '/status', 'PUT', { status: 'DONE' })).status, 400);
        assert.equal((await http('/schedule/' + trip.scheduleId, 'PUT', { status: 'DONE' })).status, 400, 'Calendar cannot bypass start confirmation');
        const before = Date.now(); trip = ok(await http('/trips/' + trip.id + '/status', 'PUT', { status: 'IN_PROGRESS' })); const after = Date.now();
        assert(Date.parse(trip.startedAt) >= before && Date.parse(trip.startedAt) <= after); assert.equal(trip.completedAt, null); assert(Date.parse(trip.startDate) > after);
        const first = trip.startedAt; trip = ok(await http('/trips/' + trip.id + '/status', 'PUT', { status: 'IN_PROGRESS' })); assert.equal(trip.startedAt, first);
        assert.equal((await http('/trips/' + trip.id, 'PUT', values(trip, { destinationCity: 'Destino diferente' }))).status, 400);
        trip = ok(await http('/trips/' + trip.id + '/status', 'PUT', { status: 'DONE' })); assert(trip.completedAt); assert(Date.parse(trip.completedAt) >= Date.parse(trip.startedAt));
        const finished = trip.completedAt; trip = ok(await http('/trips/' + trip.id + '/status', 'PUT', { status: 'DONE' })); assert.equal(trip.completedAt, finished);
        assert.equal(ok(await stats()).tripsCompleted, 1);
    });
    await run('Trips: reopening clears current real dates but keeps prior timestamps in immutable audits', async () => {
        const completedAt = trip.completedAt, startedAt = trip.startedAt;
        assert.equal((await http('/trips/' + trip.id, 'PUT', values(trip))).status, 400);
        assert.equal((await http('/schedule/' + trip.scheduleId, 'PUT', { title: 'Tentativa direta' })).status, 400);
        assert.equal((await http('/trips/' + trip.id + '/status', 'PUT', { status: 'IN_PROGRESS' })).status, 400);
        trip = ok(await http('/trips/' + trip.id + '/status', 'PUT', { status: 'SCHEDULED' })); assert.equal(trip.startedAt, null); assert.equal(trip.completedAt, null);
        const audits = await prisma.auditLog.findMany({ where: { entityId: trip.scheduleId } }); assert(JSON.stringify(audits).includes(completedAt)); assert(JSON.stringify(audits).includes(startedAt));
        assert.equal(ok(await stats()).tripsCompleted, 0);
        trip = ok(await http('/trips/' + trip.id + '/status', 'PUT', { status: 'CANCELLED' })); const at = trip.cancelledAt;
        assert(at); trip = ok(await http('/trips/' + trip.id + '/status', 'PUT', { status: 'CANCELLED' })); assert.equal(trip.cancelledAt, at);
        assert.equal(trip.services.length, 2);
        trip = ok(await http('/trips/' + trip.id + '/status', 'PUT', { status: 'SCHEDULED' })); assert.equal(trip.cancelledAt, null);
    });
    await run('Trips: list pagination/filter/search are validated and options never expose credentials or CPF', async () => {
        const interstate = await http('/trips?interstate=true&limit=1'); assert.equal(interstate.status, 200); assert.equal(interstate.body.limit, 1); assert(interstate.body.total >= 2); assert.equal(interstate.body.data.length, 1);
        assert.equal((await http('/trips?interstate=false')).body.total, 1);
        assert.equal((await http('/trips?search=' + encodeURIComponent("' OR TRUE --"))).body.total, 0);
        for (const suffix of ['limit=101', 'page=0', 'status=PENDING', 'interstate=1', 'ownerId=abc']) assert.equal((await http('/trips?' + suffix)).status, 400);
        const options = ok(await http('/trips/options')); assert(options.internalUsers.some(item => item.id === crew.id)); assert(options.services.some(item => item.id === installation.id && item.tripId === contractorTrip.id));
        assert(!/passwordHash|pin4Hash|email|cpf|token|notes/i.test(JSON.stringify(options)));
    });
    await run('Trips: endpoints enforce JWT, internal audience and schedule permissions, without granting maintenance rights', async () => {
        for (const actor of [null, unprivileged, client, thirdParty]) for (const route of ['/trips', '/trips/options', '/trips/' + trip.id, '/trips/statistics?' + new URLSearchParams(period)]) assert.equal((await http(route, 'GET', undefined, actor)).status, actor ? 403 : 401);
        assert.equal((await http('/trips', 'GET', undefined, reader)).status, 200);
        assert.equal((await http('/trips', 'POST', input({ startDate: future(80), endDate: future(81) }), reader)).status, 403);
        assert.equal((await http('/trips/' + trip.id + '/status', 'PUT', { status: 'IN_PROGRESS' }, reader)).status, 403);
        assert.equal((await http('/trips/' + trip.id + '/status', 'PUT', { status: 'PENDING' })).status, 400);
        assert.equal(await prisma.rolePermission.count({ where: { roleId: unprivileged.roleId, screenPermission: { screen: 'maintenance' } } }), 0);
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
