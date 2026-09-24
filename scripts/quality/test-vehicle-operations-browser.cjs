/* Vehicle workflow in an isolated Next build with synthetic API responses only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const scratch = path.join(root, 'tmp/architecture-validation');
const output = path.join(scratch, 'web');
const shots = path.join(scratch, 'vehicle-operations-browser-qa');
const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const { chromium } = require(path.join(runtime, 'node/node_modules/playwright'));
const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));
const base = 'http://127.0.0.1:3997';
const apiBase = 'http://127.0.0.1:3999';
const reservationId = '40000000-0000-4000-8000-000000000019';
const userId = '40000000-0000-4000-8000-000000000020';
const vehicle = { id: '40000000-0000-4000-8000-000000000021', name: 'Fiorino QA', plate: 'ABC1D23', active: true };
const now = Date.now();
const baseBooking = { id: reservationId, title: 'Visita QA', vehicle, responsible: { id: userId, name: 'Colaborador QA' }, startDate: new Date(now - 3600000).toISOString(), endDate: new Date(now + 3600000).toISOString(), notes: null, cancelledAt: null, use: null };
const jpg = Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 0, 0, 0]);
const photoPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/8foAAAAASUVORK5CYII=', 'base64');
const cases = [];
let web, browser;
async function setup(role, mobile = false) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, timezoneId: 'America/Sao_Paulo' });
    await context.addInitScript(() => { localStorage.setItem('accessToken', 'synthetic-vehicles-workflow'); localStorage.setItem('userType', 'internal'); });
    const state = { booking: structuredClone(baseBooking), requests: [], errors: [] };
    await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return route.abort();
        if (url.port !== '3999') return route.continue();
        const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }, body: JSON.stringify(data) });
        if (request.method() === 'OPTIONS') return respond({});
        state.requests.push({ path: url.pathname, method: request.method() });
        if (url.pathname === '/auth/me') return respond({ data: { id: userId, name: 'Colaborador QA', email: 'colaborador@example.test', type: 'internal', role: { name: role } } });
        if (url.pathname === '/auth/me/permissions') return respond({ data: role === 'Internos' ? ['vehicles.view', 'vehicles.reserve'] : ['vehicles.view', 'schedule.view', 'schedule.create'] });
        if (url.pathname.includes('pending-rating')) return respond({ data: null });
        if (url.pathname === '/vehicles/options') return respond({ data: { vehicles: [vehicle], responsibleUsers: [{ id: userId, name: 'Colaborador QA' }], reservationResponsibleUsers: [{ id: userId, name: 'Colaborador QA' }] } });
        if (url.pathname === '/vehicles/operations') return respond({ data: { ready: state.booking.use ? [] : [state.booking], inUse: state.booking.use && !state.booking.use.returnedAt ? [state.booking] : [], recent: state.booking.use?.returnedAt ? [state.booking] : [] } });
        if (url.pathname.startsWith('/media/vehicle-')) return route.fulfill({ status: 200, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true' }, body: photoPng });
        if (url.pathname === '/vehicles/dashboard') return role === 'Internos' ? respond({ error: { message: 'Sem acesso' } }, 403) : respond({ data: { generatedAt: new Date(now).toISOString(), activeVehicles: 1, occupiedVehicles: 0, availableVehicles: 1, overdueVehicles: 0, current: [], upcoming: [], month: url.searchParams.get('month'), page: 1, limit: 20, total: state.booking.use ? 1 : 0, completedTrips: state.booking.use?.returnedAt ? 1 : 0, totalKm: state.booking.use?.returnedAt ? 20 : 0, lateReturns: 0, byVehicle: state.booking.use ? [{ id: vehicle.id, name: vehicle.name, trips: 1, completedTrips: state.booking.use.returnedAt ? 1 : 0, km: state.booking.use.returnedAt ? 20 : 0 }] : [], bySector: state.booking.use ? [{ name: 'Operações', trips: 1, km: state.booking.use.returnedAt ? 20 : 0 }] : [], journeys: state.booking.use ? [state.booking] : [] } });
        if (url.pathname.endsWith('/checkout') && request.method() === 'POST') {
            state.booking.use = { id: 'use-qa', reservationId, driver: { id: userId, name: 'Colaborador QA' }, clientName: 'Skyline', destination: 'Obra QA', purpose: 'INSTALACAO', odometerOut: 100, fuelOut: 'CHEIO', hadDamageOut: false, checkedOutAt: new Date(now).toISOString(), checkoutPhotoUrl: '/media/vehicle-out/use-qa/file', odometerIn: null, sameDestination: null, returnedAt: null, returnPhotoUrl: null, lateMinutes: null };
            return respond({ data: state.booking }, 201);
        }
        if (url.pathname.endsWith('/return') && request.method() === 'POST') {
            Object.assign(state.booking.use, { odometerIn: 120, sameDestination: true, returnedAt: new Date(now).toISOString(), returnPhotoUrl: '/media/vehicle-in/use-qa/file', lateMinutes: 0 });
            return respond({ data: state.booking }, 201);
        }
        return respond({ data: [] });
    });
    const page = await context.newPage(); page.on('pageerror', error => state.errors.push(error.message));
    return { context, page, state };
}
async function run(name, work) {
    try { await work(); cases.push({ name, passed: true }); process.stdout.write('PASS ' + name + '\n'); }
    catch (error) { cases.push({ name, passed: false, error: error.message }); process.stderr.write('FAIL ' + name + ': ' + error.message + '\n'); }
}
async function main() {
    fs.mkdirSync(shots, { recursive: true });
    assert(fs.existsSync(path.join(output, '.next/BUILD_ID')), 'Run pnpm validate:isolated first');
    web = spawn(process.execPath, [require.resolve('next/dist/bin/next', { paths: [output] }), 'start', '-p', '3997', '-H', '127.0.0.1'], { cwd: output, stdio: 'ignore', windowsHide: true });
    for (let attempt = 0; attempt < 100; attempt++) { try { const response = await fetch(base); if (response.ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 250)); }
    browser = await chromium.launch({ executablePath: process.env.AUDIT_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    await run('Internos can withdraw and return from a reservation; both forms keep the car in the same workspace', async () => {
        const { context, page, state } = await setup('Internos', true);
        try {
            await page.goto(base + '/dashboard/carros/movimentacoes');
            await expect(page.getByRole('heading', { name: 'Retiradas e devoluções' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Carros', exact: true })).toBeVisible();
            await expect(page.getByRole('region', { name: 'Resumo das movimentações' })).toBeVisible();
            await page.getByRole('button', { name: 'Registrar retirada' }).click();
            const checkout = page.getByRole('form', { name: 'Retirada de Fiorino QA' });
            await expect(checkout.getByText('Etapa 1 de 2')).toBeVisible();
            await page.screenshot({ path: path.join(shots, 'vehicle-checkout-mobile.png'), fullPage: true, animations: 'disabled' });
            await checkout.getByRole('button', { name: 'Tirar foto', exact: true }).scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(shots, 'vehicle-photo-mobile.png'), animations: 'disabled' });
            await checkout.getByLabel(/Cliente ou uso interno/).fill('Skyline');
            await checkout.getByLabel(/Destino/).fill('Obra QA');
            await checkout.getByLabel(/Finalidade da utilização/).selectOption('INSTALACAO');
            await checkout.getByLabel(/Quilometragem na retirada/).fill('100');
            await checkout.getByLabel(/Combustível na retirada/).selectOption('CHEIO');
            await expect(checkout.getByRole('button', { name: 'Tirar foto', exact: true })).toBeVisible();
            const checkoutPhoto = page.waitForEvent('filechooser');
            await checkout.getByRole('button', { name: 'Tirar foto', exact: true }).click();
            await (await checkoutPhoto).setFiles({ name: 'painel.jpg', mimeType: 'image/jpeg', buffer: jpg });
            await checkout.getByRole('radio', { name: 'Não' }).check();
            await checkout.getByRole('button', { name: 'Confirmar retirada' }).click();
            await expect(page.getByRole('button', { name: 'Registrar devolução' })).toBeVisible();
            await page.getByRole('button', { name: 'Registrar devolução' }).click();
            const returned = page.getByRole('form', { name: 'Devolução de Fiorino QA' });
            await expect(returned.getByText('Etapa 2 de 2')).toBeVisible();
            await returned.getByLabel(/Quilometragem na devolução/).fill('120');
            const returnPhoto = page.waitForEvent('filechooser');
            await returned.getByRole('button', { name: 'Tirar foto', exact: true }).click();
            await (await returnPhoto).setFiles({ name: 'retorno.jpg', mimeType: 'image/jpeg', buffer: jpg });
            await returned.getByRole('radio', { name: 'Sim' }).check();
            await returned.getByRole('button', { name: 'Confirmar devolução' }).click();
            await expect(page.getByRole('heading', { name: 'Minhas devoluções recentes' })).toBeVisible();
            await expect(page.getByText('100 → 120 km')).toBeVisible();
            await page.getByRole('button', { name: 'Foto da retirada' }).click();
            await expect(page.getByRole('dialog', { name: 'Foto da retirada' })).toBeVisible();
            await expect(page.getByRole('img', { name: 'Foto da retirada' })).toBeVisible();
            await page.getByRole('button', { name: 'Fechar' }).click();
            assert.equal(state.requests.filter(item => item.method === 'POST' && item.path.endsWith('/checkout')).length, 1);
            assert.equal(state.requests.filter(item => item.method === 'POST' && item.path.endsWith('/return')).length, 1);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            assert.deepEqual(state.errors, []);
            await page.screenshot({ path: path.join(shots, 'vehicle-workflow-mobile.png'), fullPage: true, animations: 'disabled' });
        } finally { await context.close(); }
    });
    await run('Car dashboard is available to Gestor and hidden from Internos', async () => {
        const internal = await setup('Internos');
        try { await internal.page.goto(base + '/dashboard/carros/painel'); await expect(internal.page).toHaveURL(base + '/dashboard'); assert(!internal.state.requests.some(item => item.path === '/vehicles/dashboard')); }
        finally { await internal.context.close(); }
        const manager = await setup('Gestor');
        manager.state.booking.use = { id: 'use-manager-qa', reservationId, driver: { id: userId, name: 'Colaborador QA', sector: 'Operações' }, checkedOutBy: { id: userId, name: 'Colaborador QA' }, returnedBy: { id: userId, name: 'Colaborador QA' }, clientName: 'Skyline', destination: 'Obra QA', purpose: 'INSTALACAO', odometerOut: 100, fuelOut: 'CHEIO', hadDamageOut: false, checkedOutAt: new Date(now).toISOString(), checkoutPhotoUrl: '/media/vehicle-out/use-manager-qa/file', odometerIn: 120, sameDestination: true, returnedAt: new Date(now).toISOString(), returnPhotoUrl: '/media/vehicle-in/use-manager-qa/file', lateMinutes: 0 };
        try { await manager.page.goto(base + '/dashboard/carros/painel'); await expect(manager.page.getByRole('heading', { name: 'Painel de carros' })).toBeVisible(); await expect(manager.page.getByText('Km percorridos')).toBeVisible(); await expect(manager.page.getByText('Uso por setor')).toBeVisible(); await manager.page.getByRole('button', { name: 'Ver registro' }).click(); await expect(manager.page.getByText('Destino: Obra QA')).toBeVisible(); assert(manager.state.requests.some(item => item.path === '/vehicles/dashboard')); assert.deepEqual(manager.state.errors, []); await manager.page.screenshot({ path: path.join(shots, 'vehicle-dashboard-manager.png'), fullPage: true, animations: 'disabled' }); }
        finally { await manager.context.close(); }
    });
}
main().catch(error => { cases.push({ name: 'Harness', passed: false, error: error.message }); process.stderr.write(error.stack + '\n'); }).finally(async () => {
    if (browser) await browser.close();
    if (web) web.kill();
    const failed = cases.filter(item => !item.passed).length;
    fs.mkdirSync(shots, { recursive: true });
    fs.writeFileSync(path.join(shots, 'results.json'), JSON.stringify({ environment: 'Isolated Next + synthetic API; no production DB', passed: cases.length - failed, failed, cases }, null, 2));
    process.stdout.write(`Vehicle browser: ${cases.length - failed}/${cases.length} passed.\n`);
    process.exitCode = failed ? 1 : 0;
});
