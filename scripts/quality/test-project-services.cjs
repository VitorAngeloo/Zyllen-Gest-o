const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

module.exports = async ({ run, prisma, origin, admin, tech, unprivileged, client, thirdParty, contractor, company, internal }) => {
    const organizer = await internal('Organizador QA', ['schedule.view', 'schedule.create', 'schedule.update']);
    const reader = await internal('Consulta QA', ['schedule.view']);
    const start = new Date(Date.now() + 7 * 86_400_000).toISOString(), end = new Date(Date.parse(start) + 3_600_000).toISOString();
    async function http(route, { actor = admin, method = 'GET', body } = {}) {
        const response = await fetch(origin + route, { method, headers: { ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
        return { status: response.status, body: await response.json() };
    }
    function ok(response, expected = 200) { assert.equal(response.status, expected, JSON.stringify(response.body)); return response.body.data; }
    const input = overrides => ({ companyId: company.id, name: 'Projeto instalação QA', type: 'INSTALLATION', address: 'Rua de teste, 10', ...overrides });
    const create = overrides => http('/project-services', { actor: organizer, method: 'POST', body: input(overrides) });
    const state = id => http(`/project-services/${id}`);
    const update = (id, body) => http(`/project-services/${id}`, { actor: organizer, method: 'PUT', body: input(body) });
    const status = (id, value) => http(`/project-services/${id}/status`, { actor: organizer, method: 'PUT', body: { status: value } });
    let pending, contracted, marker;
    await run('Projects: pending service exists without dates, assignees or calendar event; legacy projects are not enrolled', async () => {
        const before = await prisma.schedule.count();
        pending = ok(await create(), 201);
        assert.equal(pending.status, 'PENDING'); assert.equal(pending.schedule, null);
        assert(Math.abs(Date.parse(pending.createdAt) - Date.now()) < 5000);
        assert.equal(await prisma.schedule.count(), before); assert.equal(pending.company.id, company.id);
        assert.equal((await prisma.projectService.findMany()).length, 1);
    });
    await run('Projects: one service per project is enforced by endpoint and database uniqueness', async () => {
        assert.equal((await create({ projectId: pending.projectId })).status, 409);
        await assert.rejects(() => prisma.projectService.create({ data: { projectId: pending.projectId, type: 'REMOVAL' } }), error => error.code === 'P2002');
        assert.equal(await prisma.projectService.count({ where: { projectId: pending.projectId } }), 1);
    });
    await run('Projects: creation accepts only installation and requires an address and coherent dates/responsibles', async () => {
        for (const changes of [{ type: 'MAINTENANCE' }, { type: 'SUPPORT' }, { type: 'REMOVAL' }, { address: ' ' }, { startDate: start }, { startDate: start, endDate: start },
            { startDate: start, endDate: end }, { mapsUrl: 'javascript:alert(1)' }, { urgency: 3 }, { requiresTravel: true }]) assert.equal((await create(changes)).status, 400);
    });
    await run('Projects: invalid assignee/client/marker rolls back project, service, calendar and audit together', async () => {
        const before = await Promise.all([prisma.project.count(), prisma.projectService.count(), prisma.schedule.count(), prisma.auditLog.count()]);
        for (const changes of [{ installerIds: [crypto.randomUUID()] }, { contractorIds: [crypto.randomUUID()] }, { companyId: crypto.randomUUID() }, { markerId: crypto.randomUUID() }]) {
            assert.equal((await create(changes)).status, 400);
            assert.deepEqual(await Promise.all([prisma.project.count(), prisma.projectService.count(), prisma.schedule.count(), prisma.auditLog.count()]), before);
        }
    });
    await run('Projects: markers are reusable regardless of case and appear in the calendar context', async () => {
        marker = ok(await http('/project-services/markers', { method: 'POST', body: { name: 'Sala interativa' } }), 201);
        assert.equal(ok(await http('/project-services/markers', { method: 'POST', body: { name: 'SALA INTERATIVA' } }), 201).id, marker.id);
        contracted = ok(await create({ name: 'Instalação terceirizada QA', markerId: marker.id, contractorIds: [contractor.id], startDate: start, endDate: end, urgency: 2, color: '#FF5500',
            city: 'Goiânia', state: 'GO', travelOriginCity: 'Brasília', travelOriginState: 'DF', travelParticipantIds: [admin.id], requiresTravel: true }), 201);
        assert.equal(contracted.status, 'SCHEDULED'); assert.deepEqual(contracted.internalAssignees, []); assert.equal(contracted.contractors[0].id, contractor.id);
        const calendar = ok(await http(`/schedule/${contracted.schedule.id}`));
        assert.equal(calendar.projectService.marker.name, 'Sala interativa'); assert.equal(calendar.projectService.contractors[0].user.id, contractor.id);
        assert.equal(calendar.projectService.color, '#FF5500'); assert.equal(calendar.projectService.requiresTravel, true);
        assert(contracted.trip?.id);
        const trip = ok(await http(`/trips/${contracted.trip.id}`));
        assert.equal(trip.destinationCity, 'Goiânia'); assert.equal(trip.originState, 'DF');
        assert.equal(trip.internalAssignees[0].id, admin.id);
    });
    await run('Projects: an undated service can be scheduled later using exactly one canonical calendar interval', async () => {
        pending = ok(await update(pending.id, { projectId: pending.projectId, startDate: start, endDate: end, installerIds: [tech.id] }));
        assert.equal(pending.status, 'SCHEDULED'); assert(pending.schedule);
        const agenda = ok(await http(`/schedule/${pending.schedule.id}`));
        assert.equal(new Date(agenda.startDate).toISOString(), pending.schedule.startDate); assert.equal(agenda.installers[0].id, tech.id);
        assert.equal(await prisma.schedule.count({ where: { projectService: { id: pending.id } } }), 1);
    });
    await run('Projects: date/title/type/notes and internal assignee changes from agenda synchronize project management', async () => {
        const moved = new Date(Date.parse(start) + 2 * 86_400_000).toISOString();
        ok(await http(`/schedule/${pending.schedule.id}`, { actor: organizer, method: 'PUT', body: { title: 'Projeto renomeado QA', type: 'REMOVAL', startDate: moved, endDate: new Date(Date.parse(moved) + 3_600_000).toISOString(), installerIds: [organizer.id], notes: 'Orientação completa QA' } }));
        pending = ok(await state(pending.id));
        assert.equal(pending.name, 'Projeto renomeado QA'); assert.equal(pending.type, 'REMOVAL'); assert.equal(pending.notes, 'Orientação completa QA');
        assert.equal(pending.schedule.startDate, moved); assert.equal(pending.internalAssignees[0].id, organizer.id);
        assert.equal((await http(`/schedule/${pending.schedule.id}`, { actor: organizer, method: 'PUT', body: { type: 'SUPPORT' } })).status, 400);
    });
    await run('Projects: project edits synchronize agenda; invalid edits roll back the previous interval and ownership', async () => {
        const before = ok(await state(pending.id));
        assert.equal((await update(pending.id, { projectId: before.projectId, startDate: before.schedule.startDate, endDate: before.schedule.endDate, installerIds: [crypto.randomUUID()] })).status, 400);
        assert.deepEqual(ok(await state(pending.id)), before);
        pending = ok(await update(pending.id, { projectId: before.projectId, name: 'Nome definitivo QA', startDate: before.schedule.startDate, endDate: before.schedule.endDate, installerIds: [tech.id], type: 'INSTALLATION', notes: 'Nota atualizada' }));
        const agenda = ok(await http(`/schedule/${pending.schedule.id}`));
        assert.equal(agenda.title, 'Nome definitivo QA'); assert.equal(agenda.notes, 'Nota atualizada'); assert.equal(agenda.installers[0].id, tech.id);
        assert.equal((await update(pending.id, { projectId: pending.projectId, installerIds: [tech.id] })).status, 400);
    });
    await run('Projects: start/completion/cancellation use actual timestamps instead of planned future dates', async () => {
        const begun = ok(await status(pending.id, 'IN_PROGRESS')); assert(begun.startedAt); assert.equal(begun.completedAt, null);
        assert(Math.abs(Date.parse(begun.startedAt) - Date.now()) < 5000);
        const done = ok(await status(pending.id, 'DONE')); assert(done.completedAt); assert(Date.parse(done.completedAt) < Date.parse(done.schedule.endDate));
        assert(Math.abs(Date.parse(done.completedAt) - Date.now()) < 5000);
        const same = ok(await status(pending.id, 'DONE')); assert.equal(same.completedAt, done.completedAt);
        const reopened = ok(await status(pending.id, 'SCHEDULED')); assert.equal(reopened.completedAt, null);
        assert((await prisma.auditLog.findMany({ where: { entityId: pending.schedule.id } })).some(log => log.details.previousCompletedAt === done.completedAt));
        ok(await http(`/schedule/${contracted.schedule.id}`, { method: 'DELETE' }));
        const cancelled = ok(await state(contracted.id)); assert.equal(cancelled.status, 'CANCELLED'); assert(cancelled.cancelledAt);
        assert(Math.abs(Date.parse(cancelled.cancelledAt) - Date.now()) < 5000);
    });
    await run('Projects: pending cancellation/reopening does not fabricate a schedule or completion', async () => {
        const record = ok(await create({ name: 'Pendente cancelamento QA' }), 201);
        assert.equal((await status(record.id, 'DONE')).status, 400);
        const cancelled = ok(await status(record.id, 'CANCELLED')); assert(cancelled.cancelledAt); assert.equal(cancelled.schedule, null);
        const reopened = ok(await status(record.id, 'PENDING')); assert.equal(reopened.cancelledAt, null); assert.equal(reopened.schedule, null);
    });
    await run('Projects: contractor conflicts require explicit confirmation; rejected creation preserves totals', async () => {
        const before = await prisma.project.count();
        const slot = { name: 'Conflito QA', contractorIds: [contractor.id], startDate: start, endDate: end };
        ok(await create(slot), 201); // Earlier contracted schedule was cancelled.
        assert.equal((await create(slot)).status, 409); assert.equal(await prisma.project.count(), before + 1);
        ok(await create({ ...slot, allowConflicts: true }), 201);
    });
    await run('Projects: adopting a client project preserves its identity and rejects a foreign client link', async () => {
        const legacy = await prisma.project.create({ data: { companyId: company.id, name: 'Legado QA' } });
        const foreign = await prisma.company.create({ data: { name: 'Outra empresa QA' } });
        assert.equal((await create({ projectId: legacy.id, companyId: foreign.id })).status, 400);
        const record = ok(await create({ projectId: legacy.id, name: 'Legado escolhido QA' }), 201); assert.equal(record.projectId, legacy.id);
        assert.equal(record.name, 'Legado QA');
    });
    await run('Projects: an existing accompaniment links once to the same client and project', async () => {
        const followup = await prisma.followup.create({ data: { code: 'QA-' + crypto.randomUUID(), companyId: company.id, createdById: admin.id } });
        const linked = ok(await create({ name: 'Projeto com acompanhamento QA', followupId: followup.id }), 201);
        assert.equal(linked.followup.id, followup.id);
        assert.equal((await prisma.followup.findUnique({ where: { id: followup.id } })).projectId, linked.projectId);
        const before = await prisma.project.count();
        assert.equal((await create({ name: 'Outro projeto QA', followupId: followup.id })).status, 400);
        assert.equal(await prisma.project.count(), before);
    });
    await run('Projects: urgency ordering, status/type filters and pagination count only operational projects', async () => {
        const list = await http('/project-services?limit=1&page=1'); assert.equal(list.status, 200); assert(list.body.total > 1);
        assert.equal(list.body.data.length, 1); assert.equal(list.body.data[0].urgency, 2);
        const filtered = await http('/project-services?status=PENDING&type=INSTALLATION');
        assert(filtered.body.data.length); assert(filtered.body.data.every(record => record.status === 'PENDING' && record.type === 'INSTALLATION'));
    });
    await run('Projects: legacy client project name/address edits are reflected in project and agenda readers', async () => {
        const previous = await prisma.project.findUnique({ where: { id: pending.projectId } });
        await prisma.project.update({ where: { id: pending.projectId }, data: { name: 'Nome pelo cadastro de clientes QA', address: 'Novo endereço QA' } });
        try {
            assert.equal(ok(await state(pending.id)).name, 'Nome pelo cadastro de clientes QA');
            const agenda = ok(await http(`/schedule/${pending.schedule.id}`));
            assert.equal(agenda.title, 'Nome pelo cadastro de clientes QA'); assert.equal(agenda.address, 'Novo endereço QA');
            const list = await http('/schedule?limit=100');
            assert.equal(list.body.data.find(record => record.id === pending.schedule.id).title, agenda.title);
        } finally { await prisma.project.update({ where: { id: pending.projectId }, data: { name: previous.name, address: previous.address } }); }
    });
    await run('Projects: permissions protect read/write and options omit authentication and personal secrets', async () => {
        for (const actor of [null, unprivileged, client, thirdParty]) assert.equal((await http('/project-services', { actor })).status, actor ? 403 : 401);
        assert.equal((await http('/project-services', { actor: reader })).status, 200);
        assert.equal((await http('/project-services', { actor: reader, method: 'POST', body: input({}) })).status, 403);
        assert.equal((await http(`/project-services/${pending.id}`, { actor: reader, method: 'PUT', body: input({}) })).status, 403);
        const options = ok(await http('/project-services/options'));
        assert(!JSON.stringify(options).match(/passwordHash|pin4Hash|cpf|token/));
    });
    await run('Projects: calendar date moves check contractor conflicts and preserve interval until confirmed', async () => {
        const uniqueStart = new Date(Date.parse(start) + 5 * 86_400_000).toISOString();
        const record = ok(await create({ name: 'Data exclusiva QA', contractorIds: [contractor.id], startDate: uniqueStart, endDate: new Date(Date.parse(uniqueStart) + 3_600_000).toISOString() }), 201);
        const body = { startDate: start, endDate: end };
        assert.equal((await http(`/schedule/${record.schedule.id}`, { actor: organizer, method: 'PUT', body })).status, 409);
        assert.equal(ok(await state(record.id)).schedule.startDate, uniqueStart);
        ok(await http(`/schedule/${record.schedule.id}`, { actor: organizer, method: 'PUT', body: { ...body, allowConflicts: true } }));
        assert.equal(ok(await state(record.id)).schedule.startDate, start);
        await prisma.contractorUser.update({ where: { id: contractor.id }, data: { isActive: false } });
        try { assert(ok(await status(record.id, 'DONE')).completedAt); }
        finally { await prisma.contractorUser.update({ where: { id: contractor.id }, data: { isActive: true } }); }
    });
    await run('Agenda regression: free schedules and recurrences remain available; failures roll back the whole series', async () => {
        const before = await prisma.schedule.count();
        const body = { title: 'Agenda avulsa QA', type: 'SUPPORT', startDate: start, endDate: end, installerIds: [tech.id], recurrence: { type: 'DAILY', interval: 1, count: 3 } };
        const created = ok(await http('/schedule', { actor: organizer, method: 'POST', body }), 201);
        assert.equal(await prisma.schedule.count(), before + 3); assert.equal(created.projectService, null);
        const invalid = await http('/schedule', { actor: organizer, method: 'POST', body: { ...body, installerIds: [tech.id, crypto.randomUUID()] } });
        assert.equal(invalid.status, 500); assert.equal(await prisma.schedule.count(), before + 3);
        assert.equal((await http('/schedule', { actor: organizer, method: 'POST', body: { ...body, projectId: pending.projectId } })).status, 400);
        ok(await http(`/schedule/${created.id}?cancelSeries=true`, { method: 'DELETE' }));
        assert.equal(await prisma.schedule.count({ where: { OR: [{ id: created.id }, { parentScheduleId: created.id }], status: 'CANCELLED' } }), 3);
    });
    const specifications = { category: 'sala', equipment: ['Projetor QA modelo 1', 'Projetor QA modelo 1'], room: {
        roomType: 'interativa', format: 'Semicircular', projections: '3', proportion: '16:9', resolution: '3840 × 2160', control: 'Tablet QA', sound: '5.1',
    } };
    let technical;
    await run('Specifications: create/detail/list persist explicit technical data without inferring status or execution', async () => {
        technical = ok(await create({ name: 'Projeto técnico QA', specifications }), 201);
        assert.deepEqual(technical.specifications, specifications); assert.equal(technical.status, 'PENDING'); assert.equal(technical.completedAt, null);
        assert.deepEqual(ok(await state(technical.id)).specifications, specifications);
        const list = await http('/project-services?limit=100'); assert.deepEqual(list.body.data.find(row => row.id === technical.id).specifications, specifications);
        assert.equal(ok(await http('/project-services/options')).capabilities.projectSpecifications, true);
    });
    await run('Specifications: old clients and agenda edits preserve technical data; null explicitly clears it', async () => {
        technical = ok(await update(technical.id, { name: technical.name })); assert.deepEqual(technical.specifications, specifications);
        technical = ok(await update(technical.id, { name: technical.name, startDate: start, endDate: end, installerIds: [tech.id], allowConflicts: true }));
        ok(await http(`/schedule/${technical.schedule.id}`, { actor: organizer, method: 'PUT', body: { notes: 'Mudança pelo calendário QA' } }));
        assert.deepEqual(ok(await state(technical.id)).specifications, specifications);
        const body = { name: technical.name, startDate: start, endDate: end, installerIds: [tech.id], allowConflicts: true, specifications: null };
        technical = ok(await update(technical.id, body)); assert.equal(technical.specifications, null);
        assert.equal((await prisma.projectService.findUnique({ where: { id: technical.id } })).specifications, null);
    });
    await run('Specifications: schema rejects unknown keys, invalid category, excessive size and incomplete equipment before writing', async () => {
        const before = await Promise.all([prisma.project.count(), prisma.projectService.count(), prisma.auditLog.count()]);
        for (const invalid of [{ ...specifications, category: 'invented' }, { ...specifications, unexpected: true }, { ...specifications, equipment: [''] },
            { ...specifications, equipment: Array(101).fill('Projetor QA') }, { ...specifications, room: { ...specifications.room, resolution: 'x'.repeat(301) } },
            { ...specifications, room: { ...specifications.room, calculated: true } }]) assert.equal((await create({ specifications: invalid })).status, 400);
        assert.deepEqual(await Promise.all([prisma.project.count(), prisma.projectService.count(), prisma.auditLog.count()]), before);
    });
    await run('Specifications: technical updates roll back with other invalid project data and preserve the audit trail', async () => {
        const before = ok(await state(technical.id)), audits = await prisma.auditLog.count();
        const changes = { name: technical.name, startDate: start, endDate: end, installerIds: [crypto.randomUUID()], specifications, allowConflicts: true };
        assert.equal((await update(technical.id, changes)).status, 400);
        assert.deepEqual(ok(await state(technical.id)), before); assert.equal(await prisma.auditLog.count(), audits);
        technical = ok(await update(technical.id, { ...changes, installerIds: [tech.id] }));
        const audit = await prisma.auditLog.findFirst({ where: { entityId: technical.id, action: 'PROJECT_SERVICE_UPDATE' }, orderBy: { createdAt: 'desc' } });
        assert.deepEqual(audit.details.specifications, specifications); assert.equal(audit.details.previousSpecifications, null); assert.equal(audit.userId, organizer.id);
        assert.equal((await http(`/project-services/${technical.id}`, { actor: reader, method: 'PUT', body: input(changes) })).status, 403);
        assert.deepEqual(ok(await http(`/project-services/${technical.id}`, { actor: reader })).specifications, specifications);
        for (const actor of [client, thirdParty]) assert.equal((await http(`/project-services/${technical.id}`, { actor })).status, 403);
    });
    await run('Specifications: unknown category and blank room type remain unknown; changing category preserves entered room fields', async () => {
        const unknown = ok(await create({ specifications: { category: null, equipment: [], room: {} } }), 201);
        assert.equal(unknown.specifications.category, null); assert.equal(unknown.specifications.room.roomType, '');
        const changed = ok(await update(unknown.id, { specifications: { ...specifications, category: 'tela' } }));
        assert.equal(changed.specifications.category, 'tela'); assert.deepEqual(changed.specifications.room, specifications.room);
    });
    let planned;
    await run('Planning: all eight stages persist without creating schedules, timestamps or automatic operational transitions', async () => {
        const before = await prisma.schedule.count();
        for (const stage of ['contrato', 'kickoff', 'semprev', 'predef', 'agendado', 'pausado', 'concluido', 'cancelado']) {
            const planning = { stage, forecast: '2027-01' };
            planned = ok(await create({ name: 'Planejamento QA ' + stage, planning }), 201);
            assert.deepEqual(planned.planning, planning); assert.equal(planned.status, 'PENDING'); assert.equal(planned.schedule, null);
            assert.equal(planned.startedAt, null); assert.equal(planned.completedAt, null); assert.equal(planned.cancelledAt, null);
            assert.deepEqual(ok(await state(planned.id)).planning, planning);
        }
        assert.equal(await prisma.schedule.count(), before);
        assert.equal(ok(await http('/project-services/options')).capabilities.projectPlanning, true);
        const list = await http('/project-services?limit=100'); assert.deepEqual(list.body.data.find(row => row.id === planned.id).planning, planned.planning);
    });
    await run('Planning: month/day precision survives roundtrip and old-client edits; clearing is explicit', async () => {
        const planning = { stage: 'predef', forecast: '2028-02-29' };
        planned = ok(await update(planned.id, { name: planned.name, planning, specifications }));
        assert.deepEqual(planned.planning, planning);
        planned = ok(await update(planned.id, { name: planned.name })); assert.deepEqual(planned.planning, planning); assert.deepEqual(planned.specifications, specifications);
        planned = ok(await update(planned.id, { name: planned.name, planning: null })); assert.equal(planned.planning, null); assert.deepEqual(planned.specifications, specifications);
        const legacy = ok(await create({ name: 'Planejamento ausente QA' }), 201); assert.equal(legacy.planning, null);
    });
    await run('Planning: invalid dates, mixed precision, operational statuses and unexpected fields are rejected before writing', async () => {
        const before = await Promise.all([prisma.project.count(), prisma.projectService.count(), prisma.schedule.count(), prisma.auditLog.count()]);
        for (const planning of [{ stage: 'DONE', forecast: null }, { stage: 'predef', forecast: '2027-02-29' }, { stage: 'predef', forecast: '2100-02-29' },
            { stage: 'predef', forecast: '2026-13' }, { stage: 'predef', forecast: '2026-04-31' }, { stage: 'predef', forecast: '2026-01-05T00:00:00Z' },
            { stage: 'predef', forecast: '' }, { stage: null, forecast: '2027-01', completedAt: new Date().toISOString() }]) {
            assert.equal((await create({ planning })).status, 400);
        }
        assert.deepEqual(await Promise.all([prisma.project.count(), prisma.projectService.count(), prisma.schedule.count(), prisma.auditLog.count()]), before);
    });
    await run('Planning: scheduling, agenda rescheduling and real completion preserve independent stage and forecast', async () => {
        const planning = { stage: 'contrato', forecast: '2027-01' };
        const slot = new Date(Date.parse(start) + 25 * 86_400_000).toISOString();
        planned = ok(await update(planned.id, { name: planned.name, planning, startDate: slot, endDate: new Date(Date.parse(slot) + 3_600_000).toISOString(), installerIds: [tech.id] }));
        assert.equal(planned.status, 'SCHEDULED'); assert.deepEqual(planned.planning, planning); assert.equal(planned.completedAt, null);
        const shifted = new Date(Date.parse(slot) + 86_400_000).toISOString();
        ok(await http(`/schedule/${planned.schedule.id}`, { actor: organizer, method: 'PUT', body: { startDate: shifted, endDate: new Date(Date.parse(shifted) + 3_600_000).toISOString() } }));
        planned = ok(await state(planned.id)); assert.deepEqual(planned.planning, planning); assert.equal(planned.schedule.startDate, shifted);
        planned = ok(await status(planned.id, 'DONE')); assert(planned.completedAt); assert.deepEqual(planned.planning, planning);
        const completedAt = planned.completedAt;
        planned = ok(await update(planned.id, { name: planned.name, planning: { stage: 'pausado', forecast: '2028-02' }, startDate: planned.schedule.startDate, endDate: planned.schedule.endDate, installerIds: [tech.id] }));
        assert.equal(planned.status, 'DONE'); assert.equal(planned.completedAt, completedAt);
    });
    await run('Planning: failed changes roll back atomically; successful changes record actor and before/after', async () => {
        const before = ok(await state(planned.id)), audits = await prisma.auditLog.count();
        const planning = { stage: 'kickoff', forecast: '2028-02-29' };
        const body = { name: before.name, planning, startDate: before.schedule.startDate, endDate: before.schedule.endDate, installerIds: [crypto.randomUUID()] };
        assert.equal((await update(planned.id, body)).status, 400); assert.deepEqual(ok(await state(planned.id)), before); assert.equal(await prisma.auditLog.count(), audits);
        planned = ok(await update(planned.id, { ...body, installerIds: [tech.id] }));
        const audit = await prisma.auditLog.findFirst({ where: { entityId: planned.id, action: 'PROJECT_SERVICE_UPDATE' }, orderBy: { createdAt: 'desc' } });
        assert.deepEqual(audit.details.previousPlanning, before.planning); assert.deepEqual(audit.details.planning, planning); assert.equal(audit.userId, organizer.id);
        assert.equal((await http(`/project-services/${planned.id}`, { actor: reader, method: 'PUT', body: input(body) })).status, 403);
        assert.deepEqual(ok(await http(`/project-services/${planned.id}`, { actor: reader })).planning, planning);
        for (const actor of [client, thirdParty]) assert.equal((await http(`/project-services/${planned.id}`, { actor })).status, 403);
    });
    await require('./test-project-collaboration.cjs')({ run, prisma, http, ok, create, organizer, reader, admin, client, thirdParty });
    await require('./test-project-actions.cjs')({ run, prisma, http, ok, create, organizer, reader, tech, client, thirdParty, start, end });
    await require('./test-project-planning-access.cjs')({ run, prisma, http, ok, create, internal, organizer, reader, client, thirdParty, unprivileged });
    await require('./test-project-legacy.cjs')({ run, prisma, http, ok, reader, organizer, client, thirdParty, unprivileged });
};
if (require.main === module) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-statistics.cjs'), '--projects'], { stdio: 'inherit', windowsHide: true });
    process.exitCode = result.status ?? 1;
}
