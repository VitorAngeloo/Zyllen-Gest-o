// Real upload storage and frontend limits, with synthetic bytes and no database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const Module = require('node:module');
const root = path.resolve(__dirname, '../..');
const scratch = path.resolve(root, process.env.AUDIT_ARTIFACT_DIR || 'tmp/architecture-validation');
if (path.dirname(scratch) !== path.join(root, 'tmp')) throw new Error('Use a direct child of tmp');
const shared = require(path.join(scratch, 'shared/dist'));
assert.equal(shared.OS_ATTACHMENT_VIDEO_MAX_BYTES, 150 * 1024 * 1024);
process.env.TS_NODE_PROJECT = path.join(root, 'apps/api/tsconfig.json');
require(require.resolve('ts-node/register/transpile-only', { paths: [path.join(root, 'apps/api')] }));
const { verifiedMediaStorage } = require(path.join(root, 'apps/api/src/infrastructure/storage/verified-media-storage.ts'));
const originalLoad = Module._load;
const frontendPath = path.join(root, 'apps/web/src/features/maintenance/utils/maintenance-attachments.ts');
function frontend() {
    Module._load = function (id, parent, ...rest) {
        if (id === '@zyllen/shared') return shared;
        if (id === '@web/features/maintenance/api/maintenance-api') return { maintenanceApi: {} };
        return originalLoad.call(this, id, parent, ...rest);
    };
    try { delete require.cache[frontendPath]; return require(frontendPath); }
    finally { Module._load = originalLoad; }
}
const originalVideoLimit = process.env.NEXT_PUBLIC_OS_VIDEO_MAX_MB;
delete process.env.NEXT_PUBLIC_OS_VIDEO_MAX_MB;
const { validateMaintenanceAttachment } = frontend();
const directory = fs.mkdtempSync(path.join(scratch, 'media-limit-'));
const storage = verifiedMediaStorage(directory, false, {
    imageBytes: shared.OS_ATTACHMENT_IMAGE_MAX_BYTES,
    videoBytes: shared.OS_ATTACHMENT_VIDEO_MAX_BYTES,
});
const mp4 = Buffer.from('00000018667479706d7034320000000000', 'hex');
const jpeg = Buffer.from('ffd8ffe000104a4649460001010000010000010000', 'hex');
let passed = 0;
async function upload(header, size) {
    const padding = Buffer.alloc(1024 * 1024);
    const stream = Readable.from((async function* () {
        yield header;
        for (let left = size - header.length; left > 0; left -= padding.length) {
            yield padding.subarray(0, Math.min(left, padding.length));
        }
    })());
    return new Promise((resolve, reject) => storage._handleFile({}, {
        stream, originalname: 'synthetic.html', mimetype: 'text/html',
    }, (error, file) => error ? reject(error) : resolve(file)));
}
async function run(name, work) {
    await work(); passed++;
    assert.equal(fs.readdirSync(directory).length, 0, 'Upload must not leave temporary files');
    console.log('PASS: ' + name);
}
(async () => {
    for (const megabytes of [81, 150]) {
        await run(`${megabytes} MB video accepted and classified from bytes`, async () => {
            const file = await upload(mp4, megabytes * 1024 * 1024);
            assert.equal(file.mimetype, 'video/mp4');
            assert.equal(path.extname(file.filename), '.mp4');
            assert.equal(file.size, megabytes * 1024 * 1024);
            fs.unlinkSync(file.path);
        });
    }
    await run('video above 150 MB rejected and temporary file removed', async () => {
        await assert.rejects(upload(mp4, shared.OS_ATTACHMENT_VIDEO_MAX_BYTES + 1), /limite/);
    });
    await run('photo above 20 MB rejected without accepting the video limit', async () => {
        await assert.rejects(upload(jpeg, shared.OS_ATTACHMENT_IMAGE_MAX_BYTES + 1), /20 MB/);
    });
    await run('forged media content rejected', async () => {
        const html = Buffer.from('<html>synthetic invalid upload</html>');
        await assert.rejects(upload(html, html.length), /Conteúdo inválido/);
    });
    await run('frontend agrees with API at the photo and video boundaries', async () => {
        const video = { name: 'fixture.mp4', type: 'video/mp4', size: shared.OS_ATTACHMENT_VIDEO_MAX_BYTES };
        assert.equal(validateMaintenanceAttachment(video), null);
        assert.match(validateMaintenanceAttachment({ ...video, size: video.size + 1 }), /150 MB/);
        assert.match(validateMaintenanceAttachment({ name: 'fixture.jpg', type: 'image/jpeg', size: 21 * 1024 * 1024 }), /20 MB/);
    });
    await run('deployment ceiling keeps the published UI compatible with an 80 MB API', async () => {
        process.env.NEXT_PUBLIC_OS_VIDEO_MAX_MB = '80';
        const configured = frontend();
        assert.equal(configured.OS_ATTACHMENT_EFFECTIVE_VIDEO_MAX_BYTES, 80 * 1024 * 1024);
        assert.equal(configured.validateMaintenanceAttachment({ name: 'fixture.mp4', type: 'video/mp4', size: 80 * 1024 * 1024 }), null);
        assert.match(configured.validateMaintenanceAttachment({ name: 'fixture.mp4', type: 'video/mp4', size: 81 * 1024 * 1024 }), /80 MB/);
        process.env.NEXT_PUBLIC_OS_VIDEO_MAX_MB = '999';
        assert.equal(frontend().OS_ATTACHMENT_EFFECTIVE_VIDEO_MAX_BYTES, shared.OS_ATTACHMENT_VIDEO_MAX_BYTES);
    });
    console.log(`Maintenance media: ${passed}/${passed} passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
    if (originalVideoLimit === undefined) delete process.env.NEXT_PUBLIC_OS_VIDEO_MAX_MB;
    else process.env.NEXT_PUBLIC_OS_VIDEO_MAX_MB = originalVideoLimit;
    if (path.dirname(directory) !== scratch || !path.basename(directory).startsWith('media-limit-')) throw new Error('Unsafe cleanup');
    fs.rmSync(directory, { recursive: true, force: true });
});
