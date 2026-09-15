// Real browser against the isolated Next production build and disposable Nest/PostgreSQL fixtures.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');

async function buildPrintHarness({ root, scratch, apiRequire }) {
    const ts = apiRequire('typescript');
    const source = fs.readFileSync(path.join(root, 'apps/web/src/app/dashboard/etiquetas/page.tsx'), 'utf8');
    const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let printer;
    function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'openPrintWindow') printer = node.initializer.getText(ast); ts.forEachChild(node, visit); }
    visit(ast); assert(printer);
    const compile = text => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    const template = path.join(scratch, 'print-template.js');
    fs.writeFileSync(template, compile(fs.readFileSync(path.join(root, 'apps/web/src/lib/label-template.ts'), 'utf8')));
    const entry = path.join(scratch, 'print-harness.js');
    fs.writeFileSync(entry, compile(`const { parseTemplate } = require(${JSON.stringify(template)}); const toast = { error: (text) => window.__printErrors.push(text) }; window.runPrintHarness = (activeTemplate) => { const print = ${printer}; const label = document.createElement('div'); label.textContent = '</div><img src=x onerror=window.__xss=1>'; print([label], activeTemplate.columns); };`));
    const webpack = createRequire(apiRequire.resolve('@nestjs/cli/package.json'))('webpack');
    await new Promise((resolve, reject) => webpack({ mode: 'production', devtool: false, target: 'web', entry,
        resolve: { alias: { '@zyllen/shared': path.join(scratch, 'shared/dist/index.js'), zod: apiRequire.resolve('zod') } },
        output: { path: scratch, filename: 'print-harness.bundle.js' },
    }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
    return path.join(scratch, 'print-harness.bundle.js');
}
module.exports = async ({ run, origin, admin, manager, tech, client, owner, os, resources, scratch, root, apiRequire }) => {
    const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
    const { chromium } = require(path.join(runtime, 'node/node_modules/playwright'));
    const next = require.resolve('next/dist/bin/next', { paths: [path.join(root, 'apps/web')] });
    const logs = [];
    const web = spawn(process.execPath, [next, 'start', '-p', '3998', '-H', '127.0.0.1'], { cwd: path.join(scratch, 'web'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
    web.stdout.on('data', chunk => logs.push(chunk.toString())); web.stderr.on('data', chunk => logs.push(chunk.toString()));
    const base = 'http://127.0.0.1:3998';
    let browser;
    const shots = path.join(scratch, 'browser-qa'); fs.mkdirSync(shots, { recursive: true });
    try {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Next preview did not start: ' + logs.join(''))), 20000);
            web.on('exit', code => { clearTimeout(timeout); reject(new Error('Preview exited: ' + code + logs.join(''))); });
            const ready = data => { if (data.toString().includes('Ready in')) { clearTimeout(timeout); resolve(); } };
            web.stdout.on('data', ready);
        });
        browser = await chromium.launch({ executablePath: process.env.AUDIT_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
        const contextFor = async (actor) => {
            const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
            await context.route('**/*', route => {
                const url = new URL(route.request().url());
                return ['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
            });
            if (actor) await context.addInitScript(({ token, type }) => { localStorage.setItem('accessToken', token); localStorage.setItem('userType', type); }, { token: actor.token, type: actor.type });
            return context;
        };
        const fillClientRegistration = async (page, email, newCompany = false) => {
            await page.goto(base + '/cadastro', { waitUntil: 'networkidle' });
            await page.getByPlaceholder('Seu nome completo', { exact: true }).fill('Solicitante QA Confirmacao');
            await page.getByPlaceholder('seu@email.com', { exact: true }).fill(email);
            await page.getByPlaceholder('Mínimo 6 caracteres', { exact: true }).fill('Registration-Test-2026!');
            await page.getByPlaceholder('Repita a senha', { exact: true }).fill('Registration-Test-2026!');
            const select = page.locator('select').filter({ has: page.locator('option[value="__new__"]') });
            if (newCompany) {
                await select.selectOption('__new__');
                await page.getByPlaceholder('Empresa S.A.', { exact: true }).fill('Empresa QA Solicitada');
            } else {
                const companyId = await select.locator('option').evaluateAll(options => options.find(o => o.value && o.value !== '__new__')?.value);
                assert(companyId, 'Existing companies must load in the registration form');
                await select.selectOption(companyId);
                assert.equal(await select.inputValue(), companyId);
            }
        };
        for (const [actor, label] of [[null, 'anonymous'], [admin, 'existing admin session']]) {
            await run(`Browser: client confirmation persists after reload and preserves ${label}`, async () => {
                const context = await contextFor(actor); const page = await context.newPage();
                let submissions = 0;
                page.on('request', r => { if (r.method() === 'POST' && r.url() === origin + '/register/client') submissions++; });
                const email = actor ? 'confirmation-admin@example.test' : 'confirmation-anonymous@example.test';
                try {
                    await fillClientRegistration(page, email, !!actor);
                    const response = page.waitForResponse(r => r.url() === origin + '/register/client' && r.request().method() === 'POST');
                    await page.getByRole('button', { name: 'Criar Conta de Cliente', exact: true }).click();
                    assert.equal((await response).status(), 201);
                    await page.waitForURL(base + '/cadastro/solicitacao-enviada');
                    await page.getByRole('heading', { name: 'Solicitação enviada', exact: true }).waitFor();
                    assert(await page.getByText('Aguardando aprovação', { exact: true }).isVisible());
                    const action = actor ? 'Voltar para minha conta' : 'Ir para o login';
                    await page.getByRole('link', { name: action, exact: true }).waitFor();
                    assert.equal(await page.evaluate(() => localStorage.getItem('accessToken')), actor?.token ?? null);
                    assert.equal(await page.locator('input[type="password"]').count(), 0);
                    assert(!page.url().includes(email));
                    if (actor) await page.getByText(/Sua conta atual continua conectada/).waitFor();
                    const login = await context.request.post(origin + '/clients/login', { data: { email, password: 'Registration-Test-2026!' } });
                    assert.equal(login.status(), 401, 'Pending request must not create a usable login');
                    await page.reload({ waitUntil: 'networkidle' });
                    await page.getByRole('link', { name: action, exact: true }).waitFor();
                    assert.equal(new URL(page.url()).pathname, '/cadastro/solicitacao-enviada');
                    assert.equal(submissions, 1, 'Reload must not resubmit registration');
                    await page.screenshot({ path: path.join(shots, actor ? 'solicitacao-admin-desktop.png' : 'solicitacao-anon-desktop.png'), fullPage: true });
                    await page.setViewportSize({ width: 390, height: 844 });
                    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                    await page.screenshot({ path: path.join(shots, actor ? 'solicitacao-admin-mobile.png' : 'solicitacao-anon-mobile.png'), fullPage: true });
                    await page.getByRole('link', { name: 'Enviar outra solicitação', exact: true }).click();
                    await page.waitForURL(base + '/cadastro');
                    assert.equal(await page.getByPlaceholder('Seu nome completo', { exact: true }).inputValue(), '');
                } finally { await context.close(); }
            });
        }
        await run('Browser: rejected client registration stays on the form, never shows success', async () => {
            const context = await contextFor(); const page = await context.newPage();
            try {
                await context.route(origin + '/register/client', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Solicitação já existente (teste de UI)' } }) }));
                await fillClientRegistration(page, 'confirmation-rejected@example.test');
                await page.getByRole('button', { name: 'Criar Conta de Cliente', exact: true }).click();
                await page.getByText('Solicitação já existente (teste de UI)', { exact: true }).waitFor();
                assert.equal(new URL(page.url()).pathname, '/cadastro');
                assert.equal(await page.getByPlaceholder('seu@email.com', { exact: true }).inputValue(), 'confirmation-rejected@example.test');
                assert.equal(await page.getByRole('heading', { name: 'Solicitação enviada', exact: true }).count(), 0);
            } finally { await context.close(); }
        });
        await run('Browser: partner registration still creates an active account and returns to login', async () => {
            const context = await contextFor(); const page = await context.newPage();
            try {
                await page.goto(base + '/cadastro?tab=contractor', { waitUntil: 'networkidle' });
                await page.getByPlaceholder('Seu nome completo', { exact: true }).fill('Parceiro QA Confirmacao');
                await page.getByPlaceholder('seu@email.com', { exact: true }).fill('partner-confirmation@example.test');
                await page.getByPlaceholder('000.000.000-00', { exact: true }).fill('52998224725');
                await page.getByPlaceholder('Mínimo 6 caracteres', { exact: true }).fill('Registration-Test-2026!');
                await page.getByPlaceholder('Repita a senha', { exact: true }).fill('Registration-Test-2026!');
                const response = page.waitForResponse(r => r.url() === origin + '/register/contractor' && r.request().method() === 'POST');
                await page.getByRole('button', { name: 'Criar Conta de Parceiro', exact: true }).click();
                assert.equal((await response).status(), 201);
                await page.waitForURL(base + '/?type=contractor');
                assert.equal(await page.evaluate(() => localStorage.getItem('accessToken')), null, 'Registration does not sign in automatically');
                const login = await context.request.post(origin + '/register/contractor/login', { data: { email: 'partner-confirmation@example.test', password: 'Registration-Test-2026!' } });
                assert.equal(login.status(), 200);
            } finally { await context.close(); }
        });
        await run('Browser A11: real label parser/printer rejects malicious dimensions and prints escaped text without scripts', async () => {
            const bundle = await buildPrintHarness({ root, scratch, apiRequire });
            const context = await contextFor(); const page = await context.newPage();
            try {
                await page.goto(base);
                await page.evaluate(() => {
                    window.__printErrors = []; window.__printed = 0; window.__xss = 0;
                    const open = window.open.bind(window);
                    window.open = (...args) => { const popup = open(...args); if (popup) popup.print = () => { window.__printed++; }; return popup; };
                });
                await page.addScriptTag({ path: bundle });
                const popupPromise = page.waitForEvent('popup');
                await page.evaluate(() => window.runPrintHarness({ name: 'Seguro', widthMm: 50, heightMm: 30, columns: 1, elements: [] }));
                const popup = await popupPromise;
                await page.waitForFunction(() => window.__printed === 1);
                assert.equal(await popup.locator('script').count(), 0);
                assert.equal(await popup.locator('.sheet').innerText(), '</div><img src=x onerror=window.__xss=1>');
                assert.equal(await popup.evaluate(() => window.opener), null);
                await page.evaluate(() => window.runPrintHarness({ name: 'Malicioso', widthMm: 50, heightMm: '30</style><script>window.__xss=1</script>', columns: 1, elements: [] }));
                assert.equal(await page.evaluate(() => window.__printErrors.length), 1);
                assert.equal(await page.evaluate(() => window.__xss), 0);
                assert.equal(await page.evaluate(() => window.__printed), 1);
                await popup.screenshot({ path: path.join(shots, 'etiqueta-html-segura.png') });
            } finally { await context.close(); }
        });
        await run('Browser: approval screen, explicit company confirmation, successful manager approval', async () => {
            const context = await contextFor(manager); const page = await context.newPage();
            try {
                await page.goto(base + '/dashboard/aprovacao-clientes');
                await page.getByText('Solicitante QA Navegador', { exact: true }).waitFor();
                await page.getByRole('button', { name: 'Analisar solicitação' }).first().click();
                const dialog = page.getByRole('dialog');
                assert.equal(await dialog.evaluate(el => getComputedStyle(el).position), 'relative', 'Tailwind must be present in the isolated build');
                assert.equal(await dialog.getByRole('button', { name: 'Aprovar acesso', exact: true }).isEnabled(), false);
                await dialog.getByLabel('Conferi a identidade e autorizo acesso aos dados desta empresa.').check();
                await page.screenshot({ path: path.join(shots, 'aprovacao-desktop.png'), fullPage: true });
                await dialog.getByRole('button', { name: 'Aprovar acesso', exact: true }).click();
                await dialog.waitFor({ state: 'hidden' });
                await page.getByText('Solicitante QA Navegador', { exact: true }).waitFor({ state: 'hidden' });
            } finally { await context.close(); }
        });
        await run('Browser: non-manager cannot see/use client approval page', async () => {
            const context = await contextFor(tech); const page = await context.newPage();
            try { await page.goto(base + '/dashboard/aprovacao-clientes'); await page.getByText('Esta área é restrita a Administrador e Gestor.').waitFor(); assert.equal(await page.getByRole('button', { name: 'Analisar solicitação' }).count(), 0); }
            finally { await context.close(); }
        });
        await run('Browser: authenticated image cookie works; external share UI creates and revokes anonymous access', async () => {
            const context = await contextFor(admin); const page = await context.newPage(); const anonymous = await contextFor();
            try {
                await page.goto(base + '/dashboard/manutencao');
                await page.getByText('Cliente QA Assinatura', { exact: true }).first().click();
                await page.getByRole('button', { name: 'Compartilhar', exact: true }).first().waitFor();
                await page.waitForFunction(() => [...document.images].some(img => img.src.includes('/media/maintenance/') && img.complete && img.naturalWidth > 0));
                const cookies = await context.cookies(origin + '/media'); assert(cookies.some(c => c.name === 'zyllen_media' && c.httpOnly && c.path === '/media'));
                const privateFile = `${origin}/media/maintenance/${resources[0][1].id}/file`;
                assert.equal((await anonymous.request.get(privateFile)).status(), 401);
                await page.getByRole('button', { name: 'Compartilhar', exact: true }).first().click();
                const dialog = page.getByRole('dialog');
                await dialog.getByLabel('Autorizo o acesso de quem receber este link.').check();
                await dialog.getByRole('button', { name: 'Criar link por 24 horas' }).click();
                const urlInput = dialog.getByLabel('Link criado (copie antes de fechar)');
                await urlInput.waitFor(); const url = await urlInput.inputValue();
                assert.equal((await anonymous.request.get(url)).status(), 200);
                await page.screenshot({ path: path.join(shots, 'compartilhamento-desktop.png'), fullPage: true });
                await dialog.getByRole('button', { name: 'Revogar', exact: true }).first().click();
                await urlInput.waitFor({ state: 'hidden' });
                assert.equal((await anonymous.request.get(url)).status(), 404);
                await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
                await page.setViewportSize({ width: 390, height: 844 });
                await page.screenshot({ path: path.join(shots, 'os-mobile.png'), fullPage: true });
            } catch (error) {
                await page.screenshot({ path: path.join(shots, 'share-failure.png'), fullPage: true });
                fs.writeFileSync(path.join(shots, 'share-failure.txt'), (await page.locator('body').innerText()).slice(0, 12000));
                throw error;
            } finally { await context.close(); await anonymous.close(); }
        });
        for (const [actor, portal] of [[client, 'portal-cliente'], [owner, 'portal-terceirizado']]) await run(`Browser: ${portal} can view its image, no share control or signed-form edit`, async () => {
            const context = await contextFor(actor); const page = await context.newPage();
            try {
                await page.goto(`${base}/${portal}/manutencao`);
                await page.getByText(portal === 'portal-cliente' ? os.osNumber : 'Cliente QA Assinatura', { exact: true }).first().click();
                await page.waitForFunction(() => [...document.images].some(img => img.src.includes('/media/') && img.complete && img.naturalWidth > 0));
                assert.equal(await page.getByRole('button', { name: 'Compartilhar', exact: true }).count(), 0);
                assert.equal(await page.getByRole('button', { name: 'Editar', exact: true }).count(), 0);
                await page.screenshot({ path: path.join(shots, `${portal}.png`), fullPage: true });
            } catch(error) { fs.writeFileSync(path.join(shots, `${portal}-failure.txt`), (await page.locator('body').innerText()).slice(0, 12000)); throw error; }
            finally { await context.close(); }
        });
    } finally {
        if (browser) await browser.close();
        web.kill(); // Only the test process created above, never the production API.
        fs.writeFileSync(path.join(shots, 'next-preview.log'), logs.join(''));
    }
};
