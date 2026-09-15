/* Explicit deployment step: API must already be stopped. Never prints key material. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const backup = path.resolve(process.argv[2] || '');
if (!backup.startsWith(path.resolve(root, '../../Zyllen-Backups') + path.sep)) throw new Error('Invalid backup location');
const verified = JSON.parse(fs.readFileSync(path.join(backup, 'backup-verification.json')));
if (!verified.restoreVerified || !verified.localUploadsCopied) throw new Error('Verified backup required');
const fromApi = createRequire(path.join(root, 'apps/api/package.json'));
const dotenv = createRequire(fromApi.resolve('@nestjs/config/package.json'))('dotenv');
const filename = path.join(root, 'apps/api/.env');
const before = fs.readFileSync(filename, 'utf8');
const saved = fs.readFileSync(path.join(backup, 'api.env.before'), 'utf8');
if (before !== saved) throw new Error('Config changed since backup; review before rotating');
const config = dotenv.parse(before);
const port = Number(config.API_PORT || 3001);
const socket = net.createConnection({ host: '127.0.0.1', port });
socket.setTimeout(3000);
socket.on('connect', () => { socket.destroy(); console.error('API still listening: stop the verified process first'); process.exitCode = 1; });
socket.on('timeout', () => { socket.destroy(); console.error('Cannot establish API shutdown'); process.exitCode = 1; });
socket.on('error', error => {
    if (error.code !== 'ECONNREFUSED') { console.error('Cannot establish API shutdown'); process.exitCode = 1; return; }
    const lines = before.match(/^JWT_SECRET\s*=.*$/gm) || [];
    if (lines.length !== 1) throw new Error('Expected exactly one JWT_SECRET assignment');
    const next = before.replace(/^JWT_SECRET\s*=.*$/m, 'JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
    const parsed = dotenv.parse(next);
    for (const key of Object.keys(config)) if (key !== 'JWT_SECRET' && config[key] !== parsed[key]) throw new Error('Unexpected config mutation');
    if (parsed.CPF_ENCRYPTION_KEY !== config.CPF_ENCRYPTION_KEY || !/^[a-f0-9]{128}$/.test(parsed.JWT_SECRET)) throw new Error('Key preservation/strength check failed');
    const temporary = filename + '.rotation.tmp';
    fs.writeFileSync(temporary, next, { flag: 'wx' });
    fs.renameSync(temporary, filename);
    fs.writeFileSync(path.join(backup, 'jwt-rotation.json'), JSON.stringify({ rotatedAt: new Date().toISOString(), jwtChanged: true, cpfKeyPreserved: true, otherSettingsPreserved: true }, null, 2));
    console.log('JWT rotated (512 random bits). CPF key and other settings preserved. No secrets printed.');
});
