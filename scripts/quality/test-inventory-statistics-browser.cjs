/* Isolated browser QA for context-aware inventory indicators. No real API or database. */
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

module.exports = async ({ run, browser, base, shots, fixedNow }) => {
    const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
    const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));

    async function setup({ mobile = false } = {}) {
        const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1200 }, timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
        const internal = { id: crypto.randomUUID(), name: 'Almoxarifado Casa QA', kind: 'INTERNAL', companyId: null, projectId: null, isMainWarehouse: null, company: null, project: null, _count: { assets: 4 } };
        const company = { id: crypto.randomUUID(), name: 'Cliente indicadores QA', projects: [] };
        const product = { id: crypto.randomUUID(), skuCode: '992001', name: 'Tela indicadores QA' };
        const project = { projectId: crypto.randomUUID(), name: 'Projeto indicadores QA', companyName: company.name, quantity: 8 };
        const requests = [], errors = [];
        await context.addInitScript(() => { localStorage.setItem('accessToken', 'inventory-statistics-qa'); localStorage.setItem('userType', 'internal'); });
        await context.route('**/*', async routeHandler => {
            const request = routeHandler.request(); const url = new URL(request.url());
            if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return routeHandler.abort();
            if (url.port !== '3999') return routeHandler.continue();
            requests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), method: request.method() });
            const respond = data => routeHandler.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }, body: JSON.stringify(data) });
            if (request.method() === 'OPTIONS') return respond({});
            if (url.pathname === '/auth/me') return respond({ data: { id: 'stock-qa', name: 'Operador QA', type: 'internal', role: { name: 'Administrador' } } });
            if (url.pathname === '/auth/me/permissions') return respond({ data: ['dashboard.view', 'inventory.view', 'settings.manage'] });
            if (url.pathname.includes('pending-rating')) return respond({ data: null });
            if (url.pathname === '/inventory/custody/options') return respond({ data: { locations: [internal], companies: [company], movementTypes: [], diagnostic: { unlocatedAssets: 2, unclassifiedAssets: 1, unclassifiedLocations: 0 } } });
            if (url.pathname === '/inventory/statistics') {
                const statsContext = url.searchParams.get('context') || 'WAREHOUSE';
                const specific = Boolean(url.searchParams.get('locationId'));
                const client = statsContext === 'CLIENT';
                return respond({ data: {
                    generatedAt: new Date(fixedNow).toISOString(), period: { start: new Date(fixedNow - 30 * 86400000).toISOString(), end: new Date(fixedNow).toISOString() }, context: statsContext,
                    location: specific ? { id: internal.id, name: internal.name } : null,
                    totals: { skus: 12, assets: 30, unlocated: 2, unclassified: 1 }, scope: { assets: client ? 10 : 20, available: client ? 0 : 15, maintenance: client ? 2 : 1 },
                    movements: [{ nature: 'SHIPMENT', quantity: 8, records: 8 }], topEntries: [], topExits: [{ ...product, skuId: product.id, quantity: 8 }],
                    priorities: specific ? [{ ...product, skuId: product.id, available: 1, output30: 8, minimum: 3, shortage: 2, reason: 'BELOW_MINIMUM', critical: true }] : [],
                    criticalCount: specific ? 1 : 0, minimumConfiguredCount: specific ? 1 : 0, replenishmentConfigured: specific,
                    clientInsights: client ? { projectsWithAssets: 1, writeOffs30: 2, topUsedItems: [{ ...product, skuId: product.id, quantity: 8 }], topWriteOffItems: [{ ...product, skuId: product.id, quantity: 2 }], topProjects: [project] } : null,
                } });
            }
            if (url.pathname === '/locations' || url.pathname === '/catalog/skus' || url.pathname === '/inventory/balances' || url.pathname === '/inventory/movement-types' || url.pathname === '/inventory/exit-reasons') return respond({ data: [] });
            return respond({ data: [] });
        });
        const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '/dashboard/estoque?aba=dashboard');
        await expect(page.getByRole('heading', { name: 'Estoque', exact: true })).toBeVisible();
        return { context, page, requests, errors, internal, company };
    }

    await run('Inventory indicators: default warehouse filter consolidates all Skyline stocks', async () => {
        const state = await setup();
        try {
            await expect(state.page.getByLabel('Local')).toHaveValue('');
            await expect(state.page.getByText('Todos os estoques Skyline ·', { exact: false })).toBeVisible();
            await expect(state.page.locator('[data-inventory-metric="scoped"] [data-metric-value]')).toHaveText('20');
            const request = state.requests.filter(item => item.path === '/inventory/statistics').at(-1);
            assert(!request.params.locationId);
            await expect(state.page.getByText('Prioridades de reposição', { exact: true })).toHaveCount(0);
            assert.deepEqual(state.errors, []);
        } finally { await state.context.close(); }
    });

    await run('Inventory indicators: a specific Skyline stock exposes only its replenishment metrics', async () => {
        const state = await setup();
        try {
            await state.page.getByLabel('Local').selectOption(state.internal.id);
            await expect(state.page.getByText('Prioridades de reposição', { exact: true })).toBeVisible();
            await expect(state.page.locator('[data-replenishment-priority]')).toContainText('Falta: 2');
            await expect(state.page.getByRole('button', { name: 'Configurar reservas', exact: true })).toBeVisible();
            const request = state.requests.filter(item => item.path === '/inventory/statistics').at(-1);
            assert.equal(request.params.locationId, state.internal.id);
        } finally { await state.context.close(); }
    });

    await run('Inventory indicators: all clients use client/project metrics and omit internal reserve metrics', async () => {
        const state = await setup({ mobile: true });
        try {
            await state.page.getByLabel('Contexto').selectOption('CLIENT');
            await expect(state.page.getByLabel('Cliente')).toHaveValue('');
            await expect(state.page.getByText('Patrimônios em clientes', { exact: true })).toBeVisible();
            await expect(state.page.getByText('Itens mais usados nos projetos', { exact: true })).toBeVisible();
            await expect(state.page.getByText('Itens com mais baixas nos clientes', { exact: true })).toBeVisible();
            await expect(state.page.getByText('Prioridades de reposição', { exact: true })).toHaveCount(0);
            assert(await state.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            await state.page.screenshot({ path: path.join(shots, 'inventory-client-metrics-mobile.png'), fullPage: true });
            const request = state.requests.filter(item => item.path === '/inventory/statistics').at(-1);
            assert.equal(request.params.context, 'CLIENT'); assert(!request.params.companyId);
            assert.deepEqual(state.errors, []);
        } finally { await state.context.close(); }
    });
};

if (require.main === module) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-dashboard.cjs'), '--inventory-statistics'], { stdio: 'inherit', windowsHide: true });
    process.exitCode = result.status ?? 1;
}
