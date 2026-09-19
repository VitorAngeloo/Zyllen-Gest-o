/* Complete additive migration chain in disposable PostgreSQL; never loads .env. */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const scratch = path.join(root, 'tmp/architecture-validation');
const artifacts = path.join(scratch, 'operational-migrations-qa'); fs.mkdirSync(artifacts, { recursive: true });
const apiRequire = Module.createRequire(path.join(root, 'apps/api/package.json'));
const deps = Module.createRequire(path.join(root, 'tmp/security-test-deps/package.json'));
const { PGlite } = deps('@electric-sql/pglite');
const names = ['20260918030000_project_operational_service','20260918040000_trips','20260918050000_asset_custody','20260918060000_stock_minimums','20260918070000_structure_cycles','20260918080000_panel_mirrors','20260918100000_vehicle_reservations'];
const tables = names.flatMap(name => [...fs.readFileSync(path.join(root, 'apps/api/prisma/migrations', name, 'migration.sql'), 'utf8').matchAll(/CREATE TABLE "([^"]+)"/g)].map(m => m[1]));
function ddl(schema) { return execFileSync(process.execPath, [apiRequire.resolve('prisma/build/index.js'), 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', schema, '--script'], { cwd: scratch, encoding: 'utf8', windowsHide: true, env: { ...process.env, DATABASE_URL: 'postgresql://test@127.0.0.1:1/test', DIRECT_URL: 'postgresql://test@127.0.0.1:1/test' } }); }
let actual, expected;
(async () => {
    let baseline = fs.readFileSync(path.join(root, 'apps/api/prisma/schema.prisma'), 'utf8');
    for (const table of tables) baseline = baseline.replace(new RegExp('^model ' + table + ' \\{[\\s\\S]*?^\\}', 'm'), '');
    baseline = baseline.replace(/^.*(?:projectServiceAssignments|operationalService|projectService ProjectService|startedAt\s+DateTime\?|completedAt\s+DateTime\?|cancelledAt\s+DateTime\?|tripAssignments|\btrip\s+Trip\?|operationalStructures|panelMirror\s+PanelMirror|inventoryLocations|custodyTransfers|custodyTransfer\s+InventoryTransfer|transferItems|custodyItem|stockMinimums|vehicleReservations|vehicleBookingsCreated).*\r?\n/gm, '');
    baseline = baseline.replace(/^model Location \{[\s\S]*?^\}/m, body => body.split('\n').filter(line => !/\b(kind|companyId|projectId|isMainWarehouse|company|project|transfersFrom|transfersTo)\b/.test(line)).join('\n'));
    const baselinePath = path.join(artifacts, 'baseline-schema.prisma'); fs.writeFileSync(baselinePath, baseline);
    actual = await PGlite.create(); expected = await PGlite.create(); await actual.exec(ddl(baselinePath)); await expected.exec(ddl(path.join(root, 'apps/api/prisma/schema.prisma')));
    await actual.exec(`INSERT INTO "Category" (id,name,"updatedAt") VALUES ('migration-qa','Categoria legado QA',NOW());
        INSERT INTO "SkuItem" (id,"skuCode",name,"categoryId","updatedAt") VALUES ('migration-qa','895999','Produto legado QA','migration-qa',NOW());
        INSERT INTO "Location" (id,name,"updatedAt") VALUES ('migration-qa','Local legado QA',NOW());
        INSERT INTO "Asset" (id,"assetCode","skuId","currentLocationId","updatedAt") VALUES ('migration-qa','LEGACY-ALL-MIGRATIONS-QA','migration-qa','migration-qa',NOW());
        INSERT INTO "Company" (id,name,"updatedAt") VALUES ('migration-qa','Cliente legado QA',NOW());
        INSERT INTO "Project" (id,name,"companyId","updatedAt") VALUES ('migration-qa','Projeto legado QA','migration-qa',NOW());`);
    const legacy = async () => (await actual.query('SELECT a.id,a."assetCode",a."currentLocationId",p.name AS project,l.name AS location FROM "Asset" a JOIN "Location" l ON l.id=a."currentLocationId" CROSS JOIN "Project" p')).rows;
    const before = await legacy();
    for (const name of names) { const sql = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations', name, 'migration.sql'), 'utf8'); assert(!/\b(DROP|TRUNCATE)\b|^\s*(DELETE|UPDATE)\b/im.test(sql)); await actual.exec(sql); }
    assert.deepEqual(await legacy(), before);
    assert.deepEqual((await actual.query('SELECT kind,"companyId","projectId","isMainWarehouse" FROM "Location"')).rows, [{ kind: null, companyId: null, projectId: null, isMainWarehouse: null }]);
    console.log('PASS all seven migrations preserve legacy assets, locations, clients and projects without assigning ownership');
    const queries = {
        columns: "SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,column_name",
        foreignKeys: "SELECT c.relname AS table_name,k.conname,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid WHERE k.contype='f' ORDER BY c.relname,k.conname",
        indexes: "SELECT tablename AS table_name,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname"
    };
    for (const [name, sql] of Object.entries(queries)) {
        const left = (await actual.query(sql)).rows.filter(x => tables.includes(x.table_name) || ['Location','Schedule'].includes(x.table_name));
        const right = (await expected.query(sql)).rows.filter(x => tables.includes(x.table_name) || ['Location','Schedule'].includes(x.table_name));
        assert.deepEqual(left, right, 'Migration chain differs from Prisma schema: ' + name);
    }
    console.log('PASS final columns, defaults, indexes and foreign keys match the application schema, including restrictive custody history');
    const privateTables = (await actual.query("SELECT relname,relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace")).rows.filter(x => tables.includes(x.relname)); assert.equal(privateTables.length, tables.length); assert(privateTables.every(x => x.relrowsecurity));
    console.log('PASS all fourteen new tables retain private RLS');
    fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify({ passed: 3, failed: 0, migrations: names, tables, environment: 'Two disposable PGlite databases; no production credentials or database' }, null, 2));
})().catch(error => { console.error(error.message); fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify({ passed: 0, failed: 1, error: error.message }, null, 2)); process.exitCode = 1; }).finally(async () => { await actual?.close(); await expected?.close(); });
