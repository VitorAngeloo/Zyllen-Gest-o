/* Read-only deployment smoke checks; no login, customer records or business writes. */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const fromApi = createRequire(path.join(root, 'apps/api/package.json'));
const dotenv = createRequire(fromApi.resolve('@nestjs/config/package.json'))('dotenv');
const config = dotenv.parse(fs.readFileSync(path.join(root, 'apps/api/.env')));
const { PrismaClient } = fromApi('@prisma/client');
const url = new URL(config.DATABASE_URL);
url.searchParams.set('connection_limit', '1');
const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const result = { checkedAt: new Date().toISOString(), scope: 'read-only database metadata and anonymous HTTP checks; not a full logged-in business acceptance test', checks: [] };
function check(name, passed) { result.checks.push({ name, passed: !!passed }); }
async function main() {
    await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
        const rows = await tx.$queryRawUnsafe('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"');
        check('security migration applied', rows.some(r => r.migration_name === '20260915180000_security_client_approval_media_shares' && r.finished_at && !r.rolled_back_at));
        check('no failed migrations', rows.every(r => r.finished_at || r.rolled_back_at));
        const tables = await tx.$queryRawUnsafe("SELECT tablename, rowsecurity, tableowner = current_user AS owned FROM pg_tables WHERE schemaname='public' AND tablename IN ('ClientRegistrationRequest','MediaShareLink')");
        check('both new tables have RLS and server ownership', tables.length === 2 && tables.every(t => t.rowsecurity && t.owned));
    }, { timeout: 20000 });
    for (const base of ['http://127.0.0.1:3001', 'https://api.skylineti.com']) {
        for (const [route, expected] of [['/health', 200], ['/register/client-requests', 401], ['/media/maintenance/00000000-0000-0000-0000-000000000000/file', 401], ['/uploads/security-deploy-probe', 404], ['/maintenance/attachments/00000000-0000-0000-0000-000000000000/file', 404], ['/media/shared/invalid', 404]]) {
            try {
                const response = await fetch(base + route, { headers: { Origin: 'https://skylineti.com' }, signal: AbortSignal.timeout(10000), redirect: 'manual' });
                check(base + route + ' => ' + expected, response.status === expected);
                if (route === '/health') check(base + ' allows credentialed production origin', response.headers.get('access-control-allow-origin') === 'https://skylineti.com' && response.headers.get('access-control-allow-credentials') === 'true');
                await response.body?.cancel();
            } catch { check(base + route + ' reachable', false); }
        }
    }
    result.passed = result.checks.filter(c => c.passed).length;
    result.failed = result.checks.filter(c => !c.passed).length;
    fs.writeFileSync(path.join(__dirname, 'production-verification.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    if (result.failed) process.exitCode = 1;
}
main().catch(error => { console.error('Verification failed:', error.code || error.name); process.exitCode = 1; }).finally(() => prisma.$disconnect());
