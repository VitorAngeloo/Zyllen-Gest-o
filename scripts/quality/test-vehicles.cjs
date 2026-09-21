/* Real guards, Prisma, migration and atomic reservations; disposable PGlite only. */
const assert = require('node:assert/strict'), crypto = require('node:crypto'), path = require('node:path');
const { spawnSync } = require('node:child_process');
module.exports = async ({ run, prisma, origin, admin, unprivileged, client, thirdParty, internal }) => {
    assert.match(process.env.DATABASE_URL, /@127\.0\.0\.1:\d+\//);
    const crew = await internal('Carros gestor QA', ['schedule.view','schedule.create','schedule.update','schedule.delete']);
    const reader = await internal('Carros consulta QA', ['schedule.view']);
    const now = Date.now(), time = hours => new Date(now + hours * 3600000).toISOString();
    async function http(route, method = 'GET', body, actor = admin) {
        const response = await fetch(origin + route, { method, headers: { ...(actor ? { Authorization: 'Bearer ' + actor.token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
        return { status: response.status, body: await response.json() };
    }
    async function photoRequest(route, fields, actor = crew) {
        const form = new FormData();
        for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
        form.append('odometerPhoto', new Blob([Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 0, 0, 0])], { type: 'image/jpeg' }), 'painel.jpg');
        const response = await fetch(origin + route, { method: 'POST', headers: { Authorization: 'Bearer ' + actor.token }, body: form });
        return { status: response.status, body: await response.json() };
    }
    const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body.data; };
    const carInput = (values = {}) => ({ requestId: crypto.randomUUID(), name: 'Carro operacional QA', plate: 'abc-1d23', active: true, ...values });
    let car, other, booking;
    const reserveInput = (values = {}) => ({ requestId: crypto.randomUUID(), vehicleId: car.id, title: 'Visita operacional QA', responsibleId: crew.id, startDate: time(24), endDate: time(26), notes: 'Observação QA', ...values });
    const values = booking => ({ vehicleId: booking.vehicle.id, title: booking.title, responsibleId: booking.responsible.id, startDate: booking.startDate, endDate: booking.endDate, notes: booking.notes });
    const range = () => '/vehicles/reservations?' + new URLSearchParams({ start: time(-24), end: time(200) });
    await run('Vehicles: empty fleet/statistics are successful, private, and do not create records', async () => {
        assert.deepEqual(ok(await http('/vehicles')), []);
        const stats = ok(await http('/vehicles/statistics')); assert.equal(stats.activeVehicles, 0); assert.equal(stats.availableVehicles, 0); assert.deepEqual(stats.upcoming, []);
        assert.equal(await prisma.vehicle.count(), 0);
    });
    await run('Vehicles: validated normalized unique plate, optional plate, role access and idempotent creation', async () => {
        const input = carInput(); car = ok(await http('/vehicles', 'POST', input, crew), 201); assert.equal(car.plate, 'ABC1D23');
        assert.equal(ok(await http('/vehicles', 'POST', input, crew), 201).id, car.id); assert.equal(await prisma.vehicle.count(), 1);
        assert.equal((await http('/vehicles', 'POST', { ...input, name: 'Outro nome' }, crew)).status, 409);
        assert.equal((await http('/vehicles', 'POST', carInput(), crew)).status, 409);
        other = ok(await http('/vehicles', 'POST', carInput({ name: 'Carro sem placa QA', plate: null }), crew), 201);
        assert.equal((await http('/vehicles', 'POST', carInput({ plate: 'invalid' }), crew)).status, 400);
        assert.equal((await http('/vehicles', 'POST', carInput({ plate: null }), reader)).status, 403);
        assert.equal(await prisma.auditLog.count({ where: { action: 'VEHICLE_CREATE', entityId: car.id } }), 1);
        const options = ok(await http('/vehicles/options', 'GET', undefined, reader)); assert(options.responsibleUsers.some(item => item.id === crew.id)); assert(!JSON.stringify(options).includes('passwordHash'));
    });
    await run('Vehicles: create independent reservation, preserve request on replay and reject changed replay', async () => {
        const before = await prisma.schedule.count(), input = reserveInput(); booking = ok(await http('/vehicles/reservations', 'POST', input, crew), 201);
        assert.equal(ok(await http('/vehicles/reservations', 'POST', input, crew), 201).id, booking.id);
        assert.equal((await http('/vehicles/reservations', 'POST', { ...input, title: 'Mudou' }, crew)).status, 409);
        assert.equal(await prisma.vehicleReservation.count(), 1); assert.equal(await prisma.schedule.count(), before);
        assert.equal(await prisma.auditLog.count({ where: { action: 'VEHICLE_RESERVE', entityId: booking.id } }), 1);
    });
    await run('Vehicles: half-open intervals allow adjacent times and another vehicle but block all overlaps', async () => {
        for (const [start, end] of [[23,25],[25,27],[23,27],[24,26]]) assert.equal((await http('/vehicles/reservations', 'POST', reserveInput({ startDate: time(start), endDate: time(end) }), crew)).status, 409);
        ok(await http('/vehicles/reservations', 'POST', reserveInput({ startDate: time(26), endDate: time(27) }), crew), 201);
        ok(await http('/vehicles/reservations', 'POST', reserveInput({ vehicleId: other.id }), crew), 201);
        const result = await http(range() + '&limit=1&page=2'); ok(result); assert.equal(result.body.total, 3); assert.equal(result.body.data.length, 1);
    });
    await run('Vehicles: concurrent overlapping requests admit exactly one reservation', async () => {
        const input = reserveInput({ startDate: time(48), endDate: time(50) });
        const results = await Promise.all([http('/vehicles/reservations', 'POST', input, crew), http('/vehicles/reservations', 'POST', { ...input, requestId: crypto.randomUUID() }, crew)]);
        assert.deepEqual(results.map(result => result.status).sort(), [201,409]);
        assert.equal(await prisma.vehicleReservation.count({ where: { vehicleId: car.id, startDate: new Date(time(48)) } }), 1);
    });
    await run('Vehicles: editing excludes self, revalidates changed vehicle, and cancelled history frees the resource', async () => {
        booking = ok(await http('/vehicles/reservations/' + booking.id, 'PUT', { ...values(booking), title: 'Reserva editada QA' }, crew));
        assert.equal((await http('/vehicles/reservations/' + booking.id, 'PUT', { ...values(booking), vehicleId: other.id }, crew)).status, 409);
        const cancelled = ok(await http('/vehicles/reservations/' + booking.id + '/cancel', 'PUT', {}, crew)); assert(cancelled.cancelledAt);
        ok(await http('/vehicles/reservations/' + booking.id + '/cancel', 'PUT', {}, crew));
        assert.equal(await prisma.auditLog.count({ where: { action: 'VEHICLE_RESERVATION_CANCEL', entityId: booking.id } }), 1);
        assert.equal((await http('/vehicles/reservations/' + booking.id, 'PUT', values(booking), crew)).status, 400);
        ok(await http('/vehicles/reservations', 'POST', reserveInput(), crew), 201);
        const history = ok(await http(range())); assert(history.some(item => item.id === booking.id && item.cancelledAt));
    });
    await run('Vehicles: cannot inactivate booked cars; inactive cars and users cannot receive reservations', async () => {
        assert.equal((await http('/vehicles/' + car.id, 'PUT', { name: car.name, plate: car.plate, active: false }, crew)).status, 409);
        const inactive = ok(await http('/vehicles', 'POST', carInput({ name: 'Inativo QA', plate: null, active: false }), crew), 201);
        assert.equal((await http('/vehicles/reservations', 'POST', reserveInput({ vehicleId: inactive.id }), crew)).status, 400);
        const person = await internal('Carros inativo QA', []); await prisma.internalUser.update({ where: { id: person.id }, data: { isActive: false } });
        assert.equal((await http('/vehicles/reservations', 'POST', reserveInput({ responsibleId: person.id, startDate: time(90), endDate: time(91) }), crew)).status, 400);
    });
    await run('Vehicles: reservation is not physical occupancy; checkout, late return and history use actual events', async () => {
        const current = ok(await http('/vehicles/reservations', 'POST', reserveInput({ vehicleId: other.id, startDate: time(-1), endDate: time(1) }), crew), 201);
        let stats = ok(await http('/vehicles/statistics')); assert.equal(stats.activeVehicles, 2); assert.equal(stats.occupiedVehicles, 0); assert.equal(stats.availableVehicles, 2);
        assert.equal((await http('/vehicles/dashboard', 'GET', undefined, crew)).status, 403);
        assert.equal((await http('/vehicles/dashboard', 'GET', undefined, admin)).status, 200);
        assert.equal((await photoRequest('/vehicles/reservations/' + current.id + '/checkout', { driverId: crew.id, clientName: 'Cliente QA', destination: 'Obra QA', purpose: 'INSTALACAO', odometerOut: 15000, fuelOut: 'METADE', hadDamageOut: 'false' }, reader)).status, 403);
        const checkout = ok(await photoRequest('/vehicles/reservations/' + current.id + '/checkout', { driverId: crew.id, clientName: 'Cliente QA', destination: 'Obra QA', purpose: 'INSTALACAO', odometerOut: 15000, fuelOut: 'METADE', hadDamageOut: 'false' }, crew), 201);
        assert(checkout.use?.checkoutPhotoUrl); assert.equal(checkout.use.odometerOut, 15000);
        assert.equal((await fetch(origin + checkout.use.checkoutPhotoUrl)).status, 401);
        const sessionResponse = await fetch(origin + '/vehicles', { headers: { Authorization: 'Bearer ' + crew.token } });
        const cookie = sessionResponse.headers.get('set-cookie')?.split(';')[0]; assert(cookie?.startsWith('zyllen_media='));
        const photo = await fetch(origin + checkout.use.checkoutPhotoUrl, { headers: { Cookie: cookie } });
        assert.equal(photo.status, 200); assert.equal(photo.headers.get('content-type'), 'image/jpeg');
        assert.equal((await photoRequest('/vehicles/reservations/' + current.id + '/checkout', { driverId: crew.id, clientName: 'Cliente QA', destination: 'Obra QA', purpose: 'INSTALACAO', odometerOut: 15000, fuelOut: 'METADE', hadDamageOut: 'false' })).status, 409);
        assert.equal((await http('/vehicles/reservations/' + current.id + '/cancel', 'PUT', {}, crew)).status, 409);
        stats = ok(await http('/vehicles/statistics')); assert.equal(stats.occupiedVehicles, 1); assert.equal(stats.availableVehicles, 1); assert.equal(stats.current[0].id, current.id);
        await prisma.vehicleReservation.update({ where: { id: current.id }, data: { endDate: new Date(Date.now() - 30 * 60000) } });
        stats = ok(await http('/vehicles/statistics')); assert.equal(stats.occupiedVehicles, 1); assert.equal(stats.overdueVehicles, 1);
        assert.equal((await photoRequest('/vehicles/reservations/' + current.id + '/return', { odometerIn: 14999, sameDestination: 'true' })).status, 400);
        const returned = ok(await photoRequest('/vehicles/reservations/' + current.id + '/return', { odometerIn: 15031, sameDestination: 'false' }), 201);
        assert(returned.use.returnPhotoUrl); assert(returned.use.lateMinutes >= 30);
        const month = new Date(returned.use.checkedOutAt).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).slice(0, 7);
        const report = ok(await http('/vehicles/dashboard?month=' + month, 'GET', undefined, admin));
        assert(report.journeys.some(item => item.id === current.id));
        assert(report.totalKm >= 31); assert(report.byVehicle.some(item => item.id === other.id && item.km >= 31));
        assert(report.bySector.some(item => item.trips >= 1));
        assert.equal((await http('/vehicles/dashboard?month=2026-13', 'GET', undefined, admin)).status, 400);
        assert(ok(await http('/vehicles/operations', 'GET', undefined, crew)).recent.some(item => item.id === current.id));
        assert(!ok(await http('/vehicles/operations', 'GET', undefined, reader)).recent.some(item => item.id === current.id));
        assert.equal((await photoRequest('/vehicles/reservations/' + current.id + '/return', { odometerIn: 15032, sameDestination: 'false' })).status, 409);
        stats = ok(await http('/vehicles/statistics')); assert.equal(stats.occupiedVehicles, 0); assert.equal(stats.availableVehicles, 2);
        assert.equal(await prisma.auditLog.count({ where: { action: 'VEHICLE_CHECKOUT' } }), 1);
        assert.equal(await prisma.auditLog.count({ where: { action: 'VEHICLE_RETURN' } }), 1);
        assert(stats.upcoming.every(item => !item.cancelledAt)); assert(stats.upcoming.every((item,index,all) => index === 0 || Date.parse(all[index-1].startDate) <= Date.parse(item.startDate)));
        const overlap = ok(await http('/vehicles/reservations?' + new URLSearchParams({ start: time(-0.75), end: time(-0.6), vehicleId: other.id }))); assert(overlap.some(item => item.id === current.id));
        const history = await prisma.vehicleReservation.create({ data: { title: 'Passado QA', vehicleId: other.id, responsibleId: crew.id, createdById: crew.id, startDate: new Date(time(-5)), endDate: new Date(time(-4)) } });
        assert.equal((await http('/vehicles/reservations/' + history.id + '/cancel', 'PUT', {}, crew)).status, 400);
        assert.equal((await http('/vehicles/reservations/' + history.id, 'PUT', values(current), crew)).status, 400);
    });
    await run('Vehicles: invalid periods, UUIDs, injected fields and oversized queries are rejected without effects', async () => {
        const before = await prisma.vehicleReservation.count();
        for (const fields of [{ endDate: time(24) }, { startDate: 'invalid' }, { vehicleId: 'invalid' }, { responsibleId: 'invalid' }, { cancelledAt: time(25) }]) assert.equal((await http('/vehicles/reservations', 'POST', reserveInput(fields), crew)).status, 400);
        assert.equal((await http(range() + '&limit=101')).status, 400); assert.equal((await http('/vehicles/reservations?start=' + time(0) + '&end=' + time(9000))).status, 400);
        assert.equal((await http(range() + '&responsibleId=invalid')).status, 400);
        assert.equal(await prisma.vehicleReservation.count(), before);
        await assert.rejects(() => prisma.vehicleReservation.create({ data: { title: 'Inválido DB QA', vehicleId: car.id, responsibleId: crew.id, createdById: crew.id, startDate: new Date(time(100)), endDate: new Date(time(99)) } }), /period_check|check constraint/i);
    });
    await run('Vehicles: responsible filter applies before pagination/count, combines with car/period and exposes inactive historical people only for lookup', async () => {
        const person = await internal('Responsável filtro QA', []);
        const create = async (vehicleId, responsibleId, start, end) => prisma.vehicleReservation.create({ data: { title: 'Filtro responsável QA', vehicleId, responsibleId, createdById: crew.id, startDate: new Date(time(start)), endDate: new Date(time(end)) } });
        const first = await create(car.id, person.id, 140, 141), second = await create(car.id, person.id, 142, 143);
        await create(other.id, person.id, 144, 145); await create(car.id, reader.id, 146, 147);
        const url = range() + '&responsibleId=' + person.id + '&vehicleId=' + car.id + '&limit=1';
        const page1 = await http(url + '&page=1', 'GET', undefined, reader), page2 = await http(url + '&page=2', 'GET', undefined, reader);
        assert.equal(page1.status, 200); assert.equal(page1.body.total, 2); assert.equal(page1.body.data[0].id, first.id);
        assert.equal(page2.body.total, 2); assert.equal(page2.body.data[0].id, second.id);
        const allCars = await http(range() + '&responsibleId=' + person.id); assert.equal(allCars.body.total, 3);
        const empty = await http('/vehicles/reservations?' + new URLSearchParams({ start: time(160), end: time(161), responsibleId: person.id })); assert.equal(empty.status, 200); assert.equal(empty.body.total, 0);
        await prisma.internalUser.update({ where: { id: person.id }, data: { isActive: false } });
        const options = ok(await http('/vehicles/options', 'GET', undefined, reader));
        assert(!options.responsibleUsers.some(item => item.id === person.id)); assert(options.reservationResponsibleUsers.some(item => item.id === person.id));
        assert(options.reservationResponsibleUsers.every(item => Object.keys(item).sort().join(',') === 'id,name'));
        assert.equal((await http('/vehicles/reservations', 'POST', reserveInput({ responsibleId: person.id, startDate: time(170), endDate: time(171) }), crew)).status, 400);
    });
    await run('Vehicles: routes require authenticated internal audience and proper action permissions', async () => {
        for (const actor of [null,client,thirdParty]) for (const route of ['/vehicles','/vehicles/options','/vehicles/statistics',range()]) assert.equal((await http(route,'GET',undefined,actor)).status, actor ? 403 : 401);
        for (const route of ['/vehicles','/vehicles/options','/vehicles/statistics','/vehicles/operations',range()]) assert.equal((await http(route,'GET',undefined,unprivileged)).status, 200);
        assert.equal((await http('/vehicles/dashboard', 'GET', undefined, unprivileged)).status, 403);
        assert.equal((await http('/vehicles', 'POST', carInput({ plate: null }), unprivileged)).status, 403);
        ok(await http('/vehicles/reservations', 'POST', reserveInput({ vehicleId: other.id, responsibleId: unprivileged.id, startDate: time(185), endDate: time(186) }), unprivileged), 201);
        const current = ok(await http('/vehicles/reservations', 'POST', reserveInput({ vehicleId: other.id, responsibleId: unprivileged.id, startDate: time(-0.25), endDate: time(0.75) }), unprivileged), 201);
        ok(await photoRequest('/vehicles/reservations/' + current.id + '/checkout', { driverId: unprivileged.id, clientName: 'Skyline', destination: 'Escritorio', purpose: 'OUTRO', odometerOut: 200, fuelOut: 'CHEIO', hadDamageOut: 'false' }, unprivileged), 201);
        ok(await photoRequest('/vehicles/reservations/' + current.id + '/return', { odometerIn: 210, sameDestination: 'true' }, unprivileged), 201);
        assert.equal((await http('/vehicles/reservations', 'POST', reserveInput({ startDate: time(100), endDate: time(101) }), reader)).status, 403);
        assert.equal((await http('/vehicles/reservations/' + booking.id, 'PUT', values(booking), reader)).status, 403);
        assert.equal((await http('/vehicles/reservations/' + booking.id + '/cancel', 'PUT', {}, reader)).status, 403);
    });
    await run('Vehicles: technician can view and reserve cars without project or fleet management access', async () => {
        const technician = await internal('Carros t\u00e9cnico QA', ['vehicles.view', 'vehicles.reserve']);
        ok(await http('/vehicles', 'GET', undefined, technician));
        ok(await http('/vehicles/options', 'GET', undefined, technician));
        ok(await http('/vehicles/statistics', 'GET', undefined, technician));
        ok(await http(range(), 'GET', undefined, technician));
        assert.equal((await http('/project-services', 'GET', undefined, technician)).status, 403);
        assert.equal((await http('/vehicles', 'POST', carInput({ plate: null }), technician)).status, 403);
        const reservation = ok(await http('/vehicles/reservations', 'POST', reserveInput({ vehicleId: other.id, responsibleId: technician.id, startDate: time(180), endDate: time(181) }), technician), 201);
        assert.equal((await http('/vehicles/reservations/' + reservation.id, 'PUT', values(reservation), technician)).status, 403);
        assert.equal((await http('/vehicles/reservations/' + reservation.id + '/cancel', 'PUT', {}, technician)).status, 403);
    });
    await run('Vehicles: failed audit rolls back reservation and cannot leave an invisible occupied car', async () => {
        const before = await prisma.vehicleReservation.count();
        await prisma.$executeRawUnsafe(`CREATE FUNCTION fail_vehicle_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'VEHICLE_RESERVE' THEN RAISE EXCEPTION 'vehicle audit rollback QA'; END IF; RETURN NEW; END $$`);
        await prisma.$executeRawUnsafe('CREATE TRIGGER fail_vehicle_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION fail_vehicle_audit()');
        try { assert.equal((await http('/vehicles/reservations', 'POST', reserveInput({ startDate: time(120), endDate: time(122) }), crew)).status, 500); assert.equal(await prisma.vehicleReservation.count(), before); }
        finally { await prisma.$executeRawUnsafe('DROP TRIGGER fail_vehicle_audit ON "AuditLog"'); await prisma.$executeRawUnsafe('DROP FUNCTION fail_vehicle_audit()'); }
    });
};
if (require.main === module) { const result = spawnSync(process.execPath,[path.join(__dirname,'test-ticket-statistics.cjs'),'--vehicles'],{stdio:'inherit',windowsHide:true}); process.exitCode = result.status ?? 1; }
