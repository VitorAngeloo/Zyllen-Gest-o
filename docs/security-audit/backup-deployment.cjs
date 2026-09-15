/* Application backup + restore verification in an isolated, password-protected loopback PG. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const destination = path.resolve(process.argv[2] || '');
const allowed = path.resolve(root, '../../Zyllen-Backups');
if (!destination.startsWith(allowed + path.sep) || !fs.existsSync(destination)) throw new Error('Expected an existing, ACL-restricted backup directory outside the repository');
const fromApi = createRequire(path.join(root, 'apps/api/package.json'));
const dotenv = createRequire(fromApi.resolve('@nestjs/config/package.json'))('dotenv');
const config = dotenv.parse(fs.readFileSync(path.join(root, 'apps/api/.env')));
const source = new URL(config.DIRECT_URL);
const binary = name => path.join(destination, 'tools/pgsql/bin', name + '.exe');
function run(name, args, env, log) {
    const logPath = path.join(destination, log);
    const descriptor = fs.openSync(logPath, 'w');
    let out;
    try {
        // PostgreSQL children must not inherit Node's output pipes on Windows.
        out = spawnSync(binary(name), args, { env: { ...process.env, ...env }, stdio: ['ignore', descriptor, descriptor], windowsHide: true, timeout: 180000 });
    } finally { fs.closeSync(descriptor); }
    if (out.status !== 0) throw new Error(name + ' failed; inspect private backup log');
    return fs.readFileSync(logPath, 'utf8');
}
const report = { startedAt: new Date().toISOString(), scope: 'public schema (application), API artifacts/config and local uploads', productionWrites: false };
const remote = {
    PGHOST: source.hostname, PGPORT: source.port || '5432', PGUSER: decodeURIComponent(source.username),
    PGPASSWORD: decodeURIComponent(source.password), PGDATABASE: source.pathname.slice(1), PGSSLMODE: 'require',
    PGCONNECT_TIMEOUT: '20', PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=120000',
};
const archive = path.join(destination, 'application-public.dump');
const resume = process.argv.includes('--resume-verification');
if (fs.existsSync(archive) && !resume) throw new Error('Refusing to overwrite an existing backup');
let started = false;
const local = { PGHOST: '127.0.0.1', PGPORT: '55439', PGUSER: 'restore_operator', PGDATABASE: 'postgres', PGPASSWORD: crypto.randomBytes(48).toString('hex'), PGSSLMODE: 'disable', PGCONNECT_TIMEOUT: '10', PGOPTIONS: '' };
const cluster = path.join(destination, 'restore-verification');
try {
    if (!resume) run('pg_dump', ['--format=custom', '--schema=public', '--no-owner', '--no-acl', '--lock-wait-timeout=15000', '--file', archive], remote, 'pg-dump.log');
    report.archiveBytes = fs.statSync(archive).size;
    report.archiveSha256 = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
    const contents = run('pg_restore', ['--list', archive], local, 'archive-contents.txt');
    // initdb already creates public. Keep the original archive intact; only skip
    // that CREATE SCHEMA entry during this local verification, never drop data.
    const restoreList = path.join(destination, 'restore-contents.txt');
    fs.writeFileSync(restoreList, contents.split(/\r?\n/).map(line => /^\d+;.* SCHEMA - public /.test(line) ? '; ' + line : line).join('\n'));
    const passwordFile = path.join(destination, 'restore-password.txt');
    if (resume) local.PGPASSWORD = fs.readFileSync(passwordFile, 'utf8');
    else {
        fs.writeFileSync(passwordFile, local.PGPASSWORD);
        run('initdb', ['-D', cluster, '-U', local.PGUSER, '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', '--pwfile', passwordFile, '--encoding=UTF8', '--locale=C'], local, 'initdb.log');
    }
    if (!fs.existsSync(path.join(cluster, 'postmaster.pid'))) run('pg_ctl', ['-D', cluster, '-l', path.join(destination, 'restore-server.log'), '-o', '-h 127.0.0.1 -p 55439', '-w', 'start'], local, 'start-restore.log');
    started = true;
    const initialTables = Number(run('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', "SELECT count(*) FROM pg_tables WHERE schemaname='public'"], local, 'initial-local-table-count.txt').trim());
    if (initialTables !== 0) throw new Error('Restore target is not empty; refusing to alter existing data');
    run('pg_restore', ['--exit-on-error', '--no-owner', '--no-acl', '--use-list', restoreList, '--dbname=postgres', archive], local, 'restore.log');
    report.restoredTables = Number(run('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', "SELECT count(*) FROM pg_tables WHERE schemaname='public'"], local, 'restore-table-count.txt').trim());
    report.restoreVerified = report.restoredTables >= 45;
    fs.cpSync(path.join(root, 'apps/api/uploads'), path.join(destination, 'uploads'), { recursive: true, errorOnExist: true, force: false });
    report.localUploadsCopied = true;
    report.finishedAt = new Date().toISOString();
} finally {
    if (started) run('pg_ctl', ['-D', cluster, '-m', 'fast', '-w', 'stop'], local, 'stop-restore.log');
    fs.writeFileSync(path.join(destination, 'backup-verification.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
