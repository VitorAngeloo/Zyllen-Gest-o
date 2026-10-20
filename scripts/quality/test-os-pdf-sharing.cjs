// Exercises PDF sharing without API/network or database access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '../..');
const ts = require(require.resolve('typescript', { paths: [path.join(root, 'apps/web')] }));
const calls = [];
let printed;
let failOnSecond = false;
const token = 'A'.repeat(43);
const apiClient = {
    async post(endpoint) {
        calls.push(['post', endpoint]);
        if (failOnSecond && calls.filter(call => call[0] === 'post').length === 2) throw new Error('Falha sintética');
        return { data: { id: String(calls.length), url: `/media/shared/${token}`, expiresAt: new Date(Date.now() + 86400000).toISOString() } };
    },
    async delete(endpoint) { calls.push(['delete', endpoint]); },
};
const originalLoad = Module._load;
Module._load = function (id, parent, ...rest) {
    if (id === '@web/lib/api-client') return { apiClient };
    if (id === '@web/features/maintenance/utils/os-pdf') return { printOsPdf: (data, popup) => { printed = { data, popup }; } };
    if (id === 'sonner') return { toast: { warning() {} } };
    return originalLoad.call(this, id, parent, ...rest);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { printOsPdfWithVideoSharing } = require(path.join(root, 'apps/web/src/features/maintenance/utils/os-pdf-sharing.ts'));
global.window = { location: { origin: 'https://skylineti.com' } };
const attachment = (id, mimeType, fileUrl) => ({ id, fileName: `${id}.mp4`, mimeType, fileUrl });
const data = {
    osNumber: 'TEST', formType: 'SUPORTE_REMOTO', status: 'OPEN', createdAt: '2026-10-06',
    attachments: [attachment('a', 'video/mp4', 'https://api.example.test/media/maintenance/a/file'), attachment('image', 'image/jpeg', 'https://api.example.test/media/maintenance/image/file')],
    followupBlocks: [{ id: 'block', type: 'MEDIA', order: 0, attachments: [attachment('b', 'video/mp4', 'https://api.example.test/media/os-followup/b/file')] }],
};
(async () => {
    const popup = { closed: false, close() { this.closed = true; } };
    await printOsPdfWithVideoSharing(data, true, {}, popup);
    assert.equal(calls.filter(call => call[0] === 'post').length, 2);
    assert.equal(printed.data.attachments[0].fileUrl, `https://skylineti.com/os/video-compartilhado?token=${token}`);
    assert.equal(printed.data.followupBlocks[0].attachments[0].fileUrl, `https://skylineti.com/os/video-compartilhado?token=${token}`);
    assert.equal(printed.data.attachments[1].fileUrl, data.attachments[1].fileUrl);
    assert.equal(printed.popup, popup);
    calls.length = 0;
    printed = undefined;
    await printOsPdfWithVideoSharing(data, false, {}, popup);
    assert.equal(calls.length, 0);
    assert.equal(printed.data.attachments[0].fileUrl, data.attachments[0].fileUrl);
    calls.length = 0;
    printed = undefined;
    failOnSecond = true;
    await printOsPdfWithVideoSharing(data, true, {}, popup);
    assert(printed, 'The PDF must still open if public sharing fails');
    assert.equal(printed.data.attachments[0].fileUrl, '');
    assert.equal(printed.data.followupBlocks[0].attachments[0].fileUrl, '');
    assert(!popup.closed);
    assert.equal(calls.filter(call => call[0] === 'delete').length, 1);
    console.log('PASS: one public link per video, non-manager stays private, share failure still prints PDF and revokes links.');
})().catch(error => { console.error(error); process.exitCode = 1; });
