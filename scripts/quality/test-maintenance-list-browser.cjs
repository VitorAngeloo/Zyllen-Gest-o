const assert = require('node:assert/strict');
const path = require('node:path');
const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));

module.exports = async ({ run, browser, base, fixedNow }) => {
    const orders = Array.from({ length: 115 }, (_, index) => ({
        id: `os-${index}`, osNumber: `OS-QA-${String(index).padStart(4, '0')}`,
        status: index === 40 ? 'IN_PROGRESS' : 'OPEN', formType: 'INSTALACAO_SALA',
        clientName: index === 40 ? 'Santa Ines QA' : `Cliente QA ${index}`,
        createdAt: new Date(fixedNow - index * 60_000).toISOString(),
        openedById: index === 0 ? 'user-qa' : 'another-user-qa', openedByContractorId: null,
        openedBy: { name: 'Colaborador QA' }, openedByContractor: null, asset: null, project: null,
    }));

    async function setup(role, route) {
        const requests = [], errors = [];
        const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
        await context.addInitScript(() => { localStorage.setItem('accessToken', 'synthetic-os-qa'); localStorage.setItem('userType', 'internal'); });
        await context.route('**/*', async interception => {
            const request = interception.request(), url = new URL(request.url());
            if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return interception.abort();
            if (url.port !== '3999') return interception.continue();
            requests.push({ path: url.pathname, query: Object.fromEntries(url.searchParams) });
            const respond = payload => interception.fulfill({ status: 200, contentType: 'application/json', headers: {
                'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,OPTIONS',
            }, body: JSON.stringify(payload) });
            if (request.method() === 'OPTIONS') return respond({});
            if (url.pathname === '/auth/me') return respond({ data: { id: 'user-qa', name: 'Usuário QA', email: 'qa@example.test', type: 'internal', role: { id: 'role-qa', name: role } } });
            if (url.pathname === '/auth/me/permissions') return respond({ data: ['dashboard.view', 'maintenance.view'] });
            if (url.pathname === '/tickets/my-internal/pending-rating') return respond({ data: null });
            if (url.pathname === '/maintenance' || url.pathname === '/maintenance/my-orders') {
                let filtered = orders.filter(os => url.pathname !== '/maintenance/my-orders' || os.openedById === 'user-qa');
                const origin = url.searchParams.get('origin'), status = url.searchParams.get('status'), search = url.searchParams.get('search')?.toLowerCase();
                if (origin === 'INTERNAL') filtered = filtered.filter(os => os.openedById && !os.openedByContractorId);
                if (origin === 'CONTRACTOR') filtered = filtered.filter(os => os.openedByContractorId);
                if (status) filtered = filtered.filter(os => os.status === status);
                if (search) filtered = filtered.filter(os => `${os.osNumber} ${os.clientName}`.toLowerCase().includes(search));
                const page = Number(url.searchParams.get('page') || 1), limit = Number(url.searchParams.get('limit') || 20);
                return respond({ data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit });
            }
            return respond({ data: [] });
        });
        const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + route);
        return { context, page, requests, errors };
    }

    await run('Gestor without access.manage sees every OS, including older Santa Ines, with search and later pages', async () => {
        const s = await setup('Gestor', '/dashboard/minhas-os');
        try {
            await expect(s.page.getByRole('button', { name: 'Todas as OS' })).toHaveAttribute('aria-pressed', 'true');
            await expect(s.page.getByText('Santa Ines QA')).toBeVisible();
            await expect(s.page.getByRole('navigation', { name: 'Páginas de ordens de serviço' })).toContainText('115 OS');
            assert(s.requests.some(r => r.path === '/maintenance' && r.query.limit === '50'));
            const pagination = s.page.getByRole('navigation', { name: 'Páginas de ordens de serviço' });
            await pagination.getByRole('button', { name: 'Próxima' }).click();
            await pagination.getByRole('button', { name: 'Próxima' }).click();
            await expect(s.page.getByRole('button', { name: 'Abrir detalhes da OS OS-QA-0114' })).toBeVisible();
            await s.page.getByRole('textbox', { name: 'Buscar OS por número, cliente ou projeto' }).fill('Santa Ines');
            await s.page.getByRole('button', { name: 'Buscar' }).click();
            await expect(s.page.getByText('Santa Ines QA')).toBeVisible();
            await expect(s.page.getByText('OS-QA-0114')).toHaveCount(0);
            assert(s.requests.some(r => r.path === '/maintenance' && r.query.search === 'Santa Ines' && r.query.page === '1'));
            assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });

    await run('Administrador sees all OS and technician remains in their own OS scope', async () => {
        const admin = await setup('Administrador', '/dashboard/minhas-os');
        try {
            await expect(admin.page.getByText('Santa Ines QA')).toBeVisible();
        } finally { await admin.context.close(); }
        const tech = await setup('Técnico', '/dashboard/minhas-os');
        try {
            await expect(tech.page.getByRole('button', { name: 'Todas as OS' })).toHaveCount(0);
            await expect(tech.page.getByText('Cliente QA 0')).toBeVisible();
            await expect(tech.page.getByText('Santa Ines QA')).toHaveCount(0);
            assert(tech.requests.some(r => r.path === '/maintenance/my-orders'));
            assert(!tech.requests.some(r => r.path === '/maintenance'));
        } finally { await tech.context.close(); }
    });

    await run('OS opening page reaches older records instead of stopping at the first page', async () => {
        const s = await setup('Gestor', '/dashboard/manutencao');
        try {
            await expect(s.page.getByText('Santa Ines QA')).toBeVisible();
            const pagination = s.page.getByRole('navigation', { name: 'Páginas de ordens de serviço' });
            await pagination.getByRole('button', { name: 'Próxima' }).click();
            await pagination.getByRole('button', { name: 'Próxima' }).click();
            await expect(s.page.getByText('OS-QA-0114')).toBeVisible();
            assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
};
