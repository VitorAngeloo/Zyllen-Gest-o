/* Synthetic registration and approval flows only; the shared API and database are untouched. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');

const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const { chromium } = require(path.join(runtime, 'node/node_modules/playwright'));
const root = path.resolve(__dirname, '../..');
const artifact = process.env.AUDIT_ARTIFACT_DIR || 'tmp/architecture-validation';
const web = path.resolve(root, artifact, 'web');
const apiBuild = path.resolve(root, artifact, 'api-build');
const next = require.resolve('next/dist/bin/next', { paths: [path.join(root, 'apps/web')] });
const base = process.env.AUDIT_WEB_BASE || 'http://127.0.0.1:3995';
const server = process.env.AUDIT_WEB_BASE ? null : spawn(process.execPath, [next, 'start', '-p', '3995'], {
    cwd: web,
    windowsHide: true,
    stdio: 'ignore',
});

const company = { id: 'b245ac8e-b90d-47f7-bb8d-d262ff1bf53f', name: 'Empresa Completa QA', cnpj: '00000000000100' };
const request = {
    id: '2ee75abc-7cc3-48dd-942f-7ec478a7be9d',
    name: 'Cliente Empresa QA',
    email: 'cliente.empresa.qa@example.test',
    companyId: company.id,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
};

async function waitForServer() {
    for (let attempt = 0; attempt < 60; attempt++) {
        if (await fetch(base).then(response => response.ok).catch(() => false)) return;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`Web server did not become ready at ${base}`);
}

async function routeSyntheticApi(context, calls) {
    await context.route('**/*', async route => {
        const browserRequest = route.request();
        const url = new URL(browserRequest.url());
        if (url.origin === base) return route.continue();
        if (!['http://127.0.0.1:3999', 'https://api.skylineti.com'].includes(url.origin)) return route.abort();
        const headers = {
            'access-control-allow-origin': base,
            'access-control-allow-credentials': 'true',
            'access-control-allow-headers': 'authorization,content-type',
            'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
        };
        const respond = (body, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
        if (browserRequest.method() === 'OPTIONS') return respond({});
        const body = browserRequest.postData() ? browserRequest.postDataJSON() : undefined;
        calls.push({ path: url.pathname, method: browserRequest.method(), body });
        if (url.pathname === '/clients/companies/search') return respond({ data: [company] });
        if (url.pathname === '/register/client' && browserRequest.method() === 'POST') return respond({ status: 'PENDING', message: 'Solicitação enviada' }, 201);
        if (url.pathname === '/auth/me') return respond({ data: { id: 'admin-qa', name: 'Administrador QA', email: 'admin.qa@example.test', type: 'internal', role: { id: 'role-admin', name: 'Administrador' } } });
        if (url.pathname === '/auth/me/permissions') return respond({ data: ['dashboard.view', 'settings.view', 'settings.manage'] });
        if (url.pathname === '/tickets/my-internal/pending-rating') return respond({ data: null });
        if (url.pathname === '/register/client-requests' && browserRequest.method() === 'GET') return respond({ data: [request], total: 1, page: 1, limit: 25 });
        if (url.pathname === `/register/client-requests/${request.id}/approve` && browserRequest.method() === 'POST') return respond({ data: { id: 'external-user-qa', name: request.name, email: request.email }, message: 'Cliente aprovado' }, 201);
        return respond({ data: null });
    });
}

async function verifyPublicRegistration(browser) {
    const calls = [];
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
        await routeSyntheticApi(context, calls);
        const page = await context.newPage();
        await page.goto(`${base}/cadastro`);
        await page.getByPlaceholder('Seu nome completo').fill(request.name);
        await page.getByPlaceholder('seu@email.com').fill(request.email);
        const companySelect = page.locator('select', { hasText: company.name });
        await companySelect.selectOption(company.id);
        assert.equal(await page.getByText('Projeto', { exact: true }).count(), 0, 'Public registration must not render a project field');
        await page.getByPlaceholder('Mínimo 6 caracteres').fill('senha-qa');
        await page.getByPlaceholder('Repita a senha').fill('senha-qa');
        await page.getByRole('button', { name: 'Criar Conta de Cliente', exact: true }).click();
        await page.getByText('Solicitação enviada', { exact: false }).first().waitFor();
        const submitted = calls.find(call => call.path === '/register/client' && call.method === 'POST');
        assert(submitted, 'Registration request was not sent');
        assert.equal(submitted.body.companyId, company.id);
        assert.equal(Object.hasOwn(submitted.body, 'projectId'), false, 'Registration payload must not contain projectId');
        assert.equal(calls.some(call => call.path.includes('/projects-public')), false, 'Registration must not load company projects');
    } finally {
        await context.close();
    }
}

async function verifyApproval(browser) {
    const calls = [];
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    try {
        await context.addInitScript(() => {
            localStorage.setItem('accessToken', 'synthetic-admin');
            localStorage.setItem('userType', 'internal');
        });
        await routeSyntheticApi(context, calls);
        const page = await context.newPage();
        await page.goto(`${base}/dashboard/aprovacao-clientes`);
        await page.getByRole('button', { name: 'Analisar solicitação', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Autorizar cliente' });
        assert.equal(await dialog.getByText('Projeto (opcional)', { exact: true }).count(), 0, 'Approval must not render a project field');
        await dialog.getByLabel(/Conferi a identidade/).check();
        await dialog.getByRole('button', { name: 'Aprovar acesso', exact: true }).click();
        await page.getByText('Cliente aprovado', { exact: false }).first().waitFor();
        const approved = calls.find(call => call.path === `/register/client-requests/${request.id}/approve` && call.method === 'POST');
        assert(approved, 'Approval request was not sent');
        assert.deepEqual(approved.body, { companyId: company.id });
        assert.equal(calls.some(call => call.path.includes('/projects-public')), false, 'Approval must not load company projects');
    } finally {
        await context.close();
    }
}

async function verifyApiCompanyScope() {
    const servicePath = path.join(apiBuild, 'apps/api/src/modules/registration/registration.service.js');
    const { RegistrationService } = require(servicePath);
    const createdUsers = [];
    const audits = [];
    const tx = {
        clientRegistrationRequest: {
            findUnique: async () => ({ ...request, passwordHash: 'hash', projectId: 'legacy-project-id' }),
            updateMany: async () => ({ count: 1 }),
            update: async () => ({}),
        },
        company: { findUnique: async () => company },
        externalUser: { create: async input => { createdUsers.push(input.data); return { id: 'external-user-qa', name: request.name, email: request.email }; } },
        auditLog: { create: async input => { audits.push(input.data); return input.data; } },
    };
    const prisma = { $transaction: callback => callback(tx) };
    const service = new RegistrationService(prisma, {});
    await service.approveClient(request.id, 'admin-qa', { companyId: company.id });
    assert.equal(createdUsers.length, 1);
    assert.equal(createdUsers[0].companyId, company.id);
    assert.equal(createdUsers[0].projectId, null, 'Approved public clients must receive company-wide scope');
    assert.equal(audits[0].details.accessScope, 'COMPANY');
    assert.equal(Object.hasOwn(audits[0].details, 'projectId'), false);
}

(async () => {
    let browser;
    try {
        await waitForServer();
        browser = await chromium.launch({ channel: 'chrome', headless: true });
        await verifyPublicRegistration(browser);
        await verifyApproval(browser);
        await verifyApiCompanyScope();
        console.log('PASS: client registration and approval grant company-wide access without a project selector.');
    } finally {
        if (browser) await browser.close();
        server?.kill();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
