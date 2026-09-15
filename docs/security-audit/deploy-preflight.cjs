/* Production READ-ONLY checks. Does not print credentials or client records. */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const fromApi = createRequire(path.join(root, 'apps/api/package.json'));
const dotenv = createRequire(fromApi.resolve('@nestjs/config/package.json'))('dotenv');
const config = dotenv.parse(fs.readFileSync(path.join(root, 'apps/api/.env')));
const { PrismaClient } = require(path.join(root, 'tmp/security-tests/client'));
const url = new URL(config.DATABASE_URL);
url.searchParams.set('connection_limit', '1');
url.searchParams.set('connect_timeout', '15');
const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });
const report = { checkedAt: new Date().toISOString(), mode: 'production metadata only; read-only transaction' };
async function main() {
    await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
        report.server = await tx.$queryRawUnsafe("SELECT current_setting('server_version') AS version, r.rolbypassrls AS bypass_rls, r.rolsuper AS superuser FROM pg_roles r WHERE r.rolname = current_user");
        report.migrations = await tx.$queryRawUnsafe('SELECT migration_name, finished_at, rolled_back_at, checksum FROM "_prisma_migrations" ORDER BY started_at');
        report.tables = await tx.$queryRawUnsafe("SELECT tablename, tableowner = current_user AS owned_by_server, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
        const seed = spawnSync('git', ['show', 'f3b2727190adbf96c9d35dc57b927e79f5c85275:apps/api/prisma/seed.ts'], { cwd: root, encoding: 'utf8' });
        if (seed.status !== 0) throw new Error('baseline unavailable');
        const password = seed.stdout.match(/bcrypt\.hash\(['"]([^'"]+)['"],\s*\d+\)/)?.[1];
        const accounts = await tx.internalUser.findMany({ where: { role: { name: 'Administrador' } }, select: { passwordHash: true, isActive: true } });
        report.historicalSeed = { checked: !!password, activeAdminUsesKnownPassword: false };
        if (password) {
            for (const account of accounts) {
                if (account.isActive && await fromApi('bcrypt').compare(password, account.passwordHash)) report.historicalSeed.activeAdminUsesKnownPassword = true;
            }
        }
    }, { timeout: 30000, isolationLevel: 'RepeatableRead' });
    const migrationsDir = path.join(root, 'apps/api/prisma/migrations');
    const applied = new Set(report.migrations.filter(m => m.finished_at && !m.rolled_back_at).map(m => m.migration_name));
    report.pending = fs.readdirSync(migrationsDir, { withFileTypes: true }).filter(e => e.isDirectory() && !applied.has(e.name)).map(e => e.name);
    report.failedMigrations = report.migrations.filter(m => !m.finished_at && !m.rolled_back_at).map(m => m.migration_name);
    const crypto = require('node:crypto');
    report.changedAppliedMigrations = report.migrations.filter(m => applied.has(m.migration_name)).filter(m => {
        const file = path.join(migrationsDir, m.migration_name, 'migration.sql');
        if (!fs.existsSync(file)) return true;
        const source = fs.readFileSync(file, 'utf8');
        return ![source, source.replace(/\r\n/g, '\n'), source.replace(/\r?\n/g, '\r\n')].some(s => crypto.createHash('sha256').update(s).digest('hex') === m.checksum);
    }).map(m => m.migration_name);
    delete report.migrations;
    const baseline = spawnSync('git', ['show', 'f3b2727190adbf96c9d35dc57b927e79f5c85275:apps/api/prisma/schema.prisma'], { cwd: root, encoding: 'utf8' });
    if (baseline.status !== 0) throw new Error('baseline unavailable');
    const baselinePath = path.join(root, 'tmp/security-tests/deploy-baseline.prisma');
    fs.writeFileSync(baselinePath, baseline.stdout);
    const diff = spawnSync(process.execPath, [fromApi.resolve('prisma/build/index.js'), 'migrate', 'diff', '--from-schema-datamodel', baselinePath, '--to-schema-datasource', path.join(root, 'apps/api/prisma/schema.prisma'), '--script'], {
        cwd: path.join(root, 'apps/api'), env: { ...process.env, ...config }, encoding: 'utf8', timeout: 60000,
    });
    report.driftCheckSucceeded = diff.status === 0;
    if (diff.status === 0) {
        fs.writeFileSync(path.join(__dirname, 'deployment-drift.sql'), diff.stdout);
        report.baselineDriftIsEmpty = !diff.stdout.replace(/--[^\n]*/g, '').trim();
    }
    fs.writeFileSync(path.join(__dirname, 'deployment-preflight-results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error('Read-only preflight failed:', error.code || error.name); process.exitCode = 1; }).finally(() => prisma.$disconnect());
