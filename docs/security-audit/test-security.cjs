/* Regression tests against an in-memory PostgreSQL (PGlite), never the shared Supabase.
 * Run prepare-security-tests.cjs first. Isolated deps: see implementation README.
 * No production seed, migrations, files, ports or credentials are used.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Module = require('node:module');
const root = path.resolve(__dirname, '../..');
const scratch = path.join(root, 'tmp/security-tests');
const apiRequire = Module.createRequire(path.join(root, 'apps/api/package.json'));
const deps = Module.createRequire(path.join(root, 'tmp/security-test-deps/package.json'));
const { PGlite } = deps('@electric-sql/pglite');
const { PGLiteSocketServer } = deps('@electric-sql/pglite-socket');
const cases = [];
let app, prisma, db, socket;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4FoAAAAASUVORK5CYII=', 'base64');
const signature = `data:image/png;base64,${png.toString('base64')}`;
const run = async (name, work) => {
    try { await work(); cases.push({ name, passed: true }); console.log(`PASS ${name}`); }
    catch (error) { cases.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
};

async function main() {
    fs.mkdirSync(scratch, { recursive: true });
    db = await PGlite.create();
    await db.exec(fs.readFileSync(path.join(scratch, 'before-security.sql'), 'utf8'));
    const preservedId = crypto.randomUUID();
    await db.query('INSERT INTO "Company" (id, name, "updatedAt") VALUES ($1, $2, NOW())', [preservedId, 'Pre-existing test company']);
    await db.exec(fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20260915180000_security_client_approval_media_shares/migration.sql'), 'utf8'));
    await run('Migration: additive upgrade preserves existing rows and denies untrusted SQL role', async () => {
        assert.equal((await db.query('SELECT name FROM "Company" WHERE id = $1', [preservedId])).rows[0].name, 'Pre-existing test company');
        const protectedTables = await db.query("SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('ClientRegistrationRequest', 'MediaShareLink')");
        assert.equal(protectedTables.rows.length, 2); assert(protectedTables.rows.every(r => r.relrowsecurity));
        await db.exec('CREATE ROLE security_untrusted NOLOGIN; GRANT USAGE ON SCHEMA public TO security_untrusted; GRANT SELECT, INSERT ON "MediaShareLink" TO security_untrusted; SET ROLE security_untrusted');
        try { await assert.rejects(() => db.query('INSERT INTO "MediaShareLink" (id, "tokenHash", kind, "attachmentId", "createdById", "expiresAt") VALUES ($1,$2,$3,$4,$5,NOW())', ['x', 'x', 'maintenance', 'x', 'x']), /row-level security/); }
        finally { await db.exec('RESET ROLE'); }
    });
    socket = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1' });
    await socket.start();
    const address = socket.getServerConn();
    assert.match(address, /^127\.0\.0\.1:\d+$/);
    process.env.DATABASE_URL = `postgresql://postgres:local-test@${address}/postgres?sslmode=disable&connection_limit=1&pool_timeout=20`;
    process.env.DIRECT_URL = process.env.DATABASE_URL;
    process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex');
    process.env.CPF_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    process.env.SUPABASE_URL = '';
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    process.env.SUPABASE_OS_MEDIA_BUCKET_PUBLIC = 'false';
    process.env.NODE_ENV = 'test';
    process.env.API_PORT = '0';
    process.env.MEDIA_UPLOAD_ROOT = fs.mkdtempSync(path.join(scratch, 'uploads-'));
    const realResolve = Module._resolveFilename;
    const expressPath = Module.createRequire(apiRequire.resolve('@nestjs/platform-express/package.json')).resolve('express');
    Module._resolveFilename = function (request, parent, ...args) {
        if (request === '@prisma/client') return path.join(scratch, 'client/index.js');
        if (request === '@zyllen/shared') return path.join(root, 'packages/shared/src/index.ts');
        if (request === 'express') return expressPath;
        return realResolve.call(this, request, parent, ...args);
    };
    apiRequire('ts-node').register({ transpileOnly: true, project: path.join(root, 'apps/api/tsconfig.json') });
    apiRequire('reflect-metadata');
    const source = (name) => require(path.join(root, 'apps/api/src', name));
    const { PrismaService } = source('prisma/prisma.service.ts');
    prisma = new PrismaService();
    await prisma.$connect();
    const { Test } = apiRequire('@nestjs/testing');
    const { AppModule } = source('app.module.ts');
    const { MediaService } = source('modules/media/media.service.ts');
    const { ResponseInterceptor } = source('interceptors/response.interceptor.ts');
    const { GlobalExceptionFilter } = source('filters/global-exception.filter.ts');
    const { ValidationPipe } = apiRequire('@nestjs/common');
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(prisma).compile();
    app = module.createNestApplication({ logger: false });
    app.use(apiRequire('cookie-parser')());
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(MediaService)));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    if (process.argv.includes('--browser')) app.enableCors({ origin: 'http://127.0.0.1:3998', credentials: true });
    await app.listen(process.argv.includes('--browser') ? 3999 : 0, '127.0.0.1');
    const origin = await app.getUrl();
    assert.equal(new URL(origin).hostname, '127.0.0.1');
    const nativeFetch = global.fetch;
    global.fetch = (url, options) => {
        assert.equal(new URL(String(url)).hostname, '127.0.0.1', 'Tests must not contact external services');
        return nativeFetch(url, options);
    };
    const { JwtService } = apiRequire('@nestjs/jwt');
    const jwt = app.get(JwtService);
    const { AccessService } = source('modules/access/access.service.ts');
    const access = app.get(AccessService);
    const bcrypt = apiRequire('bcrypt');
    const password = crypto.randomBytes(20).toString('hex');
    const hash = await bcrypt.hash(password, 4);
    const pin = '7841'; // synthetic local-only fixture, never a seed/default
    const people = {};
    for (const [name, permissions] of Object.entries({
        Administrador: [], Gestor: ['maintenance.view', 'maintenance.execute', 'maintenance.close', 'tickets.view', 'tickets.assign', 'tickets.triage', 'followups.view', 'followups.edit', 'settings.view', 'catalog.view', 'inventory.view'],
        Técnico: ['maintenance.view', 'maintenance.execute', 'tickets.view', 'tickets.assign', 'tickets.triage', 'followups.view'],
        Internos: [],
    })) {
        const role = await prisma.role.create({ data: { name } });
        for (const value of permissions) {
            const [screen, action] = value.split('.');
            let permission = await prisma.screenPermission.findFirst({ where: { screen, action } });
            permission ??= await prisma.screenPermission.create({ data: { screen, action } });
            await prisma.rolePermission.create({ data: { roleId: role.id, screenPermissionId: permission.id } });
        }
        const user = await prisma.internalUser.create({ data: { name, email: `${crypto.randomUUID()}@example.test`, passwordHash: hash, pin4Hash: await bcrypt.hash(pin, 4), roleId: role.id } });
        people[name] = { ...user, type: 'internal', role, token: jwt.sign({ sub: user.id, type: 'internal' }) };
    }
    const [admin, manager, tech, internal] = ['Administrador', 'Gestor', 'Técnico', 'Internos'].map(n => people[n]);
    const company = await prisma.company.create({ data: { name: 'Empresa de teste A' } });
    const foreign = await prisma.company.create({ data: { name: 'Empresa de teste B' } });
    const project = await prisma.project.create({ data: { companyId: company.id, name: 'Projeto A' } });
    const foreignProject = await prisma.project.create({ data: { companyId: foreign.id, name: 'Projeto B' } });
    async function external(companyId) {
        const user = await prisma.externalUser.create({ data: { companyId, name: 'Cliente teste', email: `${crypto.randomUUID()}@example.test`, passwordHash: hash } });
        return { ...user, type: 'external', token: jwt.sign({ sub: user.id, type: 'external' }) };
    }
    const client = await external(company.id), otherClient = await external(foreign.id), peerClient = await external(company.id);
    async function contractor() {
        const user = await prisma.contractorUser.create({ data: { name: 'Prestador teste', email: `${crypto.randomUUID()}@example.test`, passwordHash: hash } });
        return { ...user, type: 'contractor', token: jwt.sign({ sub: user.id, type: 'contractor' }) };
    }
    const owner = await contractor(), otherOwner = await contractor();
    const os = await prisma.maintenanceOS.create({ data: { companyId: company.id, openedByContractorId: owner.id, formType: 'INSTALACAO_SALA', formData: { details: 'Original' }, status: 'IN_PROGRESS' } });
    const block = await prisma.maintenanceOSFollowupBlock.create({ data: { maintenanceOSId: os.id, type: 'SIGNATURE', content: signature } });
    const follower = await prisma.followup.create({ data: { code: crypto.randomUUID(), companyId: company.id, createdById: admin.id } });
    const followBlock = await prisma.followupBlock.create({ data: { followupId: follower.id, type: 'MEDIA', order: 0 } });
    const ticket = await prisma.ticket.create({ data: { title: 'Teste', description: 'Teste isolado', companyId: company.id, externalUserId: client.id, assignedToInternalUserId: manager.id } });
    const internalTicket = await prisma.ticket.create({ data: { title: 'TI', description: 'Teste isolado interno', source: 'INTERNAL', internalUserId: internal.id } });
    for (const dir of ['maintenance', 'followups', 'tickets', 'media/catalog']) fs.mkdirSync(path.join(process.env.MEDIA_UPLOAD_ROOT, dir), { recursive: true });
    for (const dir of ['maintenance', 'followups', 'tickets', 'media/catalog']) fs.writeFileSync(path.join(process.env.MEDIA_UPLOAD_ROOT, dir, 'test.png'), png);
    const resources = [
        ['maintenance', await prisma.maintenanceAttachment.create({ data: { maintenanceOSId: os.id, fileName: 'foto.png', filePath: 'test.png', mimeType: 'image/png' } })],
        ['os-followup', await prisma.maintenanceOSFollowupAttachment.create({ data: { blockId: block.id, fileName: 'foto.png', filePath: 'test.png', mimeType: 'image/png' } })],
        ['followup', await prisma.followupBlockAttachment.create({ data: { blockId: followBlock.id, fileName: 'foto.png', filePath: 'test.png', mimeType: 'image/png' } })],
        ['ticket', await prisma.ticketAttachment.create({ data: { ticketId: ticket.id, fileName: 'foto.png', filePath: '/uploads/tickets/test.png' } })],
        ['item', await prisma.itemMediaAttachment.create({ data: { uploadedById: admin.id, fileName: 'foto.png', filePath: '/uploads/media/catalog/test.png', mimeType: 'image/png', mediaType: 'IMAGE' } })],
    ];
    const visibleMediaBlock = await prisma.maintenanceOSFollowupBlock.create({ data: { maintenanceOSId: os.id, type: 'MEDIA', order: 1 } });
    await prisma.maintenanceOSFollowupAttachment.create({ data: { blockId: visibleMediaBlock.id, fileName: 'foto-visivel.png', filePath: 'test.png', mimeType: 'image/png' } });
    const internalAtt = await prisma.ticketAttachment.create({ data: { ticketId: internalTicket.id, fileName: 'TI.png', filePath: '/uploads/tickets/test.png' } });
    const http = async (route, { actor, cookie, method = 'GET', body, form } = {}) => {
        const headers = { ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) };
        const response = await fetch(origin + route, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined), redirect: 'manual' });
        const bytes = Buffer.from(await response.arrayBuffer());
        let data; try { data = JSON.parse(bytes.toString('utf8')); } catch { data = undefined; }
        return { status: response.status, headers: response.headers, data, bytes };
    };
    const status = (response, expected) => assert.equal(response.status, expected, JSON.stringify(response.data));
    const sessions = new Map();
    for (const actor of [admin, manager, tech, internal, client, otherClient, peerClient, owner, otherOwner]) {
        const response = await http('/auth/me', { actor });
        status(response, 200);
        const cookie = response.headers.getSetCookie().find(v => v.startsWith('zyllen_media='));
        assert(cookie?.includes('HttpOnly'));
        sessions.set(actor.id, cookie.split(';')[0]);
    }
    const cookie = actor => sessions.get(actor.id);

    await run('A01/A02: public registration creates only a pending request; no account/company/OS claim', async () => {
        const email = `${crypto.randomUUID()}@example.test`;
        const count = await prisma.company.count();
        const response = await http('/register/client', { method: 'POST', body: { name: os.clientName || 'Empresa de teste A', email, password, companyId: company.id, projectId: project.id } });
        status(response, 201); assert.equal(response.data.status, 'PENDING');
        assert.equal(await prisma.externalUser.findUnique({ where: { email } }), null);
        assert.equal(await prisma.company.count(), count);
        status(await http('/clients/login', { method: 'POST', body: { email, password } }), 401);
        const request = await prisma.clientRegistrationRequest.findUnique({ where: { email } });
        assert(request && request.status === 'PENDING');
        for (const actor of [undefined, tech, internal, client, owner]) status(await http(`/register/client-requests/${request.id}/approve`, { actor, method: 'POST', body: { companyId: company.id } }), actor ? 403 : 401);
        status(await http(`/register/client-requests/${request.id}/approve`, { actor: manager, method: 'POST', body: { companyId: company.id, projectId: foreignProject.id } }), 400);
        assert.equal((await prisma.clientRegistrationRequest.findUnique({ where: { id: request.id } })).status, 'PENDING');
        status(await http(`/register/client-requests/${request.id}/approve`, { actor: manager, method: 'POST', body: { companyId: company.id, projectId: project.id } }), 201);
        const user = await prisma.externalUser.findUnique({ where: { email } });
        assert.equal(user.companyId, company.id); assert.equal(user.projectId, project.id);
        status(await http(`/register/client-requests/${request.id}/approve`, { actor: admin, method: 'POST', body: { companyId: foreign.id } }), 409);
        const completed = await prisma.clientRegistrationRequest.findUnique({ where: { id: request.id } });
        assert.equal(completed.passwordHash, ''); assert.equal(completed.cpf, null);
        status(await http('/clients/login', { method: 'POST', body: { email, password } }), 200);
    });
    await run('A01: wrong-company project rejected at registration; rejection creates no login', async () => {
        status(await http('/register/client', { method: 'POST', body: { name: 'Cliente', email: `${crypto.randomUUID()}@example.test`, password, companyId: company.id, projectId: foreignProject.id } }), 400);
        const email = `${crypto.randomUUID()}@example.test`;
        status(await http('/register/client', { method: 'POST', body: { name: 'Cliente', email, password, companyName: 'Nova empresa pendente' } }), 201);
        assert.equal(await prisma.company.findFirst({ where: { name: 'Nova empresa pendente' } }), null);
        const request = await prisma.clientRegistrationRequest.findUnique({ where: { email } });
        status(await http(`/register/client-requests/${request.id}/reject`, { actor: admin, method: 'POST', body: { reason: 'Identidade não confirmada' } }), 201);
        assert.equal(await prisma.externalUser.findUnique({ where: { email } }), null);
        assert.equal((await prisma.clientRegistrationRequest.findUnique({ where: { email } })).passwordHash, '');
        const listed = await http('/register/client-requests?status=REJECTED', { actor: manager });
        status(listed, 200); assert(!JSON.stringify(listed.data).includes('passwordHash'));
    });
    await run('A01: direct client creation is also manager-only', async () => {
        const body = { name: 'Cliente direto', email: `${crypto.randomUUID()}@example.test`, password, confirmPassword: password, companyId: company.id };
        status(await http('/clients/users', { actor: tech, method: 'POST', body }), 403);
        status(await http('/clients/users', { actor: manager, method: 'POST', body }), 201);
    });
    await run('A12: client list omits password hashes and CPF ciphertext', async () => {
        const response = await http('/clients/users', { actor: admin }); status(response, 200);
        assert(response.data.data.length > 0); assert(!JSON.stringify(response.data).includes('passwordHash')); assert(!JSON.stringify(response.data).includes('"cpf"'));
    });
    for (const [kind, resource] of resources) {
        await run(`A03: ${kind} read requires session; rejects foreign tenants/owners`, async () => {
            const route = `/media/${kind}/${resource.id}/file`;
            status(await http(route), 401);
            const response = await http(route, { cookie: cookie(admin) }); status(response, 200);
            assert.equal(response.headers.get('content-type'), 'image/png'); assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
            assert.match(response.headers.get('cache-control'), /no-store/); assert.deepEqual(response.bytes, png);
            status(await http(route, { cookie: cookie(otherClient) }), 403);
            status(await http(route, { cookie: cookie(otherOwner) }), 403);
            status(await http(route, { cookie: cookie(client) }), kind === 'item' ? 403 : 200);
            status(await http(route, { cookie: cookie(owner) }), ['maintenance', 'os-followup'].includes(kind) ? 200 : 403);
            status(await http(route, { cookie: cookie(peerClient) }), kind === 'ticket' || kind === 'item' ? 403 : 200);
        });
    }
    await run('A03: internal personal TI attachment works without tickets.view; unrelated internal denied', async () => {
        status(await http(`/media/ticket/${internalAtt.id}/file`, { cookie: cookie(internal) }), 200);
        status(await http(`/media/ticket/${resources[3][1].id}/file`, { cookie: cookie(internal) }), 403);
        status(await http(`/media/maintenance/${resources[0][1].id}/file`, { cookie: cookie(internal) }), 403);
    });
    await run('A03: seven old public handlers and raw uploads are unavailable', async () => {
        for (const route of [
            ...['maintenance', 'client/maintenance', 'contractor/maintenance'].flatMap(base => [`/${base}/${os.id}/attachments/${resources[0][1].id}/file`, `/${base}/${os.id}/followup-blocks/${block.id}/attachments/${resources[1][1].id}/file`]),
            `/followups/${follower.id}/blocks/${followBlock.id}/attachments/${resources[2][1].id}/file`, '/uploads/tickets/test.png',
        ]) status(await http(route), 404);
        status(await http(`/auth/me?token=${admin.token}`), 401);
    });
    await run('A03: 24h share is manager-only, hashed, single-file, audited and revocable', async () => {
        const route = `/media/maintenance/${resources[0][1].id}/shares`;
        for (const actor of [tech, internal, client, owner]) status(await http(route, { actor, method: 'POST', body: {} }), 403);
        const response = await http(route, { actor: manager, method: 'POST', body: {} }); status(response, 201);
        const link = response.data.data;
        assert(Math.abs(new Date(link.expiresAt).getTime() - Date.now() - 86400000) < 3000);
        const record = await prisma.mediaShareLink.findUnique({ where: { id: link.id } });
        assert(!JSON.stringify(record).includes(link.url.split('/').pop())); assert.equal(record.tokenHash.length, 64);
        assert(await prisma.auditLog.findFirst({ where: { entityId: link.id, action: 'MEDIA_SHARED' } }));
        status(await http(link.url), 200);
        status(await http(link.url.slice(0, -1) + (link.url.endsWith('a') ? 'b' : 'a')), 404);
        status(await http(`/media/shares/${link.id}`, { actor: tech, method: 'DELETE' }), 403);
        status(await http(`/media/shares/${link.id}`, { actor: admin, method: 'DELETE' }), 200);
        status(await http(link.url), 404);
    });
    await run('A03: expiration, disabled issuer and deleted attachment invalidate share', async () => {
        const route = `/media/maintenance/${resources[0][1].id}/shares`;
        const issued = await http(route, { actor: manager, method: 'POST', body: {} }); status(issued, 201);
        const link = issued.data.data;
        await prisma.mediaShareLink.update({ where: { id: link.id }, data: { expiresAt: new Date(0) } });
        status(await http(link.url), 404);
        await prisma.mediaShareLink.update({ where: { id: link.id }, data: { expiresAt: new Date(Date.now() + 60000) } });
        await prisma.internalUser.update({ where: { id: manager.id }, data: { isActive: false } });
        status(await http(link.url), 401);
        await prisma.internalUser.update({ where: { id: manager.id }, data: { isActive: true } });
        status(await http(link.url), 200);
        await prisma.mediaShareLink.update({ where: { id: link.id }, data: { attachmentId: crypto.randomUUID() } });
        status(await http(link.url), 404);
    });
    await run('A03: disabled users cannot reuse media cookie; logout clears it', async () => {
        await prisma.externalUser.update({ where: { id: client.id }, data: { isActive: false } });
        status(await http(`/media/maintenance/${resources[0][1].id}/file`, { cookie: cookie(client) }), 401);
        await prisma.externalUser.update({ where: { id: client.id }, data: { isActive: true } });
        const response = await http('/auth/logout', { actor: client, method: 'POST' });
        assert(response.headers.getSetCookie().some(v => v.startsWith('zyllen_media=;')));
        const list = await http(`/maintenance/${os.id}/attachments`, { actor: admin });
        assert.match(list.data.data[0].filePath, /^\/media\/maintenance\//);
    });
    await run('Regression: media DTO decoration preserves Decimal/date and signed form/audit blobs', async () => {
        const { Prisma } = require(path.join(scratch, 'client'));
        const price = new Prisma.Decimal('123.45'); const date = new Date();
        const formData = { id: 'original', filePath: 'original', fileName: 'original', ticketId: 'original' };
        const result = app.get(MediaService).decorate({ price, date, formData, details: formData, mediaAttachments: [{ id: 'item', fileName: 'foto', filePath: '/uploads/media/catalog/test.png', mediaType: 'IMAGE' }] }, '/catalog/skus/test');
        assert.equal(result.price, price); assert.equal(result.date, date); assert.equal(result.formData, formData); assert.equal(result.details, formData);
        assert.equal(result.mediaAttachments[0].filePath, '/media/item/item/file');
    });
    await run('A04: contractor cannot supply arbitrary assetId; no OS side effects', async () => {
        const count = await prisma.maintenanceOS.count();
        status(await http('/contractor/maintenance', { actor: owner, method: 'POST', body: { formType: 'TERCEIRIZADO', assetId: crypto.randomUUID() } }), 403);
        assert.equal(await prisma.maintenanceOS.count(), count);
        status(await http('/contractor/maintenance', { actor: owner, method: 'POST', body: { formType: 'TERCEIRIZADO', formData: {} } }), 201);
    });
    await run('A05: PIN and legacy assign cannot replace current assignee; manager transfer works', async () => {
        status(await http(`/tickets/${ticket.id}/assign-with-pin`, { actor: tech, method: 'PUT', body: { pin } }), 409);
        status(await http(`/tickets/${ticket.id}/assign`, { actor: tech, method: 'PUT', body: { assignedToId: tech.id } }), 409);
        assert.equal((await prisma.ticket.findUnique({ where: { id: ticket.id } })).assignedToInternalUserId, manager.id);
        status(await http(`/tickets/${ticket.id}/reassign`, { actor: tech, method: 'PUT', body: { pin, assignedToId: tech.id } }), 403);
        status(await http(`/tickets/${ticket.id}/reassign`, { actor: manager, method: 'PUT', body: { pin, assignedToId: tech.id } }), 200);
    });
    await run('A05: concurrent first assignment has one winner', async () => {
        const free = await prisma.ticket.create({ data: { title: 'Livre', description: 'Teste', source: 'INTERNAL', internalUserId: internal.id } });
        const results = await Promise.all([tech, manager].map(actor => http(`/tickets/${free.id}/assign-with-pin`, { actor, method: 'PUT', body: { pin } })));
        assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    });
    await run('A06: confirmed signature block rejects edit/delete/attachment changes', async () => {
        status(await http(`/maintenance/${os.id}/followup-blocks/${block.id}/lock`, { actor: tech, method: 'POST' }), 201);
        status(await http(`/maintenance/${os.id}/followup-blocks/${block.id}`, { actor: admin, method: 'DELETE' }), 403);
        status(await http(`/maintenance/${os.id}/followup-blocks/${block.id}`, { actor: tech, method: 'PUT', body: { content: signature + 'A' } }), 403);
        status(await http(`/client/maintenance/${os.id}/followup-blocks/${block.id}`, { actor: client, method: 'PUT', body: { content: signature } }), 403);
        status(await http(`/contractor/maintenance/${os.id}/followup-blocks/${block.id}`, { actor: owner, method: 'DELETE' }), 403);
        status(await http(`/maintenance/${os.id}/followup-blocks/${block.id}/attachments/${resources[1][1].id}`, { actor: tech, method: 'DELETE' }), 403);
        assert.equal((await prisma.maintenanceOSFollowupBlock.findUnique({ where: { id: block.id } })).content, signature);
    });
    await run('A06: first witness signature locks original form; no overwrite by any portal', async () => {
        status(await http(`/client/maintenance/${os.id}/witness-signature`, { actor: otherClient, method: 'PUT', body: { signature } }), 403);
        status(await http(`/client/maintenance/${os.id}/witness-signature`, { actor: client, method: 'PUT', body: { signature } }), 200);
        status(await http(`/client/maintenance/${os.id}/witness-signature`, { actor: client, method: 'PUT', body: { signature } }), 403);
        for (const [base, actor] of [['maintenance', admin], ['contractor/maintenance', owner]]) status(await http(`/${base}/${os.id}/form-data`, { actor, method: 'PUT', body: { formData: { details: 'Alterado', witnessSignature: signature } } }), 403);
        assert.equal((await prisma.maintenanceOS.findUnique({ where: { id: os.id } })).formData.details, 'Original');
    });
    await run('A07: maintenance.execute alone cannot close OS; close permission can', async () => {
        const closable = await prisma.maintenanceOS.create({ data: { status: 'IN_PROGRESS', openedById: admin.id } });
        status(await http(`/maintenance/${closable.id}/status`, { actor: tech, method: 'PUT', body: { status: 'CLOSED' } }), 403);
        assert.equal((await prisma.maintenanceOS.findUnique({ where: { id: closable.id } })).status, 'IN_PROGRESS');
        status(await http(`/maintenance/${closable.id}/status`, { actor: manager, method: 'PUT', body: { status: 'CLOSED' } }), 200);
    });
    await run('A08/A09: startup rejects missing, weak, public defaults and public bucket', async () => {
        const { validateSecurityConfig } = source('lib/security-config.ts');
        for (const JWT_SECRET of ['', 'change-me-in-production', 'a'.repeat(64), 'your-secret-' + 'a'.repeat(80)]) assert.throws(() => validateSecurityConfig({ JWT_SECRET }));
        assert.throws(() => validateSecurityConfig({ JWT_SECRET: process.env.JWT_SECRET, SUPABASE_OS_MEDIA_BUCKET_PUBLIC: 'true' }));
        assert.doesNotThrow(() => validateSecurityConfig({ JWT_SECRET: process.env.JWT_SECRET }));
        const seed = fs.readFileSync(path.join(root, 'apps/api/prisma/seed.ts'), 'utf8');
        assert(!/bcrypt\.hash\(\s*['"]/.test(seed)); assert(seed.includes('BOOTSTRAP_ADMIN_PASSWORD'));
        assert(!fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8').includes('JWT_SECRET:-'));
    });
    const upload = async (route, actor, bytes, name, mime) => { const form = new FormData(); form.append('files', new Blob([bytes], { type: mime }), name); return http(route, { actor, method: 'POST', form }); };
    await run('A10: forged HTML upload rejected and temporary file removed; genuine image gets safe extension', async () => {
        const route = `/maintenance/${os.id}/attachments`;
        const count = fs.readdirSync(path.join(process.env.MEDIA_UPLOAD_ROOT, 'maintenance')).length;
        status(await upload(route, admin, Buffer.from('<html><script>alert(1)</script></html>'), 'evil.html', 'image/png'), 400);
        assert.equal(fs.readdirSync(path.join(process.env.MEDIA_UPLOAD_ROOT, 'maintenance')).length, count);
        status(await upload(route, admin, png, 'misleading.html', 'image/png'), 201);
        const att = await prisma.maintenanceAttachment.findFirst({ where: { fileName: 'misleading.html' } });
        assert.match(att.filePath, /\.png$/); assert.equal(att.mimeType, 'image/png');
        const response = await http(`/media/maintenance/${att.id}/file`, { cookie: cookie(admin) }); status(response, 200); assert.equal(response.headers.get('content-type'), 'image/png');
    });
    await run('A10: followup PDF remains supported; legacy HTML downloads as inert binary', async () => {
        status(await upload(`/followups/${follower.id}/blocks/${followBlock.id}/attachments`, admin, Buffer.from('%PDF-1.7\n%Test synthetic fixture\n%%EOF'), 'document.pdf', 'application/pdf'), 201);
        fs.writeFileSync(path.join(process.env.MEDIA_UPLOAD_ROOT, 'maintenance/legacy.html'), '<script>alert(1)</script>');
        const att = await prisma.maintenanceAttachment.create({ data: { maintenanceOSId: os.id, fileName: 'legacy.html', filePath: 'legacy.html', mimeType: 'text/html' } });
        const response = await http(`/media/maintenance/${att.id}/file`, { cookie: cookie(admin) }); status(response, 200);
        assert.equal(response.headers.get('content-type'), 'application/octet-stream'); assert.match(response.headers.get('content-disposition'), /^attachment/); assert.match(response.headers.get('content-security-policy'), /sandbox/);
    });
    await run('A11: strict label dimensions reject stored HTML/CSS payload on create and update', async () => {
        const valid = { name: 'Teste', widthMm: 50, heightMm: 30, elements: [] };
        const bad = JSON.stringify({ ...valid, heightMm: '30;}</style><script>alert(1)</script>' });
        const { LabelsService } = source('modules/labels/labels.service.ts');
        const labels = app.get(LabelsService);
        await assert.rejects(() => labels.createTemplate({ name: 'Ruim', layout: bad }));
        const saved = await labels.createTemplate({ name: 'Bom', layout: JSON.stringify(valid) });
        await assert.rejects(() => labels.updateTemplate(saved.id, { layout: bad }));
        const { labelLayoutSchema, createLabelTemplateSchema } = require(path.join(root, 'packages/shared/src/index.ts'));
        assert.equal(createLabelTemplateSchema.safeParse({ name: 'Ruim', layout: bad }).success, false);
        assert.equal(labelLayoutSchema.safeParse({ ...valid, columns: 0 }).success, false);
        assert.equal(labelLayoutSchema.safeParse({ ...valid, heightMm: Infinity }).success, false);
        assert.equal(labelLayoutSchema.safeParse(valid).success, true);
        assert(!fs.readFileSync(path.join(root, 'apps/web/src/app/dashboard/etiquetas/page.tsx'), 'utf8').includes('document.write('));
    });
    await run('Regression: tenant/owner guards still protect main OS and followup views', async () => {
        status(await http(`/client/maintenance/${os.id}`, { actor: client }), 200);
        status(await http(`/client/maintenance/${os.id}`, { actor: otherClient }), 403);
        status(await http(`/contractor/maintenance/${os.id}`, { actor: owner }), 200);
        status(await http(`/contractor/maintenance/${os.id}`, { actor: otherOwner }), 403);
        status(await http(`/client/followups/${follower.id}`, { actor: client }), 200);
        status(await http(`/client/followups/${follower.id}`, { actor: otherClient }), 403);
    });
    if (process.argv.includes('--browser')) {
        await prisma.maintenanceOS.update({ where: { id: os.id }, data: { clientName: 'Cliente QA Assinatura' } });
        await http('/register/client', { method: 'POST', body: { name: 'Solicitante QA Navegador', email: `${crypto.randomUUID()}@example.test`, password, companyId: company.id } });
        await require('./test-security-browser.cjs')({ run, origin, admin, manager, tech, client, owner, os, resources, scratch, root, apiRequire });
    }
}

main().catch(error => { console.error(error); cases.push({ name: 'Harness startup/fixtures', passed: false, error: error.message }); }).finally(async () => {
    if (app) await app.close().catch(() => undefined);
    if (prisma) await prisma.$disconnect().catch(() => undefined);
    if (socket) await socket.stop().catch(() => undefined);
    if (db) await db.close().catch(() => undefined);
    const failed = cases.filter(c => !c.passed).length;
    fs.writeFileSync(path.join(__dirname, 'regression-results.json'), JSON.stringify({ generatedAt: new Date().toISOString(), environment: 'PGlite in-memory + Prisma 6 + real NestJS HTTP, loopback only; no production DB', note: 'PGlite serializes connections; not a PostgreSQL multi-process load test.', passed: cases.length - failed, failed, cases }, null, 2));
    console.log(`RESULT: ${cases.length - failed} passed, ${failed} failed`);
    process.exitCode = failed ? 1 : 0;
});
