/* Browser behavior uses synthetic loopback reads and mirror management only. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
module.exports = async ({ run, browser, base, shots, fixedNow }) => {
    const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
    const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));
    const token = 'P'.repeat(43), all = ['atendimentos', 'projetos', 'operacoes', 'estoque'];
    async function setup({ query = '', permissions = ['dashboard.view', 'tickets.view', 'schedule.view', 'inventory.view'], views = all, mirror = false, mobile = false, loggedOut = false, fail = {}, empty = false, malformed = false, legacy = false, former = false } = {}) {
        const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1100 }, timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
        const requests = [], errors = [], state = { fail, empty, malformed, bonus: 0, active: false, generatedViews: all, views };
        await context.addCookies([{ name: 'mirrorMustOmit', value: 'synthetic-cookie', domain: '127.0.0.1', path: '/', httpOnly: true }]);
        await context.addInitScript(({ loggedOut }) => { if (!loggedOut) { localStorage.setItem('accessToken', 'synthetic-personal-panel-qa'); localStorage.setItem('userType', 'internal'); } }, { loggedOut });
        const ticket = { id: '10000000-0000-4000-8000-000000000001', title: 'Chamado completo no painel QA', description: 'Descrição integral do chamado QA', source: 'INTERNAL', status: 'OPEN', priority: 'HIGH', createdAt: new Date(fixedNow - 80 * 60000).toISOString(), firstResponseAt: null, internalUser: { name: 'Solicitante painel QA', sector: 'Financeiro' }, externalUser: null, company: null, assignedTo: null, attachments: [], messages: [], closedAt: null, rating: null, resolutionNotes: null, assignedToInternalUserId: null };
        await context.route('**/*', async route => {
            const request = route.request(), url = new URL(request.url());
            if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return route.abort();
            if (url.port !== '3999') return route.continue();
            const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS' }, body: JSON.stringify(data) });
            if (request.method() === 'OPTIONS') return respond({});
            const params = Object.fromEntries(url.searchParams), method = request.method(), headers = request.headers();
            requests.push({ path: url.pathname, params, method, headers, body: request.postData() ? request.postDataJSON() : null });
            const publicRoot = '/panel-mirrors/' + token, isPublic = url.pathname.startsWith(publicRoot);
            if (isPublic && state.fail.metadata) return respond({ error: { message: 'Espelho revogado QA' } }, 404);
            if (url.pathname === '/auth/me') return respond({ data: { id: 'personal-panel-qa', type: 'internal', name: 'Usuário painel QA', role: { name: 'Gestor' } } });
            if (url.pathname === '/auth/me/permissions') return respond({ data: permissions });
            if (url.pathname.includes('pending-rating')) return respond({ data: null });
            if (url.pathname === publicRoot) return respond({ data: { views: state.views } });
            if (url.pathname === '/personal-panel/mirror') {
                if (state.fail.management) return respond({ error: { message: 'Falha ao salvar link QA' } }, 503);
                if (method === 'POST') { state.active = true; state.generatedViews = request.postDataJSON().views; return respond({ data: { path: '/painel/espelho/' + token, views: state.generatedViews } }, 201); }
                if (method === 'DELETE') { state.active = false; return respond({ data: null }); }
                return respond({ data: { active: state.active, views: state.generatedViews, updatedAt: null } });
            }
            if (url.pathname === '/tickets' || url.pathname === publicRoot + '/tickets') return respond({ data: params.status === 'OPEN' ? [ticket] : [], total: params.status === 'OPEN' ? 1 : 0, page: 1, limit: 100 });
            if (url.pathname === '/tickets/' + ticket.id || url.pathname === publicRoot + '/tickets/' + ticket.id) return respond({ data: ticket });
            if (url.pathname === '/vehicles/statistics') return state.fail.vehicles ? respond({error:{message:'Carros indisponíveis QA'}},state.fail.vehicles) : respond({ data: { generatedAt: new Date(fixedNow).toISOString(), activeVehicles: state.empty ? 0 : 2, occupiedVehicles: state.empty ? 0 : 1, availableVehicles: state.empty ? 0 : 1, upcoming: [], current: [] } });
            if (url.pathname === '/schedule') return respond({ data: state.empty ? [] : [{ id: 'upcoming-qa', title: 'Visita à unidade QA', type: 'INSTALLATION', status: 'SCHEDULED', startDate: new Date(fixedNow + 3600000).toISOString(), endDate: new Date(fixedNow + 7200000).toISOString(), companyName: 'Cliente agenda QA', projectName: 'Próximo projeto QA', installers: [{ id: 'installer-qa', name: 'Equipe agenda QA' }], address: 'Endereço agenda QA', notes: 'Detalhes do compromisso QA' }], total: state.empty ? 0 : 1 });
            const period = { start: params.start, end: params.end }, generatedAt = new Date(fixedNow).toISOString();
            const data = {
                atendimentos: { generatedAt, period, source: params.source || 'ALL', scope: 'ALL', openedInPeriod: 1, closedInPeriod: 0, current: { pending: 1, inProgress: 0, waitingClient: 0, resolved: 0, needingAttention: 1, averagePendingSeconds: 4800, oldestPendingAt: ticket.createdAt }, sectors: [{ source: 'INTERNAL', name: 'Financeiro', openedInPeriod: 1 }] },
                projetos: { generatedAt, period, type: 'ALL', current: { total: state.empty ? 0 : 5, active: state.empty ? 0 : 4 + state.bonus, pending: state.empty ? 0 : 1, scheduled: state.empty ? 0 : 2, inProgress: state.empty ? 0 : 1, done: state.empty ? 0 : 1, cancelled: 0 }, completedInPeriod: state.empty ? 0 : 1, cancelledInPeriod: 0, dataQuality: { completedWithoutDate: 0, cancelledWithoutDate: 0, unclassified: 0 }, highlights: [] },
                operacoes: state.malformed ? {} : { generatedAt, period, installationsCompleted: 0, removalsCompleted: 0, tripsCompleted: 0, tripsPlanned: 0, current: { plannedTrips: 0, tripsInProgress: 0 }, dataQuality: { servicesCompletedWithoutDate: 0, tripsCompletedWithoutDate: 0, travelWithoutBooking: 0, unclassified: 0 }, nextInstallations: [], relevantInstallations: [], latestInstallations: [], latestRemovals: [], nextInterstateTrips: [] },
                estoque: { generatedAt, period: { start: new Date(fixedNow - 30 * 86400000).toISOString(), end: generatedAt }, context: 'ALL', location: null, totals: { skus: 6, assets: 40, unlocated: 2, unclassified: 1 }, scope: { assets: 38, available: 8, maintenance: 2 }, movements: [], topEntries: [{ skuId: 'stock-qa', skuCode: '895001', name: 'Produto em uso QA', quantity: 20 }], topExits: [], priorities: [], criticalCount: 0, minimumConfiguredCount: 0, replenishmentConfigured: false }
            };
            const view = url.pathname === '/tickets/statistics' ? 'atendimentos' : params.view;
            if (state.fail[view]) return respond({ error: { message: 'Falha sintética QA' } }, 503);
            if (url.pathname === '/tickets/statistics') return respond({ data: data.atendimentos });
            if (url.pathname.endsWith('/statistics') && view) return respond({ data: { view, data: data[view] } });
            return respond({ data: [] });
        });
        const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); await page.clock.install({ time: fixedNow });
        const pathname = mirror ? '/painel/espelho/' + token : legacy ? '/painel' : former ? '/dashboard/painel' : '/dashboard';
        const response = await page.goto(base + pathname + (query ? '?' + query : ''));
        if (mirror) await expect(page.getByRole('heading', { name: 'Painel de acompanhamento', exact: true })).toBeVisible(); else if (!loggedOut) await expect(page.getByRole('heading', { level: 1 })).toContainText('Usuário');
        return { context, page, requests, errors, state, response };
    }
    const selected = page => page.locator('[data-panel-view]');
    const metric = (page, key) => page.locator('[data-project-metric="' + key + '"] [data-metric-value]');
    const viewNav = page => page.locator('nav[aria-label="Visões do painel de acompanhamento"], nav[aria-label="Indicadores operacionais da dashboard"]');
    await run('Dashboard cars: missing service is a notice without fake zero indicators; recovery restores real summary', async () => {
        const s = await setup({fail:{vehicles:404}}), card = s.page.locator('[data-dashboard-summary="carros"]');
        await expect(card.getByRole('status')).toContainText('A área de carros ainda não está disponível para uso.');
        await expect(card.getByRole('alert')).toHaveCount(0);await expect(card.locator('[data-vehicle-metric]')).toHaveCount(0);
        await expect(card.getByText('Nenhum carro cadastrado.',{exact:true})).toHaveCount(0);
        s.state.fail.vehicles=false;await card.getByRole('button',{name:'Tentar novamente',exact:true}).click();
        await expect(card.locator('[data-vehicle-metric="available"] [data-metric-value]')).toHaveText('1');
        await expect(card.getByRole('status')).toHaveCount(0);assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Dashboard cars: successful empty statistics show zeros and empty state without a failure', async () => {
        const s = await setup({empty:true}), card = s.page.locator('[data-dashboard-summary="carros"]');
        await expect(card.getByText('Nenhum carro cadastrado.',{exact:true})).toBeVisible();
        await expect(card.locator('[data-vehicle-metric="available"] [data-metric-value]')).toHaveText('0');
        await expect(card.locator('[data-vehicle-metric="occupied"] [data-metric-value]')).toHaveText('0');
        await expect(card.getByRole('alert')).toHaveCount(0);assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Monitoring panel: dashboard consolidates ticket actions, operational views and link settings without rotating authenticated content', async () => {
        const s = await setup();
        await expect(s.page.getByRole('link', { name: 'Painel pessoal', exact: true })).toHaveCount(0);
        await expect(s.page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
        await expect(s.page.locator('[data-monitoring-panel]')).toHaveCount(0);
        await expect(s.page.locator('[data-dashboard-summary]')).toHaveCount(5);
        await expect(s.page.locator('[data-inventory-metric="total"] [data-metric-value]')).toHaveText('40');
        await expect(s.page.locator('[data-stock-classification]')).toContainText('sem classificação');
        await expect(s.page.locator('[data-stock-classification]').getByRole('link', { name: 'Identificar locais', exact: true })).toHaveAttribute('href', '/dashboard/estoque/clientes?aba=locais');
        await expect(viewNav(s.page).getByRole('button')).toHaveCount(0);
        await expect(s.page.getByRole('link', { name: 'Abrir estoque', exact: true })).toHaveAttribute('href', '/dashboard/estoque');
        for (const name of ['Visão anterior', 'Próxima visão', 'Atualizar dados', 'Copiar link desta visão', 'Retomar rotação', 'Pausar rotação']) await expect(s.page.getByRole('button', { name, exact: true })).toHaveCount(0);
        await expect(s.page.getByLabel('Intervalo de troca')).toHaveCount(0);
        await expect(s.page.locator('[data-ticket-id]')).toHaveCount(1);
        await s.page.getByRole('button', { name: 'Assumir', exact: true }).click();
        await expect(s.page.getByRole('heading', { name: 'Assumir Chamado', exact: true })).toBeVisible();
        await s.page.locator('[data-slot="dialog-content"]').getByRole('button', { name: 'Cancelar', exact: true }).click();
        await expect(metric(s.page, 'active')).toHaveText('4');
        await expect(s.page.getByRole('link', { name: 'Abrir projetos', exact: true })).toHaveAttribute('href', '/dashboard/projetos?aba=projetos');
        await s.page.clock.runFor(61000); await expect(s.page.locator('[data-dashboard-summary]')).toHaveCount(5);
        await expect(s.page.locator('[data-ticket-id]')).toHaveCount(1);
        await expect(s.page.getByRole('button', { name: 'Espelho por link', exact: true })).toBeVisible();
        const request = s.requests.find(r => r.path === '/schedule'); assert.equal(request.params.status, 'SCHEDULED'); assert.equal(request.params.limit, '5'); assert(Date.parse(request.params.startDate) >= fixedNow);
        await s.page.locator('[data-upcoming-schedule="upcoming-qa"]').click(); await expect(s.page.getByRole('dialog')).toContainText('Detalhes do compromisso QA');
        await s.page.keyboard.press('Escape'); await expect(s.page.getByRole('dialog')).toHaveCount(0); await expect(s.page).toHaveURL(base + '/dashboard');
        assert(s.requests.filter(r => r.path === '/personal-panel/statistics').every(r => r.headers.authorization));
        assert.deepEqual(s.errors, []); await s.context.close();
    });
    await run('Monitoring panel: both former authenticated addresses redirect to the dashboard without obsolete rotation parameters', async () => {
        for (const option of [{ legacy: true }, { former: true }]) {
            const s = await setup({ ...option, query: 'visao=estoque&intervalo=30&pausado=1' });
            await expect(s.page).toHaveURL(base + '/dashboard');
            await expect(s.page.locator('[data-dashboard-summary="estoque"]')).toBeVisible();
            await expect(s.page.getByRole('button', { name: 'Espelho por link', exact: true })).toBeVisible();
            await s.context.close();
        }
    });
    await run('Monitoring panel: rotation stays fixed at sixty seconds regardless of legacy interval; refresh never resets the timer', async () => {
        const s = await setup({ mirror: true, loggedOut: true, query: 'visao=projetos&intervalo=30&pausado=0' }); await expect(metric(s.page, 'active')).toHaveText('4');
        s.state.bonus = 1; await s.page.clock.runFor(35000); await expect(metric(s.page, 'active')).toHaveText('5'); await expect(selected(s.page)).toHaveAttribute('data-panel-view', 'projetos');
        await s.page.clock.runFor(26000); await expect(selected(s.page)).toHaveAttribute('data-panel-view', 'operacoes'); await s.context.close();
    });
    await run('Monitoring panel: manual selection pauses rotation, persists on reload and the player resumes one-minute changes', async () => {
        const s = await setup({ mirror: true, loggedOut: true, query: 'visao=projetos&pausado=0' }); await expect(metric(s.page, 'active')).toHaveText('4');
        await viewNav(s.page).getByRole('button', { name: 'Instalações e viagens', exact: true }).click(); await expect(selected(s.page)).toHaveAttribute('data-panel-view', 'operacoes');
        await s.page.clock.runFor(65000); await expect(selected(s.page)).toHaveAttribute('data-panel-view', 'operacoes');
        await s.page.goto(base + '/painel/espelho/' + token); await expect(selected(s.page)).toHaveAttribute('data-panel-view', 'operacoes');
        await s.page.getByRole('button', { name: 'Retomar rotação', exact: true }).click(); await s.page.clock.runFor(61000); await expect(selected(s.page)).toHaveAttribute('data-panel-view', 'estoque'); await s.context.close();
    });
    await run('Monitoring panel: description popup holds automatic rotation, retains overdue red alert and resumes after closing', async () => {
        const s = await setup({ mirror: true, loggedOut: true, query: 'visao=atendimentos&pausado=0' }); const card = s.page.locator('[data-ticket-id]');
        await expect(card).toHaveAttribute('data-attention', 'true'); await card.getByRole('button', { name: 'Ver detalhes:', exact: false }).click();
        await expect(s.page.getByRole('dialog')).toContainText('Descrição integral do chamado QA');
        await s.page.clock.runFor(65000); await expect(selected(s.page)).toHaveAttribute('data-panel-view', 'atendimentos');
        await s.page.keyboard.press('Escape'); await expect(s.page.getByRole('dialog')).toHaveCount(0); await s.page.clock.runFor(61000); await expect(selected(s.page)).toHaveAttribute('data-panel-view', 'projetos');
        assert(!s.requests.some(r => /media|attachments/.test(r.path))); await s.context.close();
    });
    await run('Monitoring panel: empty projects and operations remain successful and show no misleading failure messages', async () => {
        const s = await setup({ empty: true }); await expect(metric(s.page, 'active')).toHaveText('0');
        await expect(s.page.getByRole('button', { name: 'Tentar novamente', exact: true })).toHaveCount(0);
        await expect(s.page.locator('[data-operation-metric]')).toHaveCount(2);
        await expect(s.page.getByText('Nenhum compromisso futuro agendado.', { exact: true })).toBeVisible();
        await expect(s.page.getByRole('button', { name: 'Tentar novamente', exact: true })).toHaveCount(0); assert.deepEqual(s.errors, []); await s.context.close();
    });
    await run('Monitoring panel: a real initial load failure does not invent zeros or block other dashboard views and tickets', async () => {
        const s = await setup({ query: 'visao=estoque&pausado=1', fail: { estoque: true } }); await s.page.clock.runFor(5000);
        await expect(s.page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible(); await expect(s.page.locator('[data-inventory-metric]')).toHaveCount(0);
        await expect(metric(s.page, 'active')).toHaveText('4'); s.state.fail = {};
        const retry = s.page.getByRole('button', { name: 'Tentar novamente', exact: true }); await retry.click();
        await expect(s.page.locator('[data-inventory-metric="total"] [data-metric-value]')).toHaveText('40'); await expect(s.page.getByRole('button', { name: 'Retomar rotação', exact: true })).toHaveCount(0); await expect(s.page.locator('[data-ticket-id]')).toHaveCount(1); await s.context.close();
    });
    await run('Monitoring panel: a rendering failure is isolated and other dashboard summaries remain usable', async () => {
        const s = await setup({ malformed: true }); await expect(s.page.getByText('As outras continuam disponíveis.', { exact: false })).toBeVisible();
        await expect(metric(s.page, 'active')).toHaveText('4'); await expect(s.page.locator('[data-inventory-metric="total"] [data-metric-value]')).toHaveText('40'); await s.context.close();
    });
    await run('Monitoring panel: mirror is isolated and sends neither user tokens nor cookies, even when the browser has an account session', async () => {
        const s = await setup({ mirror: true, query: 'visao=estoque&pausado=1' }); await expect(s.page.locator('[data-inventory-metric="total"] [data-metric-value]')).toHaveText('40');
        await expect(s.page.getByRole('link', { name: 'Painel pessoal', exact: true })).toHaveCount(0); await expect(s.page.getByRole('button', { name: 'Espelho por link', exact: true })).toHaveCount(0);
        assert(s.requests.length > 0); assert(s.requests.every(r => r.path.startsWith('/panel-mirrors/') && r.method === 'GET' && !r.headers.authorization && !r.headers.cookie && !r.headers.referer));
        assert.equal(await s.page.evaluate(() => localStorage.getItem('accessToken')), 'synthetic-personal-panel-qa');
        assert.equal(s.response.headers()['referrer-policy'], 'no-referrer'); assert.match(s.response.headers()['x-robots-tag'], /noindex/); assert.match(s.response.headers()['cache-control'], /no-store/);
        assert(new URL(s.page.url()).pathname.endsWith(token)); await s.context.close();
    });
    await run('Monitoring panel: dashboard and mirror settings respect account permissions and logged-out access requests no operational data', async () => {
        const scoped = await setup({ permissions: ['tickets.view'] });
        await expect(selected(scoped.page)).toHaveCount(0); await expect(scoped.page.locator('[data-ticket-id]')).toHaveCount(1);
        await scoped.page.getByRole('button', { name: 'Espelho por link', exact: true }).click();
        await expect(scoped.page.getByRole('dialog').getByRole('checkbox')).toHaveCount(1);
        assert(!scoped.requests.some(r => r.path === '/personal-panel/statistics')); await scoped.context.close();
        for (const permissions of [['inventory.view'], ['schedule.view']]) {
            const s = await setup({ permissions }); const expected = permissions[0] === 'inventory.view' ? 'estoque' : 'projetos';
            await expect(s.page.locator('[data-dashboard-summary]')).toHaveCount(expected === 'estoque' ? 1 : 4);
            await expect(viewNav(s.page).getByRole('button')).toHaveCount(0);
            await expect(s.page.locator('[data-ticket-id]')).toHaveCount(0);
            assert(s.requests.filter(r => r.path === '/personal-panel/statistics').every(r => expected === 'estoque' ? r.params.view === 'estoque' : ['projetos','operacoes'].includes(r.params.view)));
            assert(!s.requests.some(r => r.path === '/tickets/statistics' || r.path === '/tickets')); await s.context.close();
        }
        for (const option of [{ loggedOut: true }, { permissions: [] }]) {
            const s = await setup(option); await expect(selected(s.page)).toHaveCount(0);
            if (option.loggedOut) await expect(s.page).toHaveURL(base + '/'); else await expect(s.page.getByRole('button', { name: 'Espelho por link', exact: true })).toHaveCount(0);
            assert(!s.requests.some(r => /statistics|panel-mirrors|\/tickets$/.test(r.path))); await s.context.close();
        }
    });
    await run('Monitoring panel: invalid and unavailable mirror links expose no dashboard data or account navigation', async () => {
        const s = await setup({ mirror: true, loggedOut: true, fail: { metadata: true } }); await expect(selected(s.page)).toHaveCount(0); await expect(s.page.getByRole('link')).toHaveCount(0);
        const before = s.requests.length; await s.page.goto(base + '/painel/espelho/invalid-token'); await expect(s.page.getByRole('alert').filter({ hasText: 'Este espelho está indisponível' })).toBeVisible(); assert.equal(s.requests.length, before);
        assert(!s.requests.some(r => r.path.includes('statistics'))); await s.context.close();
    });
    await run('Monitoring panel: allowed views constrain the mirror and invalid selection falls back without querying denied data', async () => {
        const s = await setup({ mirror: true, loggedOut: true, views: ['atendimentos'], query: 'visao=estoque&pausado=1' }); await expect(selected(s.page)).toHaveAttribute('data-panel-view', 'atendimentos');
        await expect(viewNav(s.page).getByRole('button')).toHaveCount(1); await expect(s.page.locator('[data-ticket-id]')).toHaveCount(1);
        assert(!s.requests.some(r => r.params.view && r.params.view !== 'atendimentos')); await s.context.close();
    });
    await run('Monitoring panel: revoked mirror hides cached content after metadata refresh and has no login/navigation links', async () => {
        const s = await setup({ mirror: true, loggedOut: true, query: 'visao=estoque&pausado=1' }); await expect(s.page.locator('[data-inventory-metric="total"] [data-metric-value]')).toHaveText('40');
        s.state.fail.metadata = true; await s.page.clock.runFor(16000); await expect(selected(s.page)).toHaveCount(0); await expect(s.page.getByRole('alert').filter({ hasText: 'Este espelho está indisponível' })).toBeVisible();
        await expect(s.page.getByRole('link')).toHaveCount(0); await s.context.close();
    });
    await run('Monitoring panel: changes to mirror permissions never resume a manual pause or consult a removed view', async () => {
        const s = await setup({ mirror: true, loggedOut: true, query: 'visao=projetos&pausado=0' }); await expect(metric(s.page, 'active')).toHaveText('4');
        await viewNav(s.page).getByRole('button', { name: 'Estoque', exact: true }).click(); await expect(selected(s.page)).toHaveAttribute('data-panel-view', 'estoque');
        s.state.views = ['atendimentos', 'estoque']; await s.page.clock.runFor(16000); await expect(viewNav(s.page).getByRole('button')).toHaveCount(2);
        await expect(s.page.getByRole('button', { name: 'Retomar rotação', exact: true })).toBeVisible(); await s.page.clock.runFor(65000); await expect(selected(s.page)).toHaveAttribute('data-panel-view', 'estoque');
        s.state.views = ['atendimentos']; await s.page.clock.runFor(16000); await expect(selected(s.page)).toHaveAttribute('data-panel-view', 'atendimentos'); await expect(s.page.getByRole('button', { name: 'Retomar rotação', exact: true })).toBeVisible();
        await s.context.close();
    });
    await run('Monitoring panel: generating and revoking the anonymous mirror is explicit; copy contains no account credential', async () => {
        const s = await setup({ query: 'visao=estoque&pausado=1' }); assert(!s.requests.some(r => r.path === '/personal-panel/mirror'));
        await s.page.getByRole('button', { name: 'Espelho por link', exact: true }).click(); const d = s.page.getByRole('dialog'); await expect(d.getByRole('button', { name: 'Gerar link', exact: true })).toBeEnabled();
        assert(s.requests.filter(r => r.path === '/personal-panel/mirror').every(r => r.method === 'GET'));
        await d.getByRole('checkbox', { name: 'Projetos', exact: true }).uncheck(); await d.getByRole('button', { name: 'Gerar link', exact: true }).click();
        await expect(d.getByLabel('Link do espelho', { exact: true })).toHaveValue(base + '/painel/espelho/' + token);
        const mutation = s.requests.find(r => r.method === 'POST'); assert.deepEqual(mutation.body.views, ['atendimentos', 'operacoes', 'estoque']);
        await d.getByRole('button', { name: 'Copiar link do espelho', exact: true }).click(); const copied = await s.page.evaluate(() => navigator.clipboard.readText()); assert.equal(copied, base + '/painel/espelho/' + token); assert(!copied.includes('synthetic'));
        await d.getByRole('button', { name: 'Revogar link', exact: true }).click(); await expect(d.getByLabel('Link do espelho', { exact: true })).toHaveCount(0); await expect(d.getByRole('button', { name: 'Gerar link', exact: true })).toBeEnabled();
        await s.page.keyboard.press('Escape'); await expect(d).toHaveCount(0); await s.context.close();
    });
    await run('Monitoring panel: mirror management failure preserves selections and can be retried', async () => {
        const s = await setup({ query: 'visao=estoque&pausado=1', fail: { management: false } }); await s.page.getByRole('button', { name: 'Espelho por link', exact: true }).click(); const d = s.page.getByRole('dialog');
        await expect(d.getByRole('button', { name: 'Gerar link', exact: true })).toBeEnabled(); await d.getByRole('checkbox', { name: 'Projetos', exact: true }).uncheck(); s.state.fail.management = true;
        await d.getByRole('button', { name: 'Gerar link', exact: true }).click(); await expect(d.getByText('Falha ao salvar link QA', { exact: true })).toBeVisible(); await expect(d.getByRole('checkbox', { name: 'Projetos', exact: true })).not.toBeChecked();
        s.state.fail.management = false; await d.getByRole('button', { name: 'Gerar link', exact: true }).click(); await expect(d.getByLabel('Link do espelho', { exact: true })).toBeVisible(); await s.context.close();
    });
    await run('Monitoring panel: mobile mirror fits width and player remains at the lower corner; desktop account retains normal navigation', async () => {
        const mobile = await setup({ mirror: true, loggedOut: true, mobile: true, query: 'visao=estoque&pausado=1' }); await expect(mobile.page.locator('[data-inventory-metric="total"] [data-metric-value]')).toHaveText('40');
        assert(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); const box = await mobile.page.getByRole('button', { name: 'Retomar rotação', exact: true }).boundingBox(); assert(box.y + box.height <= 844 && box.x + box.width <= 390);
        await mobile.page.screenshot({ path: path.join(shots, 'personal-panel-mobile.png'), fullPage: true, animations: 'disabled' }); assert.deepEqual(mobile.errors, []); await mobile.context.close();
        const desktop = await setup(); await expect(desktop.page.locator('[data-inventory-metric="total"] [data-metric-value]')).toHaveText('40'); await desktop.page.screenshot({ path: path.join(shots, 'dashboard-desktop.png'), fullPage: true, animations: 'disabled' });
        await desktop.page.getByRole('heading', { name: 'Visão operacional', exact: true }).scrollIntoViewIfNeeded();
        await desktop.page.screenshot({ path: path.join(shots, 'dashboard-operational-overview-desktop.png'), animations: 'disabled' }); assert.deepEqual(desktop.errors, []); await desktop.context.close();
    });
    await run('Monitoring panel: operational indicators and mirror settings fit the authenticated mobile dashboard without automatic rotation', async () => {
        const s = await setup({ mobile: true }); await expect(s.page.locator('[data-inventory-metric="total"] [data-metric-value]')).toHaveText('40');
        await s.page.getByRole('button', { name: 'Espelho por link', exact: true }).click();
        await expect(s.page.getByRole('dialog').getByRole('checkbox')).toHaveCount(4);
        await s.page.keyboard.press('Escape'); await expect(s.page.getByRole('dialog')).toHaveCount(0);
        await s.page.getByRole('heading', { name: 'Visão operacional', exact: true }).scrollIntoViewIfNeeded();
        assert(await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await s.page.screenshot({ path: path.join(shots, 'dashboard-operational-overview-mobile.png'), animations: 'disabled' });
        await expect(metric(s.page, 'active')).toHaveText('4');
        await s.page.clock.runFor(65000); await expect(s.page.locator('[data-dashboard-summary]')).toHaveCount(5);
        await expect(s.page.locator('[data-ticket-id]')).toHaveCount(1);
        assert(await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); assert.deepEqual(s.errors, []); await s.context.close();
    });
};
if (require.main === module) { const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-dashboard.cjs'), '--panels'], { stdio: 'inherit', windowsHide: true }); process.exitCode = result.status ?? 1; }
