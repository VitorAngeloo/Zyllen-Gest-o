/* Real NestJS HTTP + Prisma + disposable PostgreSQL (PGlite), never production. */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const trips = process.argv.includes('--trips');
const structures = process.argv.includes('--structures');
const panels = process.argv.includes('--panels');
const vehicles = process.argv.includes('--vehicles');
const custody = process.argv.includes('--custody');
const inventoryStatistics = process.argv.includes('--inventory-statistics');
const projects = process.argv.includes('--projects') || process.argv.includes('--project-statistics') || trips || structures || panels;
const scratch = path.join(root, 'tmp/architecture-validation');
const artifacts = path.join(scratch, vehicles ? 'vehicles-api-qa' : panels ? 'personal-panels-api-qa' : structures ? 'structures-api-qa' : inventoryStatistics ? 'inventory-statistics-api-qa' : custody ? 'custody-api-qa' : trips ? 'trips-api-qa' : process.argv.includes('--project-statistics') ? 'project-statistics-api-qa' : projects ? 'project-services-api-qa' : 'ticket-statistics-qa');
const apiRequire = Module.createRequire(path.join(root, 'apps/api/package.json'));
const deps = Module.createRequire(path.join(root, 'tmp/security-test-deps/package.json'));
const { PGlite } = deps('@electric-sql/pglite');
const { PGLiteSocketServer } = deps('@electric-sql/pglite-socket');
const cases = [];
let app, prisma, db, socket;
async function run(name, work) {
    try { await work(); cases.push({ name, passed: true }); console.log('PASS ' + name); }
    catch (error) { cases.push({ name, passed: false, error: error.message }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function main() {
    fs.mkdirSync(artifacts, { recursive: true });
    assert(fs.existsSync(path.join(scratch, 'client/index.js')), 'Run pnpm validate:isolated first');
    db = await PGlite.create();
    let ddlSchema = path.join(scratch, 'schema.prisma');
    if (vehicles) {
        let baseline = fs.readFileSync(ddlSchema, 'utf8');
        for (const name of ['Vehicle', 'VehicleReservation', 'VehicleUse']) baseline = baseline.replace(new RegExp('^model ' + name + ' \\{[\\s\\S]*?^\\}', 'm'), '');
        baseline = baseline.replace(/^.*(?:vehicleReservations|vehicleBookingsCreated|vehicleUsesDriven|vehicleCheckouts|vehicleReturns).*\r?\n/gm, '');
        ddlSchema = path.join(artifacts, 'baseline-schema.prisma'); fs.writeFileSync(ddlSchema, baseline);
    }
    if (inventoryStatistics) {
        const baseline = fs.readFileSync(ddlSchema, 'utf8').replace(/^model StockMinimum \{[\s\S]*?^\}/m, '').replace(/^.*stockMinimums.*\r?\n/gm, '');
        ddlSchema = path.join(artifacts, 'baseline-schema.prisma'); fs.writeFileSync(ddlSchema, baseline);
    }
    if (custody) {
        let baseline = fs.readFileSync(ddlSchema, 'utf8');
        for (const name of ['InventoryTransfer', 'InventoryTransferItem']) baseline = baseline.replace(new RegExp(`^model ${name} \\{[\\s\\S]*?^\\}`, 'm'), '');
        baseline = baseline.replace(/^.*(?:inventoryLocations|custodyTransfers|custodyTransfer\s+InventoryTransfer|transferItems|custodyItem).*\r?\n/gm, '');
        baseline = baseline.replace(/^model Location \{[\s\S]*?^\}/m, body => body.split('\n').filter(line => !/\b(kind|companyId|projectId|isMainWarehouse|company|project|transfersFrom|transfersTo)\b/.test(line)).join('\n'));
        ddlSchema = path.join(artifacts, 'baseline-schema.prisma'); fs.writeFileSync(ddlSchema, baseline);
    }
    if (projects) {
        let baseline = fs.readFileSync(ddlSchema, 'utf8');
        for (const name of ['ProjectService', 'ProjectServiceMarker', 'ProjectServiceInternal', 'ProjectServiceContractor', 'Trip', 'TripContractor', 'OperationalStructure', 'StructureCycle', 'PanelMirror', 'PanelAttentionClient']) {
            baseline = baseline.replace(new RegExp(`^model ${name} \\{[\\s\\S]*?^\\}`, 'm'), '');
        }
        baseline = baseline.replace(/^.*(?:projectServiceAssignments|operationalService|projectService ProjectService).*\r?\n/gm, '');
        baseline = baseline.replace(/^model Schedule \{[\s\S]*?^\}/m, body => body.split('\n').filter(line => !/\b(startedAt|completedAt|cancelledAt)\s+DateTime\?/.test(line)).join('\n'));
        baseline = baseline.replace(/^.*(?:tripAssignments|\btrip\s+Trip\?).*\r?\n/gm, '');
        baseline = baseline.replace(/^.*operationalStructures.*\r?\n/gm, '');
        baseline = baseline.replace(/^.*panelMirror\s+PanelMirror.*\r?\n/gm, '');
        baseline = baseline.replace(/^.*panelAttentionClients.*\r?\n/gm, '');
        ddlSchema = path.join(artifacts, 'baseline-schema.prisma'); fs.writeFileSync(ddlSchema, baseline);
    }
    const ddl = execFileSync(process.execPath, [apiRequire.resolve('prisma/build/index.js'),
        'migrate', 'diff', '--from-empty', '--to-schema-datamodel', ddlSchema, '--script'], {
        cwd: scratch, encoding: 'utf8', windowsHide: true,
        env: { ...process.env, DATABASE_URL: 'postgresql://test@127.0.0.1:1/test', DIRECT_URL: 'postgresql://test@127.0.0.1:1/test' },
    });
    await db.exec(ddl);
    if (vehicles) await run('Vehicles migration: additive private tables preserve existing records and reject invalid periods', async () => {
        const before = (await db.query('SELECT COUNT(*) AS total FROM "InternalUser"')).rows;
        const migration = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20260918100000_vehicle_reservations/migration.sql'), 'utf8');
        assert(!/\b(DROP|TRUNCATE)\b|^\s*(DELETE|UPDATE)\b/im.test(migration)); await db.exec(migration);
        const internosRoleId = crypto.randomUUID();
        await db.query('INSERT INTO "Role" (id,name,"updatedAt") VALUES ($1,$2,NOW())', [internosRoleId, 'Internos']);
        for (const action of ['view', 'reserve']) await db.query('INSERT INTO "ScreenPermission" (id,screen,action) VALUES ($1,$2,$3)', [crypto.randomUUID(), 'vehicles', action]);
        const useMigration = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20260921110000_vehicle_checkout_return/migration.sql'), 'utf8');
        assert(!/\b(DROP|TRUNCATE)\b|^\s*(DELETE|UPDATE)\b/im.test(useMigration)); await db.exec(useMigration);
        assert.equal((await db.query('SELECT COUNT(*) AS total FROM "RolePermission" WHERE "roleId"=$1', [internosRoleId])).rows[0].total, 2);
        assert.deepEqual((await db.query('SELECT COUNT(*) AS total FROM "InternalUser"')).rows, before);
        const privateTables = (await db.query("SELECT relrowsecurity FROM pg_class WHERE relname IN ('Vehicle','VehicleReservation','VehicleUse')")).rows;
        assert.equal(privateTables.length, 3); assert(privateTables.every(row => row.relrowsecurity));
        await db.exec('CREATE ROLE vehicle_untrusted NOLOGIN; GRANT USAGE ON SCHEMA public TO vehicle_untrusted; GRANT SELECT,INSERT ON "Vehicle" TO vehicle_untrusted; SET ROLE vehicle_untrusted');
        try { assert.deepEqual((await db.query('SELECT * FROM "Vehicle"')).rows, []); await assert.rejects(() => db.query('INSERT INTO "Vehicle" (id,name,"updatedAt") VALUES ($1,$1,NOW())', ['blocked']), /row-level security/); } finally { await db.exec('RESET ROLE'); }
    });
    if (inventoryStatistics) await run('Minimum migration: additive private RLS table, existing rows preserved, nonnegative reserve and positive optional output threshold', async () => {
        const before = (await db.query('SELECT COUNT(*) AS total FROM "Location"')).rows[0].total;
        const migration = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20260918060000_stock_minimums/migration.sql'), 'utf8');
        assert(!/\b(DROP|TRUNCATE)\b|^\s*(DELETE|UPDATE)\b/im.test(migration)); await db.exec(migration);
        assert.equal((await db.query('SELECT COUNT(*) AS total FROM "Location"')).rows[0].total, before);
        assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE relname = 'StockMinimum'")).rows[0].relrowsecurity, true);
        await db.exec('CREATE ROLE minimum_untrusted NOLOGIN; GRANT USAGE ON SCHEMA public TO minimum_untrusted; GRANT SELECT,INSERT ON "StockMinimum" TO minimum_untrusted; SET ROLE minimum_untrusted');
        try { await assert.rejects(() => db.query('INSERT INTO "StockMinimum" (id,"skuId","locationId",minimum,"updatedAt") VALUES ($1,$1,$1,1,NOW())', ['blocked']), /row-level security/); } finally { await db.exec('RESET ROLE'); }
    });
    if (custody) await run('Custody migration: additive upgrade preserves real-shaped legacy asset/location, enables private RLS and validates classification', async () => {
        const id = crypto.randomUUID();
        await db.query('INSERT INTO "Category" (id,name,"updatedAt") VALUES ($1,$2,NOW())', [id, 'Migração custódia QA']);
        await db.query('INSERT INTO "SkuItem" (id,"skuCode",name,"categoryId","updatedAt") VALUES ($1,$2,$3,$1,NOW())', [id, '890999', 'Legado migração QA']);
        await db.query('INSERT INTO "Location" (id,name,"updatedAt") VALUES ($1,$2,NOW())', [id, 'Local existente migração QA']);
        await db.query('INSERT INTO "Asset" (id,"assetCode","skuId","currentLocationId","updatedAt") VALUES ($1,$2,$1,$1,NOW())', [id, 'LEGACY-MIGRATION-QA']);
        const migration = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20260918050000_asset_custody/migration.sql'), 'utf8');
        assert(!/\b(DROP|TRUNCATE)\b|^\s*(DELETE|UPDATE)\b/im.test(migration));
        await db.exec(migration);
        const asset = (await db.query('SELECT "assetCode", "currentLocationId" FROM "Asset" WHERE id=$1', [id])).rows[0]; assert.equal(asset.assetCode, 'LEGACY-MIGRATION-QA'); assert.equal(asset.currentLocationId, id);
        const location = (await db.query('SELECT kind, "companyId", "isMainWarehouse" FROM "Location" WHERE id=$1', [id])).rows[0]; assert.deepEqual(location, { kind: null, companyId: null, isMainWarehouse: null });
        await assert.rejects(() => db.query('UPDATE "Location" SET kind=\'CLIENT\' WHERE id=$1', [id]), /check constraint/);
        const tables = (await db.query("SELECT relrowsecurity FROM pg_class WHERE relname IN ('InventoryTransfer','InventoryTransferItem')")).rows; assert.equal(tables.length, 2); assert(tables.every(t => t.relrowsecurity));
        await db.exec('CREATE ROLE custody_untrusted NOLOGIN; GRANT USAGE ON SCHEMA public TO custody_untrusted; GRANT SELECT,INSERT ON "InventoryTransferItem" TO custody_untrusted; SET ROLE custody_untrusted');
        try { await assert.rejects(() => db.query('INSERT INTO "InventoryTransferItem" ("transferId","assetId","previousStatus") VALUES ($1,$1,$2)', [id, 'ATIVO']), /row-level security/); }
        finally { await db.exec('RESET ROLE'); }
    });
    if (custody) await run('Internal destination migration: creates named locations without moving existing assets', async () => {
        const before = (await db.query('SELECT COUNT(*) AS total FROM "Asset"')).rows[0].total;
        const migration = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20260921140000_internal_stock_destinations/migration.sql'), 'utf8');
        assert(!/\b(DROP|TRUNCATE)\b|^\s*(DELETE|UPDATE)\b/im.test(migration));
        await db.exec(migration);
        await db.exec(migration);
        assert.equal((await db.query('SELECT COUNT(*) AS total FROM "Asset"')).rows[0].total, before);
        const locations = (await db.query('SELECT name, kind FROM "Location" WHERE name IN ($1,$2,$3)',
            ['Manutenção', 'Baixa', 'Uso interno - Skyline'])).rows;
        assert.equal(locations.length, 3); assert(locations.every(row => row.kind === 'INTERNAL'));
    });
    if (projects) await run('Project migration: additive upgrade preserves client/project and enables RLS on all new tables', async () => {
        const id = crypto.randomUUID();
        await db.query('INSERT INTO "Company" (id,name,"updatedAt") VALUES ($1,$2,NOW())', [id, 'Cliente existente QA']);
        await db.query('INSERT INTO "Project" (id,name,"companyId","updatedAt") VALUES ($1,$2,$3,NOW())', [id, 'Projeto existente QA', id]);
        const migration = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20260918030000_project_operational_service/migration.sql'), 'utf8');
        assert(!/\b(DROP|TRUNCATE)\b|^\s*(DELETE|UPDATE)\b/im.test(migration));
        await db.exec(migration);
        assert.equal((await db.query('SELECT name FROM "Project" WHERE id=$1', [id])).rows[0].name, 'Projeto existente QA');
        const tables = (await db.query("SELECT relrowsecurity FROM pg_class WHERE relname IN ('ProjectService','ProjectServiceMarker','ProjectServiceInternal','ProjectServiceContractor')")).rows;
        assert.equal(tables.length, 4); assert(tables.every(table => table.relrowsecurity));
        await db.exec('CREATE ROLE projects_untrusted NOLOGIN; GRANT USAGE ON SCHEMA public TO projects_untrusted; GRANT SELECT,INSERT ON "ProjectServiceMarker" TO projects_untrusted; SET ROLE projects_untrusted');
        try { await assert.rejects(() => db.query('INSERT INTO "ProjectServiceMarker" (id,name,"nameKey") VALUES ($1,$2,$3)', ['blocked', 'blocked', 'blocked']), /row-level security/); }
        finally { await db.exec('RESET ROLE'); }
    });
    if (projects) await run('Trip migration: additive upgrade preserves prior data, nullable association and private RLS tables', async () => {
        const before = (await db.query('SELECT COUNT(*) AS total FROM "Project"')).rows[0].total;
        const migration = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20260918040000_trips/migration.sql'), 'utf8');
        assert(!/\b(DROP|TRUNCATE)\b|^\s*(DELETE|UPDATE)\b/im.test(migration));
        await db.exec(migration);
        assert.equal((await db.query('SELECT COUNT(*) AS total FROM "Project"')).rows[0].total, before);
        const tables = (await db.query("SELECT relrowsecurity FROM pg_class WHERE relname IN ('Trip','TripContractor')")).rows;
        assert.equal(tables.length, 2); assert(tables.every(table => table.relrowsecurity));
        const column = (await db.query("SELECT is_nullable FROM information_schema.columns WHERE table_name = 'ProjectService' AND column_name = 'tripId'")).rows[0];
        assert.equal(column.is_nullable, 'YES');
        await db.exec('GRANT SELECT,INSERT ON "Trip" TO projects_untrusted; SET ROLE projects_untrusted');
        try {
            assert.equal((await db.query('SELECT * FROM "Trip"')).rows.length, 0);
            await assert.rejects(() => db.query('INSERT INTO "Trip" (id,"scheduleId","originCity","originState","destinationCity","destinationState","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())', ['blocked', 'blocked', 'Origem', 'SP', 'Destino', 'RJ']), /row-level security/);
        }
        finally { await db.exec('RESET ROLE'); }
    });
    if (projects) await run('Structure migration: additive upgrade, nullable legacy link, restrictive history and private RLS', async () => {
        const before = (await db.query('SELECT COUNT(*) AS total FROM "Project"')).rows[0].total;
        const migration = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20260918070000_structure_cycles/migration.sql'), 'utf8');
        assert(!/\b(DROP|TRUNCATE)\b|^\s*(DELETE|UPDATE)\b/im.test(migration)); await db.exec(migration);
        assert.equal((await db.query('SELECT COUNT(*) AS total FROM "Project"')).rows[0].total, before);
        const tables = (await db.query("SELECT relrowsecurity FROM pg_class WHERE relname IN ('OperationalStructure','StructureCycle')")).rows;
        assert.equal(tables.length, 2); assert(tables.every(table => table.relrowsecurity));
        await db.exec('GRANT SELECT,INSERT ON "OperationalStructure","StructureCycle" TO projects_untrusted; SET ROLE projects_untrusted');
        try { assert.equal((await db.query('SELECT * FROM "StructureCycle"')).rows.length, 0); await assert.rejects(() => db.query('INSERT INTO "OperationalStructure" (id,"companyId",name,"nameKey",kind,"updatedAt") VALUES ($1,$1,$1,$1,\'ROOM\',NOW())', ['blocked']), /row-level security/); }
        finally { await db.exec('RESET ROLE'); }
    });
    if (projects) await run('Panel migration: additive private RLS table with one mirror per owner', async () => {
        const migration = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20260918080000_panel_mirrors/migration.sql'), 'utf8');
        assert(!/\b(DROP|TRUNCATE)\b|^\s*(DELETE|UPDATE)\b/im.test(migration)); await db.exec(migration);
        assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE relname = 'PanelMirror'")).rows[0].relrowsecurity, true);
        await db.exec('GRANT SELECT,INSERT ON "PanelMirror" TO projects_untrusted; SET ROLE projects_untrusted');
        try { assert.equal((await db.query('SELECT * FROM "PanelMirror"')).rows.length, 0); await assert.rejects(() => db.query('INSERT INTO "PanelMirror" (id,"ownerId","tokenHash","views","updatedAt") VALUES ($1,$1,$1,ARRAY[\'estoque\'],NOW())', ['blocked']), /row-level security/); }
        finally { await db.exec('RESET ROLE'); }
    });
    if (panels) await run('Panel attention migration: additive private relation preserves existing clients', async () => {
        const before = (await db.query('SELECT COUNT(*) AS total FROM "Company"')).rows[0].total;
        const migration = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20260923120000_panel_attention_clients/migration.sql'), 'utf8');
        assert(!/\b(DROP|TRUNCATE)\b|^\s*(DELETE|UPDATE)\b/im.test(migration));
        await db.exec(migration);
        assert.equal((await db.query('SELECT COUNT(*) AS total FROM "Company"')).rows[0].total, before);
        assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE relname='PanelAttentionClient'")).rows[0].relrowsecurity, true);
    });
    if (projects) await run('Project followup migration: existing projects remain intact and followup links are optional', async () => {
        const before = (await db.query('SELECT COUNT(*) AS total FROM "Project"')).rows[0].total;
        const migration = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20260921130000_project_followup_link/migration.sql'), 'utf8');
        assert(!/\b(DROP|TRUNCATE)\b|^\s*(DELETE|UPDATE)\b/im.test(migration));
        await db.exec(migration);
        assert.equal((await db.query('SELECT COUNT(*) AS total FROM "Project"')).rows[0].total, before);
        assert.equal((await db.query("SELECT is_nullable FROM information_schema.columns WHERE table_name = 'ProjectService' AND column_name = 'followupId'")).rows[0].is_nullable, 'YES');
    });
    socket = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1' });
    await socket.start();
    const address = socket.getServerConn();
    assert.match(address, /^127\.0\.0\.1:\d+$/);
    Object.assign(process.env, {
        DATABASE_URL: `postgresql://postgres:local-test@${address}/postgres?sslmode=disable&connection_limit=1`,
        JWT_SECRET: crypto.randomBytes(64).toString('hex'), CPF_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
        SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', NODE_ENV: 'test', API_PORT: '0',
        MEDIA_UPLOAD_ROOT: fs.mkdtempSync(path.join(artifacts, 'uploads-')),
    });
    process.env.DIRECT_URL = process.env.DATABASE_URL;
    const resolve = Module._resolveFilename;
    const express = Module.createRequire(apiRequire.resolve('@nestjs/platform-express/package.json')).resolve('express');
    Module._resolveFilename = function (request, parent, ...args) {
        if (request === '@prisma/client') return path.join(scratch, 'client/index.js');
        if (request === '@zyllen/shared') return path.join(root, 'packages/shared/src/index.ts');
        if (request === 'express') return express;
        return resolve.call(this, request, parent, ...args);
    };
    apiRequire('ts-node').register({ transpileOnly: true, project: path.join(root, 'apps/api/tsconfig.json') });
    apiRequire('reflect-metadata');
    const source = name => require(path.join(root, 'apps/api/src', name));
    const { PrismaService } = source('infrastructure/database/prisma.service.ts');
    prisma = new PrismaService();
    await prisma.$connect();
    const { Test } = apiRequire('@nestjs/testing');
    const { AppModule } = source('app.module.ts');
    const { MediaService } = source('modules/media/media.service.ts');
    const { ResponseInterceptor } = source('common/http/interceptors/response.interceptor.ts');
    const { GlobalExceptionFilter } = source('common/http/filters/global-exception.filter.ts');
    const { ValidationPipe } = apiRequire('@nestjs/common');
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(prisma).compile();
    app = module.createNestApplication({ logger: false });
    app.use(apiRequire('cookie-parser')());
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(MediaService)));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    const origin = await app.getUrl();
    const nativeFetch = global.fetch;
    global.fetch = (url, options) => {
        assert.equal(new URL(String(url)).hostname, '127.0.0.1', 'No external services');
        return nativeFetch(url, options);
    };
    const jwt = app.get(apiRequire('@nestjs/jwt').JwtService);
    const hash = await apiRequire('bcrypt').hash(crypto.randomBytes(20).toString('hex'), 4);
    async function internal(name, permissions = []) {
        const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
        for (const action of permissions) {
            const [screen, permissionAction] = action.includes('.') ? action.split('.') : ['tickets', action];
            const permission = await prisma.screenPermission.upsert({
                where: { screen_action: { screen, action: permissionAction } },
                update: {}, create: { screen, action: permissionAction },
            });
            await prisma.rolePermission.create({ data: { roleId: role.id, screenPermissionId: permission.id } });
        }
        const user = await prisma.internalUser.create({ data: { roleId: role.id, name, sector: ' Financeiro ', email: `${crypto.randomUUID()}@example.test`, passwordHash: hash } });
        return { ...user, token: jwt.sign({ sub: user.id, type: 'internal' }) };
    }
    const admin = await internal('Administrador'), manager = await internal('Gestor', ['view']);
    const tech = await internal('Técnico', ['view']), unprivileged = await internal('Internos');
    const company = await prisma.company.create({ data: { name: 'Cliente QA' } });
    const external = await prisma.externalUser.create({ data: { companyId: company.id, name: 'Cliente', email: `${crypto.randomUUID()}@example.test`, passwordHash: hash } });
    const client = { token: jwt.sign({ sub: external.id, type: 'external' }) };
    const contractor = await prisma.contractorUser.create({ data: { name: 'Terceiro', email: `${crypto.randomUUID()}@example.test`, passwordHash: hash } });
    const thirdParty = { token: jwt.sign({ sub: contractor.id, type: 'contractor' }) };
    const now = Date.now(), start = new Date(now - 86_400_000), end = new Date(now);
    const oldAt = new Date(now - 40 * 86_400_000), recentAt = new Date(now - 10_000);
    const create = data => prisma.ticket.create({ data: { title: 'Chamado QA', description: 'Descrição de teste sem dados reais', source: 'INTERNAL', internalUserId: admin.id, createdAt: recentAt, ...data } });
    await create({ createdAt: oldAt }); // Current pending must survive the period filter.
    await create({ createdAt: start }); // Inclusive start.
    await create({ createdAt: end }); // Exclusive end.
    await create({ status: 'IN_PROGRESS', assignedToInternalUserId: tech.id, createdAt: new Date(now - 80 * 60_000), firstResponseAt: new Date(now - 5 * 60_000) });
    await create({ status: 'IN_PROGRESS', assignedToInternalUserId: manager.id });
    await create({ status: 'WAITING_CLIENT', assignedToInternalUserId: tech.id });
    await create({ status: 'RESOLVED', assignedToInternalUserId: tech.id });
    await create({ status: 'CLOSED', closedAt: start, createdAt: oldAt, assignedToInternalUserId: tech.id });
    await create({ status: 'CLOSED', closedAt: end, createdAt: oldAt, assignedToInternalUserId: tech.id });
    await create({ status: 'CLOSED', closedAt: null }); // Never fabricate closure from updatedAt.
    await create({ internalUserId: null }); // Missing sector is explicit.
    await create({ source: 'CLIENT', internalUserId: null, companyId: company.id, externalUserId: external.id, createdAt: new Date(now - 80 * 60_000) });
    const query = { start: start.toISOString(), end: end.toISOString(), source: 'ALL' };
    async function http(route, actor = admin) {
        const response = await fetch(origin + route, { headers: actor ? { Authorization: `Bearer ${actor.token}` } : {} });
        return { status: response.status, body: await response.json() };
    }
    const stats = (overrides = {}, actor) => http('/tickets/statistics?' + new URLSearchParams({ ...query, ...overrides }), actor);
    const ok = response => { assert.equal(response.status, 200, JSON.stringify(response.body)); return response.body.data; };
    await run('Period bounds and current state stay separate; old pending, response wait and real closure', async () => {
        const data = ok(await stats());
        assert.equal(data.openedInPeriod, 8); assert.equal(data.closedInPeriod, 1);
        assert.equal(data.current.pending, 5); assert.equal(data.current.inProgress, 2);
        assert.equal(data.current.waitingClient, 1); assert.equal(data.current.resolved, 1);
        assert.equal(data.current.needingAttention, 3); assert.equal(data.current.oldestPendingAt, oldAt.toISOString());
        assert(data.current.averagePendingSeconds > 8 * 86_400 && data.current.averagePendingSeconds < 9 * 86_400);
        assert.deepEqual(data.sectors, [{ source: 'INTERNAL', name: 'Financeiro', openedInPeriod: 6 }, { source: 'CLIENT', name: 'Clientes', openedInPeriod: 1 }, { source: 'INTERNAL', name: 'Sem setor', openedInPeriod: 1 }]);
        assert.equal(data.scope, 'ALL');
    });
    await run('An internal sector named Clientes stays distinct from the client origin group', async () => {
        await prisma.internalUser.update({ where: { id: admin.id }, data: { sector: 'Clientes' } });
        try {
            const data = ok(await stats());
            const matching = data.sectors.filter(sector => sector.name === 'Clientes');
            assert.deepEqual(matching, [{ source: 'INTERNAL', name: 'Clientes', openedInPeriod: 6 }, { source: 'CLIENT', name: 'Clientes', openedInPeriod: 1 }]);
        } finally { await prisma.internalUser.update({ where: { id: admin.id }, data: { sector: ' Financeiro ' } }); }
    });
    await run('Source filters use persisted INTERNAL/CLIENT values in both statistics and paginated lists', async () => {
        const internalStats = ok(await stats({ source: 'INTERNAL' })), clientStats = ok(await stats({ source: 'CLIENT' }));
        assert.equal(internalStats.openedInPeriod, 7); assert.equal(clientStats.openedInPeriod, 1);
        assert.equal(clientStats.current.pending, 1); assert.equal(clientStats.closedInPeriod, 0);
        assert.equal(internalStats.current.needingAttention, 2); assert.equal(clientStats.current.needingAttention, 1);
        const list = await http('/tickets?source=CLIENT&limit=100');
        assert.equal(list.status, 200); assert.equal(list.body.total, 1); assert.equal(list.body.data[0].source, 'CLIENT');
        assert.equal((await http('/tickets?source=EXTERNAL')).status, 400);
    });
    await run('Technicians retain all open requests and only their own assignments; managers have global scope', async () => {
        const data = ok(await stats({}, tech));
        assert.equal(data.scope, 'OPEN_AND_ASSIGNED'); assert.equal(data.current.pending, 5);
        assert.equal(data.current.inProgress, 1); assert.equal(data.openedInPeriod, 6); assert.equal(data.closedInPeriod, 1);
        assert.equal(ok(await stats({}, manager)).current.inProgress, 2);
    });
    await run('Endpoint requires authentication, internal audience and tickets.view permission', async () => {
        for (const actor of [null, unprivileged, client, thirdParty]) assert.equal((await stats({}, actor)).status, actor ? 403 : 401);
    });
    await run('Malformed, inverted, oversized and unexpected query fields are rejected', async () => {
        for (const overrides of [{ source: 'EXTERNAL' }, { start: 'invalid' }, { end: query.start }, { start: query.end, end: query.start },
            { start: '2000-01-01T00:00:00Z' }, { assignedToId: tech.id }, { start: '2026-01-01' }]) {
            assert.equal((await stats(overrides)).status, 400, JSON.stringify(overrides));
        }
    });
    await run('UTC period instants are stable with another PostgreSQL session time zone', async () => {
        const before = ok(await stats());
        await prisma.$executeRawUnsafe("SET TIME ZONE 'America/Sao_Paulo'");
        const after = ok(await stats());
        for (const key of ['openedInPeriod', 'closedInPeriod', 'sectors']) assert.deepEqual(after[key], before[key]);
        assert.equal(after.current.pending, before.current.pending);
    });
    await run('Empty dataset returns zeros and no invented waiting time or sectors', async () => {
        await prisma.ticket.deleteMany(); // Disposable in-memory database only.
        const data = ok(await stats());
        assert.equal(data.openedInPeriod, 0); assert.equal(data.closedInPeriod, 0); assert.deepEqual(data.sectors, []);
        assert.equal(data.current.averagePendingSeconds, null); assert.equal(data.current.oldestPendingAt, null);
    });
    if (panels) await require('./test-personal-panels-api.cjs')({ run, prisma, origin, admin, tech, unprivileged, client, thirdParty, company, internal });
    if (vehicles) await require('./test-vehicles.cjs')({ run, prisma, origin, admin, unprivileged, client, thirdParty, internal });
    if (projects && !panels) await require('./test-project-services.cjs')({ run, prisma, origin, admin, tech, unprivileged, client, thirdParty, contractor, company, internal });
    if (structures) await require('./test-structures.cjs')({ run, prisma, origin, admin, tech, unprivileged, client, thirdParty, company, internal });
    if (process.argv.includes('--project-statistics') || trips) await require('./test-project-statistics.cjs')({ run, prisma, origin, admin, unprivileged, client, thirdParty, contractor, company, internal });
    if (trips) await require('./test-trips.cjs')({ run, prisma, origin, admin, unprivileged, client, thirdParty, contractor, company, internal });
    if (custody) await require('./test-inventory-custody.cjs')({ run, prisma, origin, admin, unprivileged, client, thirdParty, company, internal, db });
    if (inventoryStatistics) await require('./test-inventory-statistics.cjs')({ run, prisma, origin, admin, unprivileged, client, thirdParty, company, internal });
}
main().catch(error => { console.error(error); cases.push({ name: 'Harness startup', passed: false, error: error.message }); }).finally(async () => {
    if (app) await app.close().catch(() => undefined);
    if (prisma) await prisma.$disconnect().catch(() => undefined);
    if (socket) await socket.stop().catch(() => undefined);
    if (db) await db.close().catch(() => undefined);
    fs.mkdirSync(artifacts, { recursive: true });
    const failed = cases.filter(item => !item.passed).length;
    fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify({ generatedAt: new Date().toISOString(), environment: 'Disposable PGlite + real Prisma and NestJS HTTP; no production DB', passed: cases.length - failed, failed, cases }, null, 2));
    console.log(`RESULT: ${cases.length - failed} passed, ${failed} failed`);
    process.exitCode = failed ? 1 : 0;
});
