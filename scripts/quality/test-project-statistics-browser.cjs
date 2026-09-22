/* Real isolated Next/Chrome, with synthetic HTTP responses and no database. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

module.exports = async ({ run, browser, base, shots, fixedNow }) => {
    const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
    const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));
    const metric = (page, key) => page.locator(`[data-project-metric="${key}"] [data-metric-value]`);
    const highlights = page => page.locator('[data-project-highlight]');
    const alert = page => page.locator('[role="alert"]:not(#__next-route-announcer__)');
    const statsRequests = data => data.requests.filter(request => request.path === '/project-services/statistics');
    async function setup({ mobile = false, empty = false, denied = false, failures = {}, unknown = false } = {}) {
        const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1100 }, timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
        const requests = [], errors = [], state = { bonus: 0 };
        await context.addInitScript(() => { localStorage.setItem('accessToken', 'synthetic-project-dashboard'); localStorage.setItem('userType', 'internal'); });
        await context.route('**/*', async route => {
            const request = route.request(), url = new URL(request.url());
            if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return route.abort();
            if (url.port !== '3999') return route.continue();
            if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,OPTIONS' } });
            requests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), method: request.method() });
            const respond = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true' }, body: JSON.stringify(value) });
            if (failures[url.pathname]) return respond({ error: { message: 'Falha sintética de consulta' } }, 503);
            if (url.pathname === '/auth/me') return respond({ data: { id: 'reader-qa', type: 'internal', name: 'Consulta projetos QA', role: { id: 'reader-role', name: 'Consulta QA' } } });
            if (url.pathname === '/auth/me/permissions') return respond({ data: denied ? ['dashboard.view'] : ['dashboard.view', 'schedule.view'] });
            if (url.pathname === '/tickets/my-internal/pending-rating') return respond({ data: null });
            if (url.pathname === '/trips/statistics') return respond({ data: { generatedAt: new Date(fixedNow).toISOString(), period: Object.fromEntries(url.searchParams), installationsCompleted: 0, removalsCompleted: 0, tripsPlanned: 0, tripsCompleted: 0, current: { plannedTrips: 0, tripsInProgress: 0 }, dataQuality: { servicesCompletedWithoutDate: 0, tripsCompletedWithoutDate: 0, travelWithoutBooking: 0, unclassified: 0 }, nextInstallations: [], relevantInstallations: [], latestInstallations: [], latestRemovals: [], nextInterstateTrips: [] } });
            if (url.pathname === '/project-services/statistics') {
                const type = url.searchParams.get('type'), start = Date.parse(url.searchParams.get('start')), end = Date.parse(url.searchParams.get('end'));
                const current = empty ? { total: 0, active: 0, pending: 0, scheduled: 0, inProgress: 0, done: 0, cancelled: 0 }
                    : type === 'INSTALLATION' ? { total: 8, active: 5, pending: 3, scheduled: 1, inProgress: 1, done: 2, cancelled: 1 }
                    : type === 'REMOVAL' ? { total: 4, active: 2, pending: 1, scheduled: 1, inProgress: 0, done: 1, cancelled: 1 }
                    : { total: 12, active: 7, pending: 4, scheduled: 2, inProgress: 1, done: 3, cancelled: 2 };
                if (!empty) { current.total += state.bonus + (unknown ? 1 : 0); current.active += state.bonus; current.pending += state.bonus; }
                const completed = [{ type: 'INSTALLATION', at: fixedNow - 2 * 86_400_000 }, { type: 'REMOVAL', at: fixedNow - 10 * 86_400_000 }];
                const cancelled = [{ type: 'REMOVAL', at: fixedNow - 3 * 86_400_000 }];
                const inPeriod = values => empty ? 0 : values.filter(value => (type === 'ALL' || value.type === type) && value.at >= start && value.at < end).length;
                const projects = Array.from({ length: 5 }, (_, index) => ({ id: 'highlight-' + index, projectId: 'project-' + index,
                    name: index === 0 ? (mobile ? 'Projeto ' + 'NomeExtenso'.repeat(15) : 'Instalação urgente QA') : 'Projeto acompanhamento QA ' + index,
                    companyName: 'Cliente acompanhamento QA', type: index % 2 ? 'REMOVAL' : 'INSTALLATION', status: index === 0 ? 'PENDING' : 'SCHEDULED',
                    markerName: index === 0 ? 'Sala interativa QA' : null, urgency: index === 0 ? 2 : 0, color: '#FF5500', relevant: index === 0,
                    startDate: index === 0 ? null : new Date(fixedNow + index * 86_400_000).toISOString(), endDate: index === 0 ? null : new Date(fixedNow + index * 86_400_000 + 3_600_000).toISOString() }));
                return respond({ data: { generatedAt: new Date(fixedNow).toISOString(), type, period: { start: url.searchParams.get('start'), end: url.searchParams.get('end') }, current,
                    completedInPeriod: inPeriod(completed), cancelledInPeriod: inPeriod(cancelled), dataQuality: { completedWithoutDate: empty || type === 'REMOVAL' ? 0 : 1, cancelledWithoutDate: 0, unclassified: unknown ? 1 : 0 },
                    highlights: empty ? [] : projects.filter(project => type === 'ALL' || project.type === type) } });
            }
            return respond({ data: [] });
        });
        const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
        await page.clock.install({ time: fixedNow }); await page.clock.setFixedTime(fixedNow);
        await page.goto(base + '/dashboard/projetos/painel');
        return { context, page, requests, errors, failures, state };
    }
    await run('Project dashboard UI: six contextual metrics, real-date gap warning and bounded read-only highlights', async () => {
        const data = await setup();
        try {
            const page = data.page;
            await expect(page.getByRole('heading', { name: 'Indicadores dos projetos', exact: true })).toBeVisible();
            for (const [key, value] of Object.entries({ active: 7, 'in-progress': 1, pending: 4, scheduled: 2, completed: 2, cancelled: 1 })) await expect(metric(page, key)).toHaveText(String(value));
            await expect(page.getByText('Histórico com informações pendentes')).toBeVisible();
            await expect(page.getByText(/sem data real\. Fora dos totais/)).toBeVisible();
            await expect(highlights(page)).toHaveCount(5); await expect(highlights(page).first()).toContainText('Sem agendamento');
            const first = highlights(page).first();
            assert(await first.locator('[data-service-marker]').evaluate(element => element.getBoundingClientRect().bottom <= element.nextElementSibling.getBoundingClientRect().top));
            await expect(page.getByRole('tab', { name: 'Projetos', exact: true })).toBeVisible(); await expect(page).toHaveURL(base + '/dashboard/projetos?aba=visao-geral');
            await expect(page.getByRole('button', { name: /Salvar|Novo projeto|Editar/ })).toHaveCount(0);
            assert(data.requests.every(request => request.method === 'GET'));
            assert(!data.requests.some(request => request.path === '/project-services' || request.path === '/project-services/options'));
            await page.screenshot({ path: path.join(shots, 'project-dashboard-desktop.png'), fullPage: true, animations: 'disabled' });
            assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
    await run('Project dashboard UI: service/period filters refresh history while retaining current backlog', async () => {
        const data = await setup();
        try {
            const page = data.page;
            await expect(metric(page, 'active')).toHaveText('7');
            await page.getByLabel('Serviço dos indicadores').selectOption('INSTALLATION');
            await expect(metric(page, 'active')).toHaveText('5'); await expect(metric(page, 'completed')).toHaveText('1');
            await expect(highlights(page)).toHaveCount(3);
            await page.getByLabel('Período dos indicadores').selectOption('TODAY');
            await expect(metric(page, 'completed')).toHaveText('0'); await expect(metric(page, 'pending')).toHaveText('3');
            await page.getByLabel('Serviço dos indicadores').selectOption('REMOVAL');
            await expect(metric(page, 'active')).toHaveText('2'); await expect(metric(page, 'pending')).toHaveText('1');
            await expect(highlights(page)).toHaveCount(2); assert.equal(statsRequests(data).at(-1).params.type, 'REMOVAL');
        } finally { await data.context.close(); }
    });
    await run('Project dashboard UI: custom local days become UTC bounds and invalid ranges suppress the query', async () => {
        const data = await setup();
        try {
            const page = data.page;
            await expect(metric(page, 'active')).toHaveText('7');
            await page.getByLabel('Período dos indicadores').selectOption('CUSTOM');
            await page.getByLabel('Data inicial').fill('2026-09-01'); await page.getByLabel('Data final').fill('2026-09-03');
            await expect.poll(() => statsRequests(data).at(-1)?.params.end).toBe('2026-09-04T03:00:00.000Z');
            assert.equal(statsRequests(data).at(-1).params.start, '2026-09-01T03:00:00.000Z');
            const count = statsRequests(data).length;
            await page.getByLabel('Data inicial').fill('2026-09-04');
            await expect(alert(page)).toContainText('Informe datas válidas');
            await page.clock.runFor(1200); assert.equal(statsRequests(data).length, count);
            await expect(page.locator('[data-project-metric]')).toHaveCount(0);
        } finally { await data.context.close(); }
    });
    await run('Project dashboard UI: confirmed zero, unknown status warning and denied permissions remain distinct', async () => {
        const empty = await setup({ empty: true });
        try { await expect(metric(empty.page, 'active')).toHaveText('0'); await expect(empty.page.getByText('Nenhum projeto cadastrado na gestão operacional para este serviço.')).toBeVisible(); await expect(highlights(empty.page)).toHaveCount(0); } finally { await empty.context.close(); }
        const unknown = await setup({ unknown: true });
        try { await expect(unknown.page.getByText('1 projeto com status não reconhecido. Consulte a gestão para conferir.')).toBeVisible(); } finally { await unknown.context.close(); }
        const denied = await setup({ denied: true });
        try { await expect(denied.page.getByText('Você não tem permissão para visualizar a agenda de projetos.')).toBeVisible(); assert(!statsRequests(denied).length); await expect(denied.page.locator('[data-project-metric]')).toHaveCount(0); } finally { await denied.context.close(); }
    });
    await run('Project dashboard UI: initial failure does not invent zeros; refetch failure retains flagged stale data and retry recovers', async () => {
        const initial = await setup({ failures: { '/project-services/statistics': true } });
        try {
            await initial.page.clock.runFor(2500); await expect(alert(initial.page)).toContainText('Não foi possível atualizar');
            await expect(initial.page.locator('[data-project-metric]')).toHaveCount(0);
            delete initial.failures['/project-services/statistics'];
            await initial.page.getByRole('button', { name: 'Tentar novamente' }).click(); await expect(metric(initial.page, 'active')).toHaveText('7');
        } finally { await initial.context.close(); }
        const stale = await setup();
        try {
            await expect(metric(stale.page, 'active')).toHaveText('7'); stale.failures['/project-services/statistics'] = true;
            await stale.page.getByRole('button', { name: 'Atualizar indicadores', exact: true }).click(); await stale.page.clock.runFor(2500);
            await expect(alert(stale.page)).toContainText('podem estar desatualizados'); await expect(metric(stale.page, 'active')).toHaveText('7');
            delete stale.failures['/project-services/statistics']; stale.state.bonus = 1;
            await stale.page.getByRole('button', { name: 'Tentar novamente' }).click(); await expect(metric(stale.page, 'active')).toHaveText('8'); await expect(alert(stale.page)).toHaveCount(0);
        } finally { await stale.context.close(); }
    });
    await run('Project dashboard UI: 30-second refresh updates values and rolling daily bounds follow midnight', async () => {
        const data = await setup();
        try {
            await expect(metric(data.page, 'active')).toHaveText('7'); const count = statsRequests(data).length; data.state.bonus = 1;
            await data.page.clock.runFor(61_000);
            await expect.poll(() => statsRequests(data).length).toBeGreaterThan(count);
            await expect(metric(data.page, 'active')).toHaveText('8');
            await data.page.getByLabel('Período dos indicadores').selectOption('TODAY');
            await expect(metric(data.page, 'completed')).toHaveText('0'); const before = statsRequests(data).at(-1).params.start;
            await data.page.clock.setSystemTime(fixedNow + 86_400_000); await data.page.clock.runFor(61_000);
            await expect.poll(() => statsRequests(data).at(-1)?.params.start).not.toBe(before);
        } finally { await data.context.close(); }
    });
    await run('Project dashboard UI: mobile long names fit the viewport and filter navigation works by keyboard', async () => {
        const data = await setup({ mobile: true });
        try {
            const page = data.page; await expect(metric(page, 'active')).toHaveText('7');
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
            await page.getByLabel('Serviço dos indicadores').focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
            await expect(page.getByLabel('Serviço dos indicadores')).toHaveValue('INSTALLATION'); await expect(metric(page, 'active')).toHaveText('5');
            await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Atualizar indicadores', exact: true }).focus();
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
            assert(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth + 1));
            assert(await highlights(page).evaluateAll(elements => elements.every(element => element.scrollWidth <= element.clientWidth + 1)));
            await page.screenshot({ path: path.join(shots, 'project-dashboard-mobile.png'), fullPage: true, animations: 'disabled' });
            await page.getByRole('region', { name: 'Projetos para acompanhar' }).screenshot({ path: path.join(shots, 'project-dashboard-mobile-highlights.png'), animations: 'disabled' });
            assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
};
if (require.main === module) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-dashboard.cjs'), '--project-statistics'], { stdio: 'inherit', windowsHide: true });
    process.exitCode = result.status ?? 1;
}
