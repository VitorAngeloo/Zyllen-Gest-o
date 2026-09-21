/* Validate the additive role grant using an in-memory PostgreSQL database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const root = path.resolve(__dirname, '../..');
const deps = Module.createRequire(path.join(root, 'tmp/security-test-deps/package.json'));
const { PGlite } = deps('@electric-sql/pglite');
const migration = fs.readFileSync(
    path.join(root, 'apps/api/prisma/migrations/20260921120000_technician_catalog_item_create/migration.sql'),
    'utf8',
);
const controller = fs.readFileSync(path.join(root, 'apps/api/src/modules/catalog/catalog.controller.ts'), 'utf8');

async function main() {
    assert(!/\b(?:DROP|DELETE|UPDATE|TRUNCATE|ALTER)\b/i.test(migration), 'Permission migration must be additive');
    assert.match(controller, /@Post\('categories'\)\s*@RequirePermission\('catalog.create'\)/);
    assert.match(controller, /@Post\('skus'\)\s*@RequirePermission\(\['catalog.create', 'catalog.create_sku'\]\)/);
    const db = await PGlite.create();
    try {
        await db.exec(`
            CREATE TABLE "Role" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE);
            CREATE TABLE "ScreenPermission" (
                "id" TEXT PRIMARY KEY, "screen" TEXT NOT NULL, "action" TEXT NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE ("screen", "action")
            );
            CREATE TABLE "RolePermission" (
                "id" TEXT PRIMARY KEY, "roleId" TEXT NOT NULL REFERENCES "Role"("id"),
                "screenPermissionId" TEXT NOT NULL REFERENCES "ScreenPermission"("id"),
                UNIQUE ("roleId", "screenPermissionId")
            );
            INSERT INTO "Role" ("id", "name") VALUES ('tech', 'Técnico'), ('manager', 'Gestor');
            INSERT INTO "ScreenPermission" ("id", "screen", "action")
                VALUES ('catalog-create', 'catalog', 'create'), ('catalog-view', 'catalog', 'view');
            INSERT INTO "RolePermission" ("id", "roleId", "screenPermissionId")
                VALUES ('manager-create', 'manager', 'catalog-create'), ('tech-view', 'tech', 'catalog-view');
        `);
        await db.exec(migration);
        await db.exec(migration);

        const { rows } = await db.query(`
            SELECT r."name", p."screen", p."action"
            FROM "RolePermission" rp
            JOIN "Role" r ON r."id" = rp."roleId"
            JOIN "ScreenPermission" p ON p."id" = rp."screenPermissionId"
            ORDER BY r."name", p."screen", p."action"
        `);
        assert.deepEqual(rows, [
            { name: 'Gestor', screen: 'catalog', action: 'create' },
            { name: 'Técnico', screen: 'catalog', action: 'create_sku' },
            { name: 'Técnico', screen: 'catalog', action: 'view' },
        ]);
        assert.equal((await db.query(`SELECT count(*)::int AS count FROM "ScreenPermission" WHERE "screen" = 'catalog' AND "action" = 'create_sku'`)).rows[0].count, 1);
        console.log('PASS technician item permission is additive, scoped and idempotent');
    } finally {
        await db.close();
    }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
