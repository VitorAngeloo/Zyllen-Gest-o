/* Real endpoints and transactions; fixtures belong only to the disposable harness. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
module.exports = async ({ run, prisma, origin, admin, tech, unprivileged, client, thirdParty, company, internal }) => {
    const all = ['atendimentos', 'projetos', 'operacoes', 'estoque'];
    const period = { start: new Date(Date.now() - 86400000).toISOString(), end: new Date().toISOString() };
    const reader = await internal('Leitor de painel QA', ['tickets.view', 'inventory.view']);
    const request = async (route, actor = null, method = 'GET', body) => {
        const response = await fetch(origin + route, { method, headers: { ...(actor ? { Authorization: 'Bearer ' + actor.token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
        return { status: response.status, headers: response.headers, body: await response.json() };
    };
    const ok = (r, status = 200) => { assert.equal(r.status, status, JSON.stringify(r.body)); return r.body.data; };
    const generate = async (actor = admin, views = all) => ok(await request('/personal-panel/mirror', actor, 'POST', { views }), 201);
    const root = link => '/panel-mirrors/' + link.path.split('/').pop();
    const stats = (view, link, actor) => request((link ? root(link) : '/personal-panel') + '/statistics?' + new URLSearchParams({ view, ...(view === 'estoque' ? {} : period) }), actor);
    let link;
    await run('Panel: native endpoints require an internal authenticated owner; generation is explicit and strict', async () => {
        for (const actor of [null, client, thirdParty, unprivileged]) {
            assert.equal((await request('/personal-panel/mirror', actor)).status, actor ? 403 : 401);
            assert.equal((await request('/personal-panel/mirror', actor, 'POST', { views: ['estoque'] })).status, actor ? 403 : 401);
        }
        assert.equal(await prisma.panelMirror.count(), 0);
        for (const body of [{ views: [] }, { views: ['estoque', 'estoque'] }, { views: ['invalid'] }, { views: ['estoque'], ownerId: reader.id }]) assert.equal((await request('/personal-panel/mirror', admin, 'POST', body)).status, 400);
        assert.equal((await request('/personal-panel/mirror', reader, 'POST', { views: ['projetos'] })).status, 403);
        assert.equal(await prisma.panelMirror.count(), 0);
    });
    await run('Panel: anonymous token is random, stored as a hash, excluded from status/audit and cached nowhere', async () => {
        link = await generate(); const token = link.path.split('/').pop(); assert.match(token, /^[A-Za-z0-9_-]{43}$/);
        const row = await prisma.panelMirror.findUnique({ where: { ownerId: admin.id } }); assert.equal(row.tokenHash, crypto.createHash('sha256').update(token).digest('hex')); assert.notEqual(row.tokenHash, token);
        const audit = await prisma.auditLog.findMany({ where: { entityId: row.id } }); assert.equal(audit.length, 1); assert(!JSON.stringify(audit).includes(token));
        const status = ok(await request('/personal-panel/mirror', admin)); assert.equal(status.active, true); assert.deepEqual(status.views, all); assert(!JSON.stringify(status).includes(token));
        const response = await request(root(link)); assert.deepEqual(ok(response), { views: all }); assert.match(response.headers.get('cache-control'), /no-store/); assert.equal(response.headers.get('referrer-policy'), 'no-referrer'); assert.match(response.headers.get('x-robots-tag'), /noindex/);
    });
    await run('Panel: empty project/operation data returns successful neutral statistics; mirror and native totals agree', async () => {
        for (const view of all) {
            const native = ok(await stats(view, null, admin)), mirror = ok(await stats(view, link)); assert.equal(mirror.view, view);
            if (view === 'projetos') { assert.equal(mirror.data.current.total, 0); assert.deepEqual(mirror.data.current, native.data.current); }
            if (view === 'operacoes') { assert.equal(mirror.data.current.plannedTrips, 0); assert.deepEqual(mirror.data.current, native.data.current); }
            if (view === 'atendimentos') assert.equal(mirror.data.current.pending, 0);
            if (view === 'estoque') assert.deepEqual(mirror.data.totals, native.data.totals);
        }
    });
    await run('Panel: inventory includes existing unclassified locations and real asset statuses without requiring a main warehouse', async () => {
        const category = await prisma.category.create({ data: { name: 'Estoque existente painel QA' } });
        const sku = await prisma.skuItem.create({ data: { name: 'Produto existente QA', skuCode: '895001', categoryId: category.id } });
        const location = await prisma.location.create({ data: { name: 'Local legado sem classificação QA' } });
        for (const status of ['ATIVO', 'ATIVO', 'EM_MANUTENCAO']) await prisma.asset.create({ data: { assetCode: 'PANEL-' + crypto.randomUUID(), skuId: sku.id, currentLocationId: location.id, status } });
        const data = ok(await stats('estoque', link)).data; assert.equal(data.context, 'ALL'); assert.equal(data.totals.assets, 3); assert.equal(data.scope.assets, 3); assert.equal(data.scope.available, 0); assert.equal(data.totals.unclassified, 3); assert.equal(data.scope.maintenance, 1); assert.equal(data.location, null);
        await prisma.location.update({ where: { id: location.id }, data: { kind: 'INTERNAL' } });
        const classified = ok(await stats('estoque', link)).data; assert.equal(classified.scope.available, 2); assert.equal(classified.totals.assets, 3);
    });
    const ticket = async extra => prisma.ticket.create({ data: { title: 'Pedido identificável QA', description: 'Descrição completa que continua disponível no popup.', source: 'INTERNAL', internalUserId: admin.id, ...extra } });
    const open = await ticket({}), own = await ticket({ status: 'IN_PROGRESS', assignedToInternalUserId: tech.id }), other = await ticket({ status: 'IN_PROGRESS', assignedToInternalUserId: admin.id });
    const closed = await ticket({ status: 'CLOSED', closedAt: new Date() });
    await prisma.ticketAttachment.create({ data: { ticketId: open.id, fileName: 'privado.png', filePath: '/uploads/private/panel-qa.png' } });
    let technicianLink;
    await run('Panel: list/detail preserve subject, description, requester and technician without private fields or attachments', async () => {
        technicianLink = await generate(tech, ['atendimentos']);
        const response = await request(root(technicianLink) + '/tickets?status=IN_PROGRESS'); assert.equal(response.status, 200); assert.equal(response.body.total, 1); assert.equal(response.body.data[0].id, own.id); assert.equal(response.body.data[0].assignedTo.name, tech.name);
        const detail = ok(await request(root(technicianLink) + '/tickets/' + open.id)); assert.equal(detail.title, open.title); assert.equal(detail.description, open.description); assert.equal(detail.internalUser.name, admin.name); assert.deepEqual(detail.attachments, []); assert.deepEqual(detail.messages, []);
        assert(!/passwordHash|pin4Hash|email|phone|filePath|private\/panel/.test(JSON.stringify(detail)));
        assert.equal((await request(root(technicianLink) + '/tickets/' + other.id)).status, 404);
        assert.equal((await request(root(link) + '/tickets/' + closed.id)).status, 404);
        assert.equal((await request(root(technicianLink) + '/tickets/not-a-uuid')).status, 400);
        assert.equal(ok(await stats('atendimentos', technicianLink)).data.current.inProgress, 1);
    });
    await run('Panel: paging is bounded and tokens cannot write or access other authenticated modules', async () => {
        const r = await request(root(link) + '/tickets?status=OPEN&limit=1'); assert.equal(r.status, 200); assert.equal(r.body.total, 1); assert.equal(r.body.limit, 1); assert.equal(r.body.data.length, 1);
        for (const query of ['status=CLOSED', 'status=OPEN&limit=101', 'status=OPEN&assignedToId=' + admin.id]) assert.equal((await request(root(link) + '/tickets?' + query)).status, 400);
        assert.equal((await request(root(link), null, 'POST', { views: all })).status, 404);
        assert.equal((await request('/tickets?token=' + link.path.split('/').pop())).status, 401);
        for (const query of ['view=invalid', 'view=estoque&start=' + period.start, 'view=projetos&start=invalid', 'view=projetos&ownerId=' + admin.id]) assert.equal((await request(root(link) + '/statistics?' + query)).status, 400);
        assert.equal((await stats('estoque', technicianLink)).status, 403);
    });
    await run('Panel: regeneration replaces the old token; revocation is idempotent and audited once', async () => {
        const old = link; link = await generate(); assert.equal((await request(root(old))).status, 404); assert.equal(await prisma.panelMirror.count({ where: { ownerId: admin.id } }), 1);
        for (let i = 0; i < 2; i++) ok(await request('/personal-panel/mirror', admin, 'DELETE'));
        assert.equal((await request(root(link))).status, 404); assert.equal((await stats('estoque', link)).status, 404); assert.equal(ok(await request('/personal-panel/mirror', admin)).active, false);
        assert.equal(await prisma.auditLog.count({ where: { userId: admin.id, action: 'PANEL_MIRROR_REVOKED' } }), 1);
        link = await generate(); assert.equal((await request(root(link))).status, 200);
    });
    await run('Panel: current permissions and account activity constrain a previously generated anonymous link', async () => {
        const readerLink = await generate(reader, ['atendimentos', 'estoque']); assert.deepEqual(ok(await request(root(readerLink))).views, ['atendimentos', 'estoque']);
        const permission = await prisma.screenPermission.findUnique({ where: { screen_action: { screen: 'inventory', action: 'view' } } });
        await prisma.rolePermission.delete({ where: { roleId_screenPermissionId: { roleId: reader.roleId, screenPermissionId: permission.id } } });
        assert.deepEqual(ok(await request(root(readerLink))).views, ['atendimentos']); assert.equal((await stats('estoque', readerLink)).status, 403);
        await prisma.internalUser.update({ where: { id: reader.id }, data: { isActive: false } }); assert.equal((await request(root(readerLink))).status, 404);
        assert.equal((await request('/panel-mirrors/' + 'z'.repeat(43))).status, 404); assert.equal((await request('/panel-mirrors/bad')).status, 404);
    });
    await run('Panel: data reads change no business records; failed audit rolls back token replacement atomically', async () => {
        const before = { tickets: await prisma.ticket.count(), assets: await prisma.asset.count(), services: await prisma.projectService.count(), movements: await prisma.stockMovement.count() };
        for (const view of all) ok(await stats(view, link));
        assert.deepEqual({ tickets: await prisma.ticket.count(), assets: await prisma.asset.count(), services: await prisma.projectService.count(), movements: await prisma.stockMovement.count() }, before);
        await prisma.$executeRawUnsafe(`CREATE FUNCTION fail_panel_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'PANEL_MIRROR_GENERATED' THEN RAISE EXCEPTION 'panel audit rollback QA'; END IF; RETURN NEW; END $$`);
        await prisma.$executeRawUnsafe('CREATE TRIGGER fail_panel_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION fail_panel_audit()');
        try { assert.equal((await request('/personal-panel/mirror', admin, 'POST', { views: all })).status, 500); assert.equal((await request(root(link))).status, 200); }
        finally { await prisma.$executeRawUnsafe('DROP TRIGGER fail_panel_audit ON "AuditLog"'); await prisma.$executeRawUnsafe('DROP FUNCTION fail_panel_audit()'); }
    });
};
if (require.main === module) { const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-statistics.cjs'), '--panels'], { stdio: 'inherit', windowsHide: true }); process.exitCode = result.status ?? 1; }
