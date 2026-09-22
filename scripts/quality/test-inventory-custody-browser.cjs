/* Isolated browser QA for the integrated inventory workspace. No real API or database. */
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

module.exports = async ({ run, browser, base, shots, fixedNow }) => {
    const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
    const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));

    async function setup(route = '/dashboard/estoque?aba=assets') {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
        const company = { id: crypto.randomUUID(), name: 'Cliente estoque QA', projects: [{ id: crypto.randomUUID(), name: 'Projeto estoque QA' }] };
        const internalLocation = { id: crypto.randomUUID(), name: 'Almoxarifado Skyline QA', kind: 'INTERNAL', companyId: null, projectId: null, company: null, project: null, isMainWarehouse: null, _count: { assets: 1 } };
        const clientLocation = { id: crypto.randomUUID(), name: 'Estoque Projeto QA', kind: 'CLIENT', companyId: company.id, projectId: company.projects[0].id, company: { id: company.id, name: company.name }, project: company.projects[0], isMainWarehouse: null, _count: { assets: 1 } };
        const transferType = { id: crypto.randomUUID(), name: 'Transferência', requiresApproval: false };
        const entryType = { id: crypto.randomUUID(), name: 'Entrada', requiresApproval: false };
        const exitType = { id: crypto.randomUUID(), name: 'Saída', requiresApproval: false };
        const internalAsset = { id: crypto.randomUUID(), assetCode: 'QA-00001', skuId: crypto.randomUUID(), status: 'ATIVO', currentLocationId: internalLocation.id, sku: { id: crypto.randomUUID(), skuCode: '991001', name: 'Tela interna QA', brand: 'QA' }, currentLocation: internalLocation, shipmentAt: null };
        const clientAsset = { id: crypto.randomUUID(), assetCode: 'QA-00002', skuId: crypto.randomUUID(), status: 'EM_USO', currentLocationId: clientLocation.id, sku: { id: crypto.randomUUID(), skuCode: '991002', name: 'Tela cliente QA', brand: 'QA' }, currentLocation: clientLocation, shipmentAt: new Date(fixedNow).toISOString() };
        const requests = [], errors = [];
        await context.addInitScript(() => { localStorage.setItem('accessToken', 'inventory-workspace-qa'); localStorage.setItem('userType', 'internal'); });
        await context.route('**/*', async routeHandler => {
            const request = routeHandler.request();
            const url = new URL(request.url());
            if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return routeHandler.abort();
            if (url.port !== '3999') return routeHandler.continue();
            const body = ['POST', 'PUT'].includes(request.method()) ? request.postDataJSON() : null;
            requests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), method: request.method(), body });
            const respond = (data, status = 200) => routeHandler.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }, body: JSON.stringify(data) });
            if (request.method() === 'OPTIONS') return respond({});
            if (url.pathname === '/auth/me') return respond({ data: { id: 'inventory-qa', name: 'Operador QA', type: 'internal', role: { name: 'Administrador' } } });
            if (url.pathname === '/auth/me/permissions') return respond({ data: ['dashboard.view', 'inventory.view', 'inventory.historico', 'inventory.bipar_entrada', 'inventory.bipar_saida', 'locations.create', 'locations.update'] });
            if (url.pathname.includes('pending-rating')) return respond({ data: null });
            if (url.pathname === '/inventory/custody/options') return respond({ data: { locations: [internalLocation, clientLocation], companies: [company], movementTypes: [transferType, entryType, exitType], diagnostic: { unlocatedAssets: 0, unclassifiedAssets: 0, unclassifiedLocations: 0 } } });
            if (url.pathname === '/inventory/custody/uninstallations/' + clientLocation.id) {
                if (request.method() === 'GET') return respond({ data: { location: { id: clientLocation.id, name: clientLocation.name,
                    companyName: company.name, projectName: company.projects[0].name }, assets: [{
                    id: clientAsset.id, assetCode: clientAsset.assetCode, skuId: clientAsset.skuId,
                    skuName: clientAsset.sku.name, status: clientAsset.status,
                }], pendingApprovalId: null } });
                return respond({ data: { approvalRequestId: crypto.randomUUID(), status: 'PENDING', returned: body.returnedAssetIds.length,
                    lost: body.assetIds.length - body.returnedAssetIds.length } }, 201);
            }
            if (url.pathname === '/inventory/custody/assets') {
                const rows = url.searchParams.get('scope') === 'INTERNAL' ? [internalAsset] : [clientAsset];
                return respond({ data: rows, total: rows.length, page: 1, limit: 50 });
            }
            if (url.pathname === '/assets/lookup/QA-00001') return respond({ data: internalAsset });
            if (url.pathname === '/assets/lookup/QA-00002') return respond({ data: clientAsset });
            if (url.pathname === '/inventory/movement-types') return respond({ data: [transferType, entryType, exitType] });
            if (url.pathname === '/inventory/exit-reasons') return respond({ data: ['Envio para projeto', 'Manutenção', 'Baixa', 'Uso interno'].map(name => ({ id: crypto.randomUUID(), name })) });
            if (url.pathname === '/locations') return respond({ data: [internalLocation, clientLocation] });
            if (url.pathname === '/catalog/skus' || url.pathname === '/inventory/balances') return respond({ data: [] });
            if (url.pathname === '/inventory/statistics') return respond({ data: { generatedAt: new Date(fixedNow).toISOString(), period: { start: new Date(fixedNow - 30 * 86400000).toISOString(), end: new Date(fixedNow).toISOString() }, context: 'WAREHOUSE', location: null, totals: { skus: 2, assets: 2, unlocated: 0, unclassified: 0 }, scope: { assets: 1, available: 1, maintenance: 0 }, movements: [], topEntries: [], topExits: [], priorities: [], criticalCount: 0, minimumConfiguredCount: 0, replenishmentConfigured: false, clientInsights: null } });
            if (url.pathname === '/inventory/entry-batch' || url.pathname === '/inventory/exit-batch') return respond({ data: { processed: 1 }, message: 'Operação registrada' }, 201);
            return respond({ data: [] });
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + route);
        await expect(page.getByRole('heading', { name: 'Estoque', exact: true })).toBeVisible();
        return { context, page, requests, errors, company, internalLocation, clientLocation, internalAsset, clientAsset };
    }

    await run('Inventory workspace: one navigation keeps client and Skyline custody explicitly separated', async () => {
        const state = await setup();
        try {
            await expect(state.page.getByRole('button', { name: 'Patrimônios', exact: true })).toHaveAttribute('aria-pressed', 'true');
            await expect(state.page.locator('[data-custody-asset]')).toContainText('Tela cliente QA');
            assert.equal(state.requests.filter(request => request.path === '/inventory/custody/assets').at(-1).params.scope, 'CLIENT');
            await state.page.getByLabel('Contexto dos patrimônios').selectOption('INTERNAL');
            await expect(state.page.locator('[data-custody-asset]')).toContainText('Tela interna QA');
            assert.equal(state.requests.filter(request => request.path === '/inventory/custody/assets').at(-1).params.scope, 'INTERNAL');
            await expect(state.page.getByRole('button', { name: 'Enviar ao cliente', exact: true })).toHaveCount(0);
            assert.deepEqual(state.errors, []);
        } finally { await state.context.close(); }
    });

    await run('Inventory workspace: batch entry infers origin and records destination plus timeline event', async () => {
        const state = await setup('/dashboard/estoque?aba=batchEntry');
        try {
            const search = state.page.getByPlaceholder('Bipe a etiqueta ou digite código/nome...');
            await search.fill(state.clientAsset.assetCode); await search.press('Enter');
            await expect(state.page.getByText('Patrimônios para entrada (1)', { exact: true })).toBeVisible();
            await state.page.getByLabel('Estoque Skyline de destino *').selectOption(state.internalLocation.id);
            await state.page.getByLabel('Motivo da entrada').fill('Retorno do projeto QA');
            await state.page.getByLabel('Evento na timeline').fill('Retornou ao almoxarifado em 19/09/2026');
            await state.page.getByLabel('PIN').fill('1234');
            await state.page.getByRole('button', { name: /Registrar entrada de 1/ }).click();
            await expect(state.page.getByText('Patrimônios para entrada (0)', { exact: true })).toBeVisible();
            const request = state.requests.find(item => item.path === '/inventory/entry-batch' && item.method === 'POST');
            assert.equal(request.body.toLocationId, state.internalLocation.id);
            assert.deepEqual(request.body.assetIds, [state.clientAsset.id]);
            assert.equal(request.body.eventDescription, 'Retornou ao almoxarifado em 19/09/2026');
            assert(!('fromLocationId' in request.body));
            assert.deepEqual(state.errors, []);
        } finally { await state.context.close(); }
    });

    await run('Inventory workspace: batch exit persists the selected client and project destination', async () => {
        const state = await setup('/dashboard/estoque?aba=batchExit');
        try {
            const search = state.page.getByPlaceholder('Bipe a etiqueta ou digite código/nome...');
            await search.fill(state.internalAsset.assetCode); await search.press('Enter');
            await state.page.getByLabel('Cliente').selectOption(state.company.id);
            await state.page.getByLabel('Projeto').selectOption(state.company.projects[0].id);
            await state.page.getByLabel('Motivo da saída').selectOption('Envio para projeto');
            await state.page.getByLabel('Evento na timeline').fill('Enviado ao projeto QA');
            await state.page.getByLabel('PIN').fill('1234');
            await state.page.getByRole('button', { name: /Dar saída em 1 item/ }).click();
            const request = state.requests.find(item => item.path === '/inventory/exit-batch' && item.method === 'POST');
            assert.equal(request.body.destinationLocationId, state.clientLocation.id);
            assert.equal(request.body.newStatus, 'EM_USO');
            assert.deepEqual(request.body.assetIds, [state.internalAsset.id]);
            assert.deepEqual(state.errors, []);
            await state.page.screenshot({ path: path.join(shots, 'inventory-workspace-batch-exit.png'), fullPage: true });
        } finally { await state.context.close(); }
    });
    await run('Inventory workspace: maintenance exit routes automatically without client or project fields', async () => {
        const state = await setup('/dashboard/estoque?aba=batchExit');
        try {
            const search = state.page.getByPlaceholder('Bipe a etiqueta ou digite código/nome...');
            await search.fill(state.internalAsset.assetCode); await search.press('Enter');
            await state.page.getByLabel('Motivo da saída').selectOption('Manutenção');
            await expect(state.page.getByText(/Destino automático: Manutenção/)).toBeVisible();
            await expect(state.page.getByLabel('Cliente', { exact: true })).toHaveCount(0);
            await state.page.getByLabel('Evento na timeline').fill('Encaminhado para manutenção QA');
            await state.page.getByLabel('PIN').fill('1234');
            await state.page.getByRole('button', { name: /Dar saída em 1 item/ }).click();
            const request = state.requests.find(item => item.path === '/inventory/exit-batch' && item.method === 'POST');
            assert.equal(request.body.destinationLocationId, undefined);
            assert.equal(request.body.newStatus, 'EM_MANUTENCAO');
            assert.deepEqual(state.errors, []);
        } finally { await state.context.close(); }
    });
    await run('Inventory workspace: uninstallation checklist submits returned units for approval without moving them in the UI', async () => {
        const state = await setup('/dashboard/estoque?aba=assets');
        try {
            await state.page.getByLabel('Local', { exact: true }).selectOption(state.clientLocation.id);
            await state.page.getByRole('button', { name: 'Desinstalar sala', exact: true }).click();
            const dialog = state.page.getByRole('dialog');
            await expect(dialog).toContainText(state.company.projects[0].name);
            await expect(dialog).toContainText('1 pendentes/perda');
            await dialog.getByLabel(/Marcar este item inteiro/).check();
            await expect(dialog).toContainText('1 devolvidos');
            await dialog.getByLabel('Almoxarifado de devolução').selectOption(state.internalLocation.id);
            await dialog.getByLabel('PIN de conferência').fill('1234');
            await dialog.getByRole('button', { name: 'Enviar conferência para aprovação' }).click();
            const request = state.requests.find(item => item.path === '/inventory/custody/uninstallations/' + state.clientLocation.id && item.method === 'POST');
            assert.deepEqual(request.body.assetIds, [state.clientAsset.id]);
            assert.deepEqual(request.body.returnedAssetIds, [state.clientAsset.id]);
            assert.equal(request.body.toLocationId, state.internalLocation.id);
            await expect(dialog).toHaveCount(0);
            assert.deepEqual(state.errors, []);
        } finally { await state.context.close(); }
    });
};

if (require.main === module) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-dashboard.cjs'), '--custody'], { stdio: 'inherit', windowsHide: true });
    process.exitCode = result.status ?? 1;
}
