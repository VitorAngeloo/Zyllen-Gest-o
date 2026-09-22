/* Followup creation with synthetic responses only; the shared database is untouched. */
const assert = require('node:assert/strict');
const path = require('node:path');
const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));

module.exports = async ({ run, browser, base }) => {
    await run('Followups: technician searches a client, selects its project and creates a followup', async () => {
        const company = { id: 'followup-company-qa', name: 'Santa Inês QA', cnpj: '00000000000000' };
        const project = { id: 'followup-project-qa', name: 'Sala principal QA' };
        const requests = [], errors = [];
        const context = await browser.newContext();
        try {
            await context.addInitScript(() => { localStorage.setItem('accessToken', 'synthetic-followups'); localStorage.setItem('userType', 'internal'); });
            await context.route('**/*', async route => {
                const request = route.request(), url = new URL(request.url());
                if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return route.abort();
                if (url.port !== '3999') return route.continue();
                const body = request.postData() ? request.postDataJSON() : undefined;
                requests.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), method: request.method(), body });
                const respond = (payload, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }, body: JSON.stringify(payload) });
                if (request.method() === 'OPTIONS') return respond({});
                if (url.pathname === '/auth/me') return respond({ data: { id: 'technician-qa', type: 'internal', name: 'Técnico QA', role: { id: 'technician-role-qa', name: 'Técnico' } } });
                if (url.pathname === '/auth/me/permissions') return respond({ data: ['dashboard.view', 'followups.view', 'followups.create'] });
                if (url.pathname === '/tickets/my-internal/pending-rating') return respond({ data: null });
                if (url.pathname === '/followups' && request.method() === 'GET') return respond({ data: [], total: 0 });
                if (url.pathname === '/clients/companies/search') return respond({ data: company.name.toLocaleLowerCase('pt-BR').includes((url.searchParams.get('q') || '').toLocaleLowerCase('pt-BR')) ? [company] : [] });
                if (url.pathname === `/clients/companies/${company.id}/projects-public`) return respond({ data: [project] });
                if (url.pathname === '/followups' && request.method() === 'POST') return respond({ data: { id: 'followup-qa', code: 'AC-0001', status: 'IN_PROGRESS', company, project, blocks: [], createdBy: { id: 'technician-qa', name: 'Técnico QA' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }, 201);
                if (url.pathname === '/followups/followup-qa') return respond({ data: { id: 'followup-qa', code: 'AC-0001', status: 'IN_PROGRESS', company, project, blocks: [], createdBy: { id: 'technician-qa', name: 'Técnico QA' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } });
                return respond({ error: { message: 'Rota não prevista no cenário QA' } }, 403);
            });
            const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
            await page.goto(base + '/dashboard/acompanhamento');
            await page.getByRole('button', { name: 'Novo Acompanhamento', exact: true }).click();
            await page.getByRole('textbox', { name: 'Buscar cliente' }).fill('Santa Inês');
            await expect(page.getByRole('button', { name: /Santa Inês QA/ })).toBeVisible();
            assert(requests.some(row => row.path === '/clients/companies/search' && row.query.q === 'Santa Inês'));
            assert(!requests.some(row => row.path === '/clients/companies'));
            await page.getByRole('button', { name: /Santa Inês QA/ }).click();
            await expect(page.getByText(company.name, { exact: true })).toBeVisible();
            await expect(page.getByRole('combobox')).toContainText('Sala principal QA');
            await page.getByRole('combobox').selectOption(project.id);
            await page.getByRole('button', { name: 'Criar Acompanhamento', exact: true }).click();
            await expect.poll(() => requests.find(row => row.path === '/followups' && row.method === 'POST')).toBeTruthy();
            const created = requests.find(row => row.path === '/followups' && row.method === 'POST');
            assert.equal(created.body.companyId, company.id); assert.equal(created.body.projectId, project.id);
            assert(requests.some(row => row.path.endsWith('/projects-public')));
            assert(!requests.some(row => row.path.endsWith('/projects')));
            assert.deepEqual(errors, []);
        } finally { await context.close(); }
    });
};
