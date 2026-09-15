/* Public production browser smoke test. Never submits forms or uses customer sessions. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const { chromium } = require(path.join(runtime, 'node/node_modules/playwright'));
const result = { checkedAt: new Date().toISOString(), scope: 'public pages, anonymous redirect and read-only CORS; no form submission or customer login', checks: [] };
async function main() {
    const browser = await chromium.launch({ executablePath: process.env.AUDIT_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        await context.route('**/*', route => {
            const request = route.request();
            const allowed = ['skylineti.com', 'www.skylineti.com', 'api.skylineti.com'].includes(new URL(request.url()).hostname);
            return allowed && ['GET', 'HEAD', 'OPTIONS'].includes(request.method()) ? route.continue() : route.abort();
        });
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', () => pageErrors.push('uncaught browser error'));
        assert.equal((await page.goto('https://skylineti.com', { waitUntil: 'networkidle' })).status(), 200);
        await page.locator('input[type="email"]').waitFor({ state: 'visible' });
        assert(await page.locator('input[type="password"]').isVisible());
        result.checks.push('login page rendered with email/password inputs');
        const status = await page.evaluate(async () => (await fetch('https://api.skylineti.com/health', { credentials: 'include' })).status);
        assert.equal(status, 200);
        result.checks.push('browser can reach production API with credentials (CORS)');
        const shots = path.join(root, 'tmp/security-tests/production-qa');
        fs.mkdirSync(shots, { recursive: true });
        await page.screenshot({ path: path.join(shots, 'login-desktop.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
        await page.screenshot({ path: path.join(shots, 'login-mobile.png'), fullPage: true });
        result.checks.push('mobile login has no horizontal overflow');
        await page.goto('https://skylineti.com/cadastro', { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: 'Criar Conta de Cliente', exact: true }).waitFor({ state: 'visible' });
        result.checks.push('client registration page rendered (not submitted)');
        await page.goto('https://skylineti.com/dashboard/aprovacao-clientes', { waitUntil: 'networkidle' });
        await page.waitForURL(url => url.pathname === '/');
        result.checks.push('anonymous client-approval navigation redirects to login');
        assert.equal(pageErrors.length, 0);
        result.checks.push('no uncaught JavaScript errors during these checks');
        result.passed = result.checks.length;
        result.failed = 0;
    } finally { await browser.close(); }
    fs.writeFileSync(path.join(__dirname, 'web-production-verification.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error('Public production browser check failed:', error.message); process.exitCode = 1; });
