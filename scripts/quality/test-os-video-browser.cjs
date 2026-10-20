// Synthetic auth/media only; never connects to the shared API or database.
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const { chromium } = require(path.join(runtime, 'node/node_modules/playwright'));
const root = path.resolve(__dirname, '../..');
const web = path.resolve(root, process.env.AUDIT_ARTIFACT_DIR || 'tmp/os-video-release/tmp/architecture-validation', 'web');
const next = require.resolve('next/dist/bin/next', { paths: [path.join(root, 'apps/web')] });
const base = process.env.AUDIT_WEB_BASE || 'http://127.0.0.1:3997';
const server = process.env.AUDIT_WEB_BASE ? null : spawn(process.execPath, [next, 'start', '-p', '3997'], { cwd: web, windowsHide: true, stdio: 'ignore' });
(async () => {
    let browser;
    try {
        for (let i = 0; i < 60; i++) {
            if (await fetch(base).then(r => r.ok).catch(() => false)) break;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        browser = await chromium.launch({ channel: 'chrome', headless: true });
        for (const type of process.env.AUDIT_WEB_BASE ? [] : ['internal', 'external', 'contractor']) {
            const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
            const user = { id: 'fixture-user', name: 'Test', email: 'test@example.test', type };
            let mediaRequests = 0;
            let sessionRequests = 0;
            await context.route('**/*', async route => {
                const url = new URL(route.request().url());
                if (url.origin === base) return route.continue();
                if (url.origin !== 'http://127.0.0.1:3999') return route.abort();
                const headers = { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'authorization,content-type' };
                if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
                if (url.pathname.startsWith('/media/')) {
                    mediaRequests++;
                    assert(sessionRequests > 0, 'Session must be renewed before requesting media');
                    return route.fulfill({ status: 403, headers, json: { error: { message: 'Sem acesso' } } });
                }
                if (url.pathname.endsWith('/login')) return route.fulfill({ headers, json: { accessToken: 'fixture', refreshToken: 'fixture-refresh', user } });
                if (url.pathname === '/auth/me') { sessionRequests++; return route.fulfill({ headers, json: { data: user } }); }
                if (url.pathname === '/auth/me/permissions') return route.fulfill({ headers, json: { data: [] } });
                return route.abort();
            });
            const page = await context.newPage();
            const target = `${base}/os/video?kind=os-followup&id=fixture-video&type=${type}`;
            await page.goto(target);
            await page.locator('input[type=email]').waitFor();
            assert.equal(mediaRequests, 0);
            await page.locator('input[type=email]').fill(user.email);
            await page.locator('input[type=password]').fill('fixture-password');
            await page.locator('button[type=submit]').click();
            await page.getByRole('alert').filter({ hasText: 'Não foi possível abrir o vídeo' }).waitFor();
            assert.equal(page.url(), target, 'Login must preserve the video destination');
            assert(mediaRequests > 0);
            await page.goto(`${base}/os/video?kind=ticket&id=fixture`);
            await page.getByText('Link de vídeo inválido.').waitFor();
            await context.close();
        }
        const mediaPage = await browser.newPage();
        await mediaPage.goto('data:text/html,<title>Synthetic video fixture</title>');
        await mediaPage.bringToFront();
        const base64 = await mediaPage.evaluate(async () => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 16;
            document.body.append(canvas);
            const context = canvas.getContext('2d');
            context.fillStyle = 'red';
            context.fillRect(0, 0, 16, 16);
            const stream = canvas.captureStream(10);
            const track = stream.getVideoTracks()[0];
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
            const chunks = [];
            recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
            const stopped = new Promise(resolve => { recorder.onstop = resolve; });
            const started = new Promise(resolve => { recorder.onstart = resolve; });
            recorder.start(200);
            await started;
            for (const color of ['red', 'blue', 'green', 'red', 'blue', 'green', 'red', 'blue', 'green', 'red']) {
                context.fillStyle = color;
                context.fillRect(0, 0, 16, 16);
                track.requestFrame();
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            recorder.stop();
            await stopped;
            track.stop();
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(new Blob(chunks));
            });
        });
        await mediaPage.close();
        const bytes = Buffer.from(base64, 'base64');
        assert(bytes.includes(Buffer.from([0x1f, 0x43, 0xb6, 0x75])), 'Synthetic video must contain encoded frames');
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        let sharedRequests = 0;
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.pathname === `/media/shared/${'A'.repeat(43)}`) {
                sharedRequests++;
                return route.fulfill({ status: 200, contentType: 'video/webm', headers: {
                    'content-security-policy': "default-src 'none'; sandbox; frame-ancestors 'none'",
                    'content-disposition': 'inline; filename="synthetic.webm"',
                    'x-content-type-options': 'nosniff',
                }, body: bytes });
            }
            if (url.origin === base) return route.continue();
            return route.abort();
        });
        const page = await context.newPage();
        const response = await page.goto(`${base}/os/video-compartilhado?token=${'A'.repeat(43)}`);
        assert.equal(response.status(), 200);
        assert.equal(await response.headerValue('referrer-policy'), 'no-referrer');
        await page.locator('video').waitFor();
        if (process.env.AUDIT_WEB_BASE) {
            assert.equal(new URL(await page.locator('video').getAttribute('src')).origin, 'https://api.skylineti.com');
        }
        await page.locator('video').evaluate(video => video.play());
        await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2, null, { timeout: 10000 });
        assert(sharedRequests > 0, 'Public video must request the shared media URL');
        await page.goto(`${base}/os/video-compartilhado?token=invalid`);
        await page.getByText('Link de vídeo inválido.').waitFor();
        await context.close();
        console.log(process.env.AUDIT_WEB_BASE
            ? 'PASS: published public viewer plays synthetic shared video without login under current API CSP.'
            : 'PASS: private OS videos retain login; public viewer plays synthetic shared video without login under current API CSP.');
    } finally {
        if (browser) await browser.close();
        server?.kill();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
