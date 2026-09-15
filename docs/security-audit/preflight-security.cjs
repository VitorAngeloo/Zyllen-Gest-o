/* Read-only local configuration check. Never prints secrets, queries DB, rotates keys or changes services. */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const fromApi = createRequire(path.join(root, 'apps/api/package.json'));
const dotenv = createRequire(fromApi.resolve('@nestjs/config/package.json'))('dotenv');
const file = path.resolve(root, process.argv[2] || 'apps/api/.env');
if (!fs.existsSync(file)) throw new Error('Arquivo de configuração não encontrado. Informe o caminho sem expor os valores.');
const config = { ...dotenv.parse(fs.readFileSync(file)), ...process.env };
fromApi('ts-node').register({ transpileOnly: true, project: path.join(root, 'apps/api/tsconfig.json') });
const { validateSecurityConfig } = require(path.join(root, 'apps/api/src/lib/security-config.ts'));
let startup = false;
let startupIssue;
try { validateSecurityConfig(config); startup = true; } catch (error) { startupIssue = error.message; }
const isPostgres = key => { try { return ['postgresql:', 'postgres:'].includes(new URL(config[key]).protocol); } catch { return false; } };
const result = {
    checkedAt: new Date().toISOString(), mode: 'read-only; values and hashes omitted',
    startupIssue,
    checks: {
        startupSecretAndBucketFlagValid: startup,
        jwtMinimumLengthMet: String(config.JWT_SECRET || '').length >= 64,
        jwtNotPlaceholder: !/(change.?me|your.?secret|replace.?me|example|placeholder)/i.test(String(config.JWT_SECRET || '')),
        cpfKeyIs64HexChars: /^[a-f0-9]{64}$/i.test(config.CPF_ENCRYPTION_KEY || ''),
        databaseUrlIsPostgres: isPostgres('DATABASE_URL'), directUrlIsPostgres: isPostgres('DIRECT_URL'),
        corsOriginConfigured: !!config.CORS_ORIGIN,
        supabaseStorageConfigured: !!config.SUPABASE_URL && !!config.SUPABASE_SERVICE_ROLE_KEY,
        supabaseStorageConfigurationComplete: !!config.SUPABASE_URL === !!config.SUPABASE_SERVICE_ROLE_KEY,
    },
    notChecked: ['Actual Supabase bucket privacy/storage policies', 'Whether historical seeded credentials are in use', 'Backup and restore readiness', 'Database schema drift and pending migrations'],
};
fs.writeFileSync(path.join(__dirname, 'preflight-results.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exitCode = Object.entries(result.checks).some(([key, passed]) => key !== 'supabaseStorageConfigured' && !passed) ? 1 : 0;
