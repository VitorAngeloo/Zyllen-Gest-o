/* Browser behavior against an isolated Next build and synthetic API responses.
 * No API server, database, production credentials or external requests are used.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const scratch = path.resolve(root, process.env.AUDIT_ARTIFACT_DIR || 'tmp/architecture-validation');
if (path.dirname(scratch) !== path.join(root, 'tmp')) throw new Error('Browser artifacts must use a direct child directory under tmp');
const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const { chromium } = require(path.join(runtime, 'node/node_modules/playwright'));
const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));
const next = require.resolve('next/dist/bin/next', { paths: [path.join(root, 'apps/web')] });
const webPort = process.env.AUDIT_WEB_PORT || '3998';
const base = `http://127.0.0.1:${webPort}`;
const cases = [], logs = [];
const shots = path.join(scratch, process.argv.includes('--maintenance') ? 'maintenance-browser-qa' : process.argv.includes('--structures') ? 'structures-browser-qa' : process.argv.includes('--projects-agenda') ? 'projects-agenda-browser-qa' : process.argv.includes('--panels') ? 'personal-panels-browser-qa' : process.argv.includes('--inventory-statistics') ? 'inventory-statistics-browser-qa' : process.argv.includes('--custody') ? 'custody-browser-qa' : process.argv.includes('--trips') ? 'trips-browser-qa' : process.argv.includes('--project-statistics') ? 'project-statistics-browser-qa' : process.argv.includes('--projects') ? 'project-services-browser-qa' : 'ticket-dashboard-qa');
fs.mkdirSync(shots, { recursive: true });
let web, browser;
const fixedNow = Date.now();
const date = minutes => new Date(fixedNow - minutes * 60_000).toISOString();
function ticket(id, overrides = {}) {
    return {
        id, title: `Pedido ${id}`, description: `Descrição completa do pedido ${id}.\nSegunda linha com todos os detalhes.`,
        source: 'INTERNAL', status: 'OPEN', priority: 'MEDIUM', createdAt: date(10),
        firstResponseAt: null, closedAt: null, slaDueAt: date(-120), elapsedSeconds: null, resolutionNotes: null,
        assignedToInternalUserId: null, internalUser: { name: 'Solicitante QA', sector: 'Financeiro' },
        externalUser: null, company: null, assignedTo: null, attachments: [], messages: [], rating: null,
        ...overrides,
    };
}
function fixtures() {
    return [
        ticket('boundary'),
        ticket('old', { title: 'Impressora do financeiro', createdAt: date(310), priority: 'CRITICAL',
            attachments: [{ id: 'attachment-qa', fileName: 'foto-qa.png', filePath: '/media/private/ticket/attachment-qa' }],
            messages: [{ id: 'message-qa', authorType: 'external', content: 'Mensagem completa do solicitante QA', createdAt: date(60) }],
        }),
        ticket('progress', { title: 'Rede da sala indisponível', source: 'CLIENT', status: 'IN_PROGRESS',
            createdAt: date(80), firstResponseAt: date(5), assignedToInternalUserId: 'tech-qa', assignedTo: { name: 'Técnico QA', sector: 'Suporte' },
            internalUser: null, company: { name: 'Empresa QA' },
            externalUser: { name: 'Cliente QA', phone: '(11) 99999-0000', position: 'Coordenador', email: 'cliente@example.test', company: { name: 'Empresa QA' }, project: { name: 'Projeto QA' } },
        }),
    ];
}
async function run(name, work) {
    try { await work(); cases.push({ name, passed: true }); console.log('PASS ' + name); }
    catch (error) { cases.push({ name, passed: false, error: error.message }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function setup({ role = 'Administrador', permissions = ['dashboard.view', 'tickets.view', 'tickets.triage'], tickets = fixtures(), failures = {}, viewport, timezoneId } = {}) {
    const context = await browser.newContext({ viewport: viewport || { width: 1440, height: 1100 }, timezoneId });
    const requests = [], errors = [];
    await context.addInitScript(() => { localStorage.setItem('accessToken', 'synthetic-dashboard-qa'); localStorage.setItem('userType', 'internal'); });
    await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return route.abort();
        if (url.port !== '3999') return route.continue();
        requests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), method: request.method() });
        const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS' }, body: JSON.stringify(data) });
        if (request.method() === 'OPTIONS') return respond({});
        if (failures[url.pathname]) return respond({ error: { message: 'Falha sintética de consulta QA' } }, 503);
        if (url.pathname === '/auth/me') return respond({ data: { id: 'tech-qa', type: 'internal', name: 'Usuário QA', email: 'qa@example.test', role: { id: 'role-qa', name: role } } });
        if (url.pathname === '/auth/me/permissions') return respond({ data: permissions });
        if (url.pathname === '/tickets/my-internal/pending-rating') return respond({ data: null });
        if (url.pathname === '/tickets/internal-users') return respond({ data: [{ id: 'tech-qa', name: 'Técnico QA', role: { name: 'Técnico' } }] });
        if (url.pathname === '/personal-panel/attention-clients') return respond({ data: { selected: [], options: [] } });
        if (url.pathname === '/vehicles/statistics') return respond({ data: { generatedAt: new Date(fixedNow).toISOString(), activeVehicles: 0, occupiedVehicles: 0, availableVehicles: 0, current: [], upcoming: [] } });
        if (url.pathname === '/personal-panel/statistics') return respond({ data: { view: 'estoque', data: {
            generatedAt: new Date(fixedNow).toISOString(), period: { start: new Date(fixedNow - 30 * 86400000).toISOString(), end: new Date(fixedNow).toISOString() },
            context: 'ALL', location: null, totals: { skus: 0, assets: 0, unlocated: 0, unclassified: 0 }, scope: { assets: 0, available: 0, maintenance: 0 },
            movements: [], topEntries: [], topExits: [], priorities: [], criticalCount: 0, minimumConfiguredCount: 0, replenishmentConfigured: false
        } } });
        if (url.pathname === '/tickets/statistics') {
            const source = url.searchParams.get('source'), start = Date.parse(url.searchParams.get('start')), end = Date.parse(url.searchParams.get('end'));
            const manager = ['Administrador', 'Gestor'].includes(role);
            const visible = tickets.filter(t => (source === 'ALL' || t.source === source) && (manager || t.status === 'OPEN' || t.assignedToInternalUserId === 'tech-qa'));
            const pending = visible.filter(t => t.status === 'OPEN' && !t.closedAt && !t.assignedToInternalUserId);
            const opened = visible.filter(t => Date.parse(t.createdAt) >= start && Date.parse(t.createdAt) < end);
            const sectors = new Map();
            for (const t of opened) {
                const name = t.source === 'INTERNAL' ? t.internalUser?.sector?.trim() || 'Sem setor' : t.company?.name || t.externalUser?.company?.name || 'Cliente não identificado';
                const key = `${t.source}:${name}`;
                const sector = sectors.get(key) || { source: t.source, name, openedInPeriod: 0 };
                sector.openedInPeriod++; sectors.set(key, sector);
            }
            return respond({ data: {
                generatedAt: new Date(fixedNow).toISOString(), source, scope: manager ? 'ALL' : 'OPEN_AND_ASSIGNED',
                period: { start: url.searchParams.get('start'), end: url.searchParams.get('end') },
                openedInPeriod: opened.length,
                closedInPeriod: visible.filter(t => t.status === 'CLOSED' && t.closedAt && Date.parse(t.closedAt) >= start && Date.parse(t.closedAt) < end).length,
                current: { pending: pending.length, inProgress: visible.filter(t => t.status === 'IN_PROGRESS' && !t.closedAt).length,
                    waitingClient: visible.filter(t => t.status === 'WAITING_CLIENT' && !t.closedAt).length,
                    resolved: visible.filter(t => t.status === 'RESOLVED').length,
                    needingAttention: visible.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status) && !t.closedAt && fixedNow - Date.parse(t.createdAt) >= (t.source === 'INTERNAL' ? 5 * 3_600_000 : 3_600_000)).length,
                    averagePendingSeconds: pending.length ? Math.round(pending.reduce((total, t) => total + Math.max(0, fixedNow - Date.parse(t.createdAt)), 0) / pending.length / 1000) : null,
                    oldestPendingAt: pending.map(t => t.createdAt).sort()[0] || null,
                },
                sectors: [...sectors.values()],
            } });
        }
        if (url.pathname === '/tickets') {
            if (!url.searchParams.has('status') && failures.attention) return respond({ error: { message: 'Falha monitor QA' } }, 503);
            const status = url.searchParams.get('status'), assignedToId = url.searchParams.get('assignedToId'), source = url.searchParams.get('source');
            const filtered = tickets.filter(t => (!source || source === 'ALL' || t.source === source) && (!status || t.status === status) && (!assignedToId || t.assignedToInternalUserId === assignedToId)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
            const limit = Number(url.searchParams.get('limit') || 20), page = Number(url.searchParams.get('page') || 1);
            return respond({ data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, limit, page });
        }
        const match = url.pathname.match(/^\/tickets\/([^/]+)(?:\/(assign-with-pin|close-with-pin))?$/);
        if (match) {
            const item = tickets.find(t => t.id === match[1]);
            if (!item) return respond({ error: { message: 'Chamado QA ausente' } }, 404);
            if (match[2]) {
                const body = request.postDataJSON(); assert.equal(body.pin, '1234'); assert.equal(request.method(), 'PUT');
                if (match[2] === 'assign-with-pin') Object.assign(item, { status: 'IN_PROGRESS', firstResponseAt: new Date(fixedNow).toISOString(), assignedToInternalUserId: 'tech-qa', assignedTo: { name: 'Técnico QA' } });
                else { assert(body.resolutionNotes.length >= 10); Object.assign(item, { status: 'CLOSED', closedAt: new Date(fixedNow).toISOString(), elapsedSeconds: 10, resolutionNotes: body.resolutionNotes }); }
            }
            return respond({ data: item });
        }
        return respond({ data: [] });
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: fixedNow });
    await page.clock.setFixedTime(fixedNow);
    await page.goto(base + '/dashboard');
    return { context, page, requests, errors, tickets, failures };
}
const card = (page, id) => page.locator(`[data-ticket-id="${id}"]`);
const detail = page => page.getByRole('dialog', { name: 'Detalhes do chamado', exact: true });

async function main() {
    assert(fs.existsSync(path.join(scratch, 'web/.next/BUILD_ID')), 'Run pnpm validate:isolated first');
    web = spawn(process.execPath, [next, 'start', '-p', webPort, '-H', '127.0.0.1'], { cwd: path.join(scratch, 'web'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
    web.stderr.on('data', data => logs.push(data.toString()));
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Preview did not start: ' + logs.join(''))), 20_000);
        web.on('exit', code => { clearTimeout(timer); reject(new Error('Preview exited: ' + code + logs.join(''))); });
        web.stdout.on('data', data => { logs.push(data.toString()); if (data.toString().includes('Ready in')) { clearTimeout(timer); resolve(); } });
    });
    browser = await chromium.launch({ executablePath: process.env.AUDIT_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    await run('Client and internal tickets have separate persistent actionable views', async () => {
        const s = await setup();
        const internal = s.page.locator('[data-ticket-source="INTERNAL"]'), clients = s.page.locator('[data-ticket-source="CLIENT"]');
        await expect(internal.getByRole('heading', { name: 'Atendimentos internos', exact: true })).toBeVisible();
        await expect(clients.getByRole('heading', { name: 'Atendimentos de clientes', exact: true })).toBeVisible();
        await expect(internal.locator('[data-ticket-id="old"]')).toContainText('Interno');
        await expect(internal.locator('[data-ticket-id="progress"]')).toHaveCount(0);
        await expect(clients.locator('[data-ticket-id="progress"]')).toContainText('Cliente');
        await expect(clients.locator('[data-ticket-id="progress"]')).toContainText('Empresa QA');
        await expect(clients.locator('[data-ticket-id="old"]')).toHaveCount(0);
        assert(s.requests.some(r => r.path === '/tickets' && r.params.source === 'INTERNAL'));
        assert(s.requests.some(r => r.path === '/tickets' && r.params.source === 'CLIENT'));
        await expect(s.page.getByText('Monitor de Atenção — Clientes', { exact: true })).toHaveCount(0);
        await expect(s.page.locator('[data-attention-client-settings]')).toBeVisible();
        assert.deepEqual(s.errors, []); await s.context.close();
    });
    await run('Cards preserve request information in both states; oldest first and alert based on opening', async () => {
        const { context, page, errors } = await setup();
        try {
            await expect(card(page, 'old')).toHaveAttribute('data-attention', 'true');
            await expect(card(page, 'boundary')).toHaveAttribute('data-attention', 'false');
            await expect(card(page, 'progress')).toHaveAttribute('data-attention', 'true');
            await expect(card(page, 'progress')).toContainText('Rede da sala indisponível');
            await expect(card(page, 'progress')).toContainText('Descrição completa do pedido progress.');
            await expect(card(page, 'progress')).toContainText('Cliente QA');
            await expect(card(page, 'progress')).toContainText('Técnico QA');
            await expect(card(page, 'progress')).toContainText('5min 00s');
            await expect(card(page, 'old')).toContainText('Prioridade Crítica');
            assert.deepEqual(await page.locator('[data-ticket-source="INTERNAL"] [data-ticket-column="open"] article').evaluateAll(items => items.map(i => i.dataset.ticketId)), ['old', 'boundary']);
            await expect(page.locator('[data-ticket-source="INTERNAL"]').getByRole('status').filter({ hasText: '1 chamado precisa' })).toBeVisible();
            await expect(page.locator('[data-ticket-source="CLIENT"]').getByRole('status').filter({ hasText: '1 chamado precisa' })).toBeVisible();
            await card(page, 'progress').getByRole('button', { name: /^Ver detalhes:/ }).click();
            await expect(detail(page)).toContainText('cliente@example.test');
            await expect(detail(page)).toContainText('Projeto QA');
            await expect(detail(page)).toContainText('(11) 99999-0000');
            assert.equal(page.url(), base + '/dashboard');
            await page.screenshot({ path: path.join(shots, 'desktop-details.png'), animations: 'disabled' });
            await page.keyboard.press('Escape'); await expect(detail(page)).toHaveCount(0);
            assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Ver detalhes: Rede da sala indisponível');
            await page.screenshot({ path: path.join(shots, 'desktop-dashboard.png'), fullPage: true, animations: 'disabled' });
            await page.locator('[data-ticket-source="INTERNAL"]').screenshot({ path: path.join(shots, 'desktop-internal-tickets.png'), animations: 'disabled' });
            await page.locator('[data-ticket-source="CLIENT"]').screenshot({ path: path.join(shots, 'desktop-client-tickets.png'), animations: 'disabled' });
            assert.deepEqual(errors, []);
        } finally { await context.close(); }
    });
    await run('Compact indicators keep independent source views and periods while retaining older current pending tickets', async () => {
        const tickets = [...fixtures(), ticket('legacy-pending', { createdAt: date(40 * 24 * 60) }),
            ticket('closed-before', { status: 'CLOSED', createdAt: date(45 * 24 * 60), closedAt: date(2 * 24 * 60) }),
            ticket('waiting', { status: 'WAITING_CLIENT', assignedToInternalUserId: 'tech-qa' }),
            ticket('resolved', { status: 'RESOLVED', assignedToInternalUserId: 'tech-qa' })];
        const { context, page, requests, errors } = await setup({ tickets, timezoneId: 'America/Sao_Paulo' });
        const sourceView = source => page.locator(`[data-ticket-source="${source}"]`);
        const metric = (source, key) => sourceView(source).locator(`[data-ticket-metric="${key}"] [data-metric-value]`);
        try {
            await expect(metric('INTERNAL', 'opened')).toHaveText('4'); await expect(metric('INTERNAL', 'closed')).toHaveText('1');
            await expect(metric('INTERNAL', 'pending')).toHaveText('3'); await expect(metric('INTERNAL', 'in-progress')).toHaveText('0');
            await expect(metric('INTERNAL', 'attention')).toHaveText('2'); await expect(metric('INTERNAL', 'wait')).toContainText('h');
            await expect(metric('CLIENT', 'opened')).toHaveText('1'); await expect(metric('CLIENT', 'in-progress')).toHaveText('1');
            await expect(metric('CLIENT', 'attention')).toHaveText('1');
            await expect(sourceView('INTERNAL').getByRole('list', { name: 'Aberturas por setor' })).toContainText('Financeiro');
            await expect(sourceView('CLIENT').getByRole('list', { name: 'Aberturas por cliente' })).toContainText('Empresa QA');
            await sourceView('INTERNAL').getByLabel('Período dos indicadores', { exact: true }).selectOption('7_DAYS');
            await expect(metric('INTERNAL', 'opened')).toHaveText('4'); await expect(metric('INTERNAL', 'pending')).toHaveText('3');
            await expect(card(page, 'legacy-pending')).toBeVisible();
            await expect(sourceView('INTERNAL').locator('[data-ticket-id="progress"]')).toHaveCount(0);
            await expect(sourceView('CLIENT').locator('[data-ticket-id="legacy-pending"]')).toHaveCount(0);
            await sourceView('CLIENT').getByLabel('Período dos indicadores', { exact: true }).selectOption('CUSTOM');
            await sourceView('CLIENT').getByLabel('Data inicial', { exact: true }).fill('2026-03-05');
            await sourceView('CLIENT').getByLabel('Data final', { exact: true }).fill('2026-03-04');
            await expect(sourceView('CLIENT').getByRole('alert').filter({ hasText: 'Informe datas válidas' })).toBeVisible();
            await expect(metric('CLIENT', 'opened')).toHaveCount(0);
            await sourceView('CLIENT').getByLabel('Data final', { exact: true }).fill('2026-03-06');
            await expect(metric('CLIENT', 'opened')).toHaveText('0'); await expect(metric('CLIENT', 'in-progress')).toHaveText('1');
            assert(requests.some(r => r.path === '/tickets/statistics' && r.params.start === '2026-03-05T03:00:00.000Z' && r.params.end === '2026-03-07T03:00:00.000Z'));
            assert(!requests.some(r => r.path === '/tickets/statistics' && Date.parse(r.params.end) <= Date.parse(r.params.start)));
            assert.equal(page.url(), base + '/dashboard'); assert.deepEqual(errors, []);
        } finally { await context.close(); }
    });
    await run('Indicator failure leaves cards usable and retry recovers the summary', async () => {
        const failures = { '/tickets/statistics': true };
        const { context, page } = await setup({ failures });
        try {
            await page.clock.runFor(1200);
            const alert = page.locator('[data-ticket-source="INTERNAL"]').getByRole('alert').filter({ hasText: 'Não foi possível atualizar os indicadores' });
            await expect(alert).toBeVisible(); await expect(card(page, 'old')).toBeVisible();
            await card(page, 'old').getByRole('button', { name: /^Ver detalhes:/ }).click();
            await expect(detail(page)).toContainText('Descrição completa do pedido old.');
            await page.keyboard.press('Escape');
            delete failures['/tickets/statistics'];
            await alert.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
            await expect(page.locator('[data-ticket-source="INTERNAL"] [data-ticket-metric="opened"] [data-metric-value]')).toHaveText('2');
        } finally { await context.close(); }
    });
    await run('Five-hour internal threshold activates live on card and open popup without navigating or polling', async () => {
        const tickets = fixtures(); tickets.find(t => t.id === 'boundary').createdAt = new Date(fixedNow - (5 * 3_600_000 - 1_000)).toISOString();
        const { context, page, requests } = await setup({ tickets });
        try {
            await card(page, 'boundary').getByRole('button', { name: /^Ver detalhes:/ }).click();
            await expect(detail(page)).toContainText('Descrição completa do pedido boundary.');
            await expect(detail(page).getByText('Atenção: tempo limite excedido', { exact: true })).toHaveCount(0);
            const count = requests.filter(r => r.path === '/tickets' && r.params.status).length;
            await page.clock.setFixedTime(fixedNow + 2100);
            await page.clock.runFor(2100);
            await expect(card(page, 'boundary')).toHaveAttribute('data-attention', 'true');
            await expect(detail(page)).toContainText('Atenção: tempo limite excedido');
            assert.equal(requests.filter(r => r.path === '/tickets' && r.params.status).length, count);
            assert.equal(page.url(), base + '/dashboard');
        } finally { await context.close(); }
    });
    await run('Popup shows full description, messages and protected attachment; PIN actions stay separate and closure removes alert', async () => {
        const { context, page, requests } = await setup();
        try {
            await card(page, 'old').getByRole('button', { name: /^Ver detalhes:/ }).click();
            await expect(detail(page)).toContainText('Segunda linha com todos os detalhes.');
            await expect(detail(page)).toContainText('Mensagem completa do solicitante QA');
            const attachment = detail(page).getByRole('link', { name: /foto-qa.png/ });
            await expect(attachment).toHaveAttribute('href', 'http://127.0.0.1:3999/media/private/ticket/attachment-qa');
            await expect(attachment).toHaveAttribute('target', '_blank');
            await detail(page).getByRole('button', { name: 'Fechar detalhes', exact: true }).click();
            await card(page, 'old').getByRole('button', { name: 'Assumir', exact: true }).click();
            await expect(page.getByRole('heading', { name: 'Assumir Chamado', exact: true })).toBeVisible();
            await expect(detail(page)).toHaveCount(0);
            await page.getByPlaceholder('••••', { exact: true }).fill('1234');
            await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
            await expect(card(page, 'old').getByRole('button', { name: 'Finalizar', exact: true })).toBeVisible();
            await expect(card(page, 'old')).toHaveAttribute('data-attention', 'true');
            await expect(card(page, 'old')).toContainText('Impressora do financeiro');
            await card(page, 'old').getByRole('button', { name: 'Finalizar', exact: true }).click();
            await page.getByPlaceholder('Descreva o que foi feito para resolver o chamado...').fill('Resolução sintética de teste QA');
            await page.getByPlaceholder('••••', { exact: true }).fill('1234');
            await page.locator('[data-slot="dialog-content"]').getByRole('button', { name: 'Finalizar', exact: true }).click();
            await expect(card(page, 'old')).toHaveCount(0);
            await expect(page.getByRole('status').filter({ hasText: '1 chamado precisa' })).toBeVisible();
            assert.equal(requests.filter(r => r.method === 'PUT').length, 2);
        } finally { await context.close(); }
    });
    await run('Pagination includes older tickets beyond first 100; technician scope remains own assignments', async () => {
        const list = Array.from({ length: 101 }, (_, i) => ticket('page-' + i, { createdAt: date(i + 1) }));
        const data = await setup({ tickets: list });
        try {
            await expect(data.page.locator('[data-ticket-column="open"] article')).toHaveCount(101);
            assert.equal(await data.page.locator('[data-ticket-column="open"] article').first().getAttribute('data-ticket-id'), 'page-100');
            assert(data.requests.some(r => r.params.status === 'OPEN' && r.params.page === '2'));
        } finally { await data.context.close(); }
        const own = await setup({ role: 'Técnico', tickets: [...fixtures(), ticket('foreign', { status: 'IN_PROGRESS', assignedToInternalUserId: 'someone-else', createdAt: date(100) })] });
        try {
            await expect(card(own.page, 'progress')).toBeVisible(); await expect(card(own.page, 'foreign')).toHaveCount(0);
            assert(own.requests.some(r => r.params.status === 'IN_PROGRESS' && r.params.assignedToId === 'tech-qa'));
            await expect(own.page.locator('[data-ticket-source="CLIENT"] [data-ticket-metric="in-progress"] [data-metric-value]')).toHaveText('1');
            await expect(own.page.locator('[data-ticket-source="CLIENT"]').getByText(/Abertos para todos e atendimentos atribuídos a você/)).toBeVisible();
            await expect(own.page.getByRole('button', { name: 'Mover', exact: true })).toHaveCount(0);
        } finally { await own.context.close(); }
    });
    await run('Mobile popup and cards fit viewport; reduced motion retains static red and keyboard focus stays in popup', async () => {
        const { context, page, errors } = await setup({ viewport: { width: 390, height: 844 } });
        try {
            await expect(card(page, 'old')).toBeVisible();
            const normal = await card(page, 'old').evaluate(element => getComputedStyle(element).animationName); assert.notEqual(normal, 'none');
            await page.emulateMedia({ reducedMotion: 'reduce' });
            assert.equal(await card(page, 'old').evaluate(element => getComputedStyle(element).animationName), 'none');
            await card(page, 'old').getByRole('button', { name: /^Ver detalhes:/ }).click();
            await expect(detail(page)).toContainText('Mensagem completa do solicitante QA');
            await page.keyboard.press('Tab'); assert(await detail(page).evaluate(element => element.contains(document.activeElement)));
            await page.keyboard.press('Shift+Tab'); assert(await detail(page).evaluate(element => element.contains(document.activeElement)));
            assert(await detail(page).evaluate(element => { const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= window.innerWidth; }));
            assert(await detail(page).evaluate(element => element.clientHeight <= window.innerHeight));
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
            await page.screenshot({ path: path.join(shots, 'mobile-details.png'), animations: 'disabled' });
            await page.keyboard.press('Escape');
            await page.screenshot({ path: path.join(shots, 'mobile-dashboard.png'), fullPage: true, animations: 'disabled' });
            await page.locator('[data-ticket-source="INTERNAL"]').screenshot({ path: path.join(shots, 'mobile-internal-tickets.png'), animations: 'disabled' });
            assert.deepEqual(errors, []);
        } finally { await context.close(); }
    });
    await run('Query failure is visible and retry recovers; users without tickets.view do not load board or detail', async () => {
        const failures = { '/tickets/old': true }, data = await setup({ failures });
        try {
            await card(data.page, 'old').getByRole('button', { name: /^Ver detalhes:/ }).click();
            await data.page.clock.runFor(1200);
            await expect(detail(data.page).getByRole('alert')).toContainText('Não foi possível atualizar os detalhes');
            delete failures['/tickets/old'];
            await detail(data.page).getByRole('button', { name: 'Tentar novamente', exact: true }).click();
            await expect(detail(data.page)).toContainText('Descrição completa do pedido old.');
        } finally { await data.context.close(); }
        const denied = await setup({ role: 'Sem acesso QA', permissions: ['dashboard.view'] });
        try {
            await expect(denied.page.getByRole('heading', { name: /Usuário/ })).toBeVisible();
            await expect(denied.page.getByRole('region', { name: 'Chamados no dashboard' })).toHaveCount(0);
            assert(!denied.requests.some(r => r.path === '/tickets' || r.path.match(/^\/tickets\/(?:statistics|old|boundary|progress)$/)));
        } finally { await denied.context.close(); }
    });
    if (process.argv.includes('--projects') || process.argv.includes('--project-statistics') || process.argv.includes('--trips')) await require('./test-project-services-browser.cjs')({ run, browser, base, shots, fixedNow });
    if (process.argv.includes('--project-statistics') || process.argv.includes('--trips')) await require('./test-project-statistics-browser.cjs')({ run, browser, base, shots, fixedNow });
    if (process.argv.includes('--trips')) await require('./test-trips-browser.cjs')({ run, browser, base, shots, fixedNow });
    if (process.argv.includes('--custody')) await require('./test-inventory-custody-browser.cjs')({ run, browser, base, shots, fixedNow });
    if (process.argv.includes('--inventory-statistics')) await require('./test-inventory-statistics-browser.cjs')({ run, browser, base, shots, fixedNow });
    if (process.argv.includes('--panels')) await require('./test-personal-panels-browser.cjs')({ run, browser, base, shots, fixedNow });
    if (process.argv.includes('--panels')) await require('./test-vehicles-browser.cjs')({ run, browser, base, shots, fixedNow });
    if (process.argv.includes('--projects-agenda')) await require('./test-projects-agenda-browser.cjs')({ run, browser, base, shots, fixedNow });
    if (process.argv.includes('--structures')) await require('./test-structures-browser.cjs')({ run, browser, base, shots, fixedNow });
    if (process.argv.includes('--followup-search')) await require('./test-followup-company-search-browser.cjs')({ run, browser, base });
    if (process.argv.includes('--maintenance')) await require('./test-maintenance-list-browser.cjs')({ run, browser, base, fixedNow });
}
main().catch(error => { console.error(error); cases.push({ name: 'Harness startup', passed: false, error: error.message }); }).finally(async () => {
    if (browser) await browser.close();
    if (web) web.kill();
    const failed = cases.filter(test => !test.passed).length;
    fs.writeFileSync(path.join(shots, 'results.json'), JSON.stringify({ environment: 'Isolated Next + Chrome + synthetic intercepted API; no DB', passed: cases.length - failed, failed, cases }, null, 2));
    console.log(`Dashboard: ${cases.length - failed}/${cases.length} passed.`);
    process.exitCode = failed ? 1 : 0;
});
