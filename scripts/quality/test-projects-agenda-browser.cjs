/* Unified workspace: synthetic session/HTTP and isolated Next/Chrome only. */
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
module.exports = async ({ run, browser, base, shots, fixedNow }) => {
    const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
    const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));
    async function setup({ route = '/dashboard/projetos?aba=projetos', readonly = false, denied = false, external = false, mobile = false, many = false, empty = false, failDetail = false, failTeam = false, failProjects = false, failOperations = false } = {}) {
        const company = { id: crypto.randomUUID(), name: 'Cliente unificado QA' };
        const tech = { id: crypto.randomUUID(), name: 'Instalador unificado QA', email: 'qa@example.test', sector: 'Operações', agendaColor: '#2255AA', agendaActive: true };
        const start = new Date(Math.floor((fixedNow + 2 * 86400000) / 60000) * 60000).toISOString(), end = new Date(Date.parse(start) + 3600000).toISOString();
        const undated = { id: crypto.randomUUID(), projectId: crypto.randomUUID(), name: 'Projeto sem data unificado QA', company, type: 'INSTALLATION', status: 'PENDING', marker: null,
            urgency: 0, color: '#ABFF10', address: 'Rua teste, 100', city: 'São Paulo', state: 'SP', mapsUrl: null, notes: 'Todas as instruções unificadas QA', sectors: ['Operações'],
            requiresTravel: false, relevant: false, internalAssignees: [tech], contractors: [], schedule: null, createdAt: new Date(fixedNow).toISOString(), startedAt: null, completedAt: null, cancelledAt: null };
        const planned = { ...undated, id: crypto.randomUUID(), projectId: crypto.randomUUID(), name: 'Projeto agendado unificado QA', status: 'SCHEDULED', schedule: { id: crypto.randomUUID(), startDate: start, endDate: end } };
        const records = empty ? [] : [undated, planned];
        const choices = { companies: [company], projects: [], markers: [], internalUsers: [tech], contractors: [] };
        const event = index => ({ id: crypto.randomUUID(), title: index === 0 ? 'Compromisso avulso unificado QA' : 'Compromisso adicional QA ' + index,
            type: 'OTHER', status: 'SCHEDULED', startDate: start, endDate: end, address: null, notes: 'Notas avulsas QA', companyId: null, projectId: null,
            parentScheduleId: null, companyName: null, projectName: null, createdByName: null, installers: [tech] });
        const extras = Array.from({ length: empty ? 0 : many ? 102 : 1 }, (_, i) => event(i));
        const requests = [], errors = [], state = { failDetail, failTeam, failProjects, failOperations };
        const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1100 }, timezoneId: 'America/Sao_Paulo' });
        await context.addInitScript(() => { localStorage.setItem('accessToken', 'synthetic-unified-qa'); localStorage.setItem('userType', 'internal'); });
        await context.route('**/*', async interception => {
            const request = interception.request(), url = new URL(request.url());
            if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return interception.abort();
            if (url.port !== '3999') return interception.continue();
            const respond = (payload, status = 200) => interception.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }, body: JSON.stringify(payload) });
            if (request.method() === 'OPTIONS') return respond({});
            const body = request.postData() ? request.postDataJSON() : null;
            requests.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), method: request.method(), body });
            if (url.pathname === '/auth/me') return respond({ data: { id: 'unified-qa', name: 'Organizador QA', type: external ? 'external' : 'internal', role: { name: 'Gestor' } } });
            if (url.pathname === '/auth/me/permissions') return respond({ data: denied ? ['dashboard.view'] : readonly ? ['dashboard.view', 'schedule.view'] : ['dashboard.view', 'schedule.view', 'schedule.create', 'schedule.update', 'schedule.manage_installers'] });
            if (url.pathname.includes('pending-rating')) return respond({ data: null });
            if (url.pathname === '/project-services/statistics') return state.failProjects ? respond({ error: { message: 'Falha sintética dos indicadores de projetos QA' } }, 503) : respond({ data: {
                generatedAt: new Date(fixedNow).toISOString(), type: url.searchParams.get('type'), period: { start: url.searchParams.get('start'), end: url.searchParams.get('end') },
                current: { total: records.length, active: records.length, pending: records.filter(row => row.status === 'PENDING').length, scheduled: records.filter(row => row.status === 'SCHEDULED').length, inProgress: 0, done: 0, cancelled: 0 },
                completedInPeriod: 0, cancelledInPeriod: 0, dataQuality: { completedWithoutDate: 0, cancelledWithoutDate: 0, unclassified: 0 }, highlights: [],
            } });
            if (url.pathname === '/trips/statistics') return state.failOperations ? respond({ error: { message: 'Falha sintética dos indicadores de operações QA' } }, 503) : respond({ data: {
                generatedAt: new Date(fixedNow).toISOString(), period: { start: url.searchParams.get('start'), end: url.searchParams.get('end') }, installationsCompleted: 0, removalsCompleted: 0, tripsPlanned: 0, tripsCompleted: 0,
                current: { plannedTrips: 1, tripsInProgress: 0 }, dataQuality: { servicesCompletedWithoutDate: 0, tripsCompletedWithoutDate: 0, travelWithoutBooking: 0, unclassified: 0 },
                nextInstallations: [], relevantInstallations: [], latestInstallations: [], latestRemovals: [], nextInterstateTrips: [],
            } });
            if (url.pathname === '/trips') return respond({ data: [], total: 0, page: 1, limit: 50 });
            if (url.pathname === '/project-services/options') return respond({ data: choices });
            if (url.pathname === '/project-services') return respond({ data: records, total: records.length, page: 1, limit: 50 });
            if (/^\/project-services\/[^/]+$/.test(url.pathname)) {
                if (state.failDetail) return respond({ error: { message: 'Falha sintética de detalhe QA' } }, 503);
                const record = records.find(record => record.id === url.pathname.split('/').at(-1));
                if (!record) return respond({ error: { message: 'Projeto não encontrado QA' } }, 404);
                if (body) Object.assign(record, body, { schedule: { ...record.schedule, startDate: body.startDate, endDate: body.endDate } });
                return respond({ data: record });
            }
            if (url.pathname === '/schedule/installers') return state.failTeam ? respond({ error: { message: 'Falha sintética de equipe QA' } }, 503) : respond({ data: [tech] });
            if (url.pathname.startsWith('/schedule/installers/')) { Object.assign(tech, body); return respond({ data: tech }); }
            if (url.pathname === '/clients/companies') return respond({ data: [company] });
            if (url.pathname === '/schedule') {
                let rows = [...records.filter(record => record.schedule).map(record => ({ ...record.schedule, title: record.name, type: record.type, status: record.status,
                    address: record.address, notes: record.notes, companyId: company.id, projectId: record.projectId, companyName: company.name, projectName: record.name,
                    parentScheduleId: null, createdByName: null, installers: [tech], projectService: { id: record.id, projectId: record.projectId, marker: null, color: record.color,
                        urgency: 0, requiresTravel: false, contractors: [] } })), ...extras];
                rows = rows.filter(row => (!url.searchParams.get('status') || row.status === url.searchParams.get('status')) && (!url.searchParams.get('type') || row.type === url.searchParams.get('type')));
                const limit = Number(url.searchParams.get('limit') || 100), page = Number(url.searchParams.get('page') || 1);
                return respond({ data: rows.slice((page - 1) * limit, page * limit), total: rows.length });
            }
            return respond({ data: [] });
        });
        const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); await page.goto(base + route);
        return { context, page, requests, errors, records, state, start, end, tech };
    }
    const tab = (page, name) => page.getByRole('tab', { name, exact: true });
    const popup = page => page.getByRole('dialog');
    const event = (page, name) => page.locator('.fc-event').filter({ hasText: name }).first();
    const writes = data => data.requests.filter(request => ['POST', 'PUT', 'DELETE'].includes(request.method));

    await run('Unified R3: root opens both dashboards, one sidebar entry and shared period refreshes both endpoints', async () => {
        const s = await setup({ route: '/dashboard/projetos' }); try {
            await expect(tab(s.page, 'Visão geral')).toHaveAttribute('aria-selected', 'true');
            await expect(s.page.getByRole('tab')).toHaveCount(5);
            await expect(s.page.locator('[data-project-metric="active"] [data-metric-value]')).toHaveText('2');
            await expect(s.page.locator('[data-operation-metric="installations"] [data-metric-value]')).toHaveText('0');
            await expect(s.page.locator('[data-operation-metric="planned-trips"] [data-metric-value]')).toHaveText('1');
            await expect(s.page.locator('[data-operation-metric="planned-trips-in-period"] [data-metric-value]')).toHaveText('0');
            await expect(s.page.getByRole('region', { name: 'Operação atual', exact: true })).toContainText('inclusive as programadas para datas futuras');
            await expect(s.page.getByRole('link', { name: 'Projetos e Agenda', exact: true })).toHaveCount(1);
            await expect(s.page.getByRole('link', { name: 'Viagens', exact: true })).toHaveCount(0);
            await expect(s.page.getByRole('heading', { level: 1 })).toHaveCount(1);
            await s.page.getByLabel('Período dos indicadores').selectOption('TODAY');
            await expect.poll(() => s.requests.filter(row => row.path === '/trips/statistics').length).toBeGreaterThan(1);
            const latest = path => s.requests.filter(row => row.path === path).at(-1).query;
            assert.equal(latest('/project-services/statistics').start, latest('/trips/statistics').start);
            assert.equal(latest('/project-services/statistics').end, latest('/trips/statistics').end);
            await s.page.screenshot({ path: path.join(shots, 'unified-r3-overview.png'), fullPage: true, animations: 'disabled' });
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Unified R3: genuine empty projects, trips and indicators remain informative without failure notices', async () => {
        const s = await setup({ route: '/dashboard/projetos', empty: true, mobile: true }); try {
            await expect(s.page.locator('[data-project-metric="active"] [data-metric-value]')).toHaveText('0');
            await expect(s.page.locator('[data-operation-metric="installations"] [data-metric-value]')).toHaveText('0');
            assert(await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            await tab(s.page, 'Projetos').click(); await expect(s.page.getByText(/Nenhum projeto encontrado/)).toBeVisible();
            await s.page.getByRole('button', { name: 'Novo projeto', exact: true }).click();
            await popup(s.page).getByRole('combobox', { name: 'Cliente', exact: true }).click();
            const companyOption = popup(s.page).getByRole('option', { name: 'Cliente unificado QA', exact: true });
            await expect(companyOption).toBeVisible(); await companyOption.click();
            await s.page.keyboard.press('Escape');
            await tab(s.page, 'Viagens').click(); await expect(s.page.getByText(/Nenhuma viagem encontrada/)).toBeVisible();
            await expect(s.page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveCount(0);
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Unified R3: legacy links canonicalize within the workspace and retain natural tab navigation', async () => {
        const s = await setup(); try {
            for (const [route, section, name] of [['/dashboard/viagens', 'viagens', 'Viagens'], ['/dashboard/operacoes', 'visao-geral', 'Visão geral'], ['/dashboard/projetos/painel', 'visao-geral', 'Visão geral'], ['/dashboard/projetos/estruturas', 'projetos', 'Projetos']]) {
                await s.page.goto(base + route);
                await expect.poll(() => new URL(s.page.url()).pathname).toBe('/dashboard/projetos');
                assert.equal(new URL(s.page.url()).searchParams.get('aba'), section);
                await expect(tab(s.page, name)).toHaveAttribute('aria-selected', 'true');
                if (route.endsWith('estruturas')) { assert.equal(new URL(s.page.url()).searchParams.get('historico'), '1'); await expect(s.page.getByRole('heading', { name: 'Histórico de instalações', exact: true })).toBeVisible(); }
                await tab(s.page, 'Agenda').click(); await expect(tab(s.page, 'Agenda')).toHaveAttribute('aria-selected', 'true');
            }
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Unified R3: failure of one dashboard preserves the other; recovery and project list work in the same area', async () => {
        const s = await setup({ route: '/dashboard/projetos', failProjects: true }); try {
            const project = s.page.getByRole('region', { name: 'Indicadores dos projetos', exact: true }), operations = s.page.getByRole('region', { name: 'Instalações e viagens', exact: true });
            await expect(project.getByRole('alert')).toContainText('Não foi possível atualizar');
            await expect(project.locator('[data-project-metric]')).toHaveCount(0);
            await expect(operations.locator('[data-operation-metric="installations"] [data-metric-value]')).toHaveText('0');
            await expect(operations.getByRole('alert')).toHaveCount(0);
            s.state.failProjects = false; await project.getByRole('button', { name: 'Tentar novamente' }).click();
            await expect(project.locator('[data-project-metric="active"] [data-metric-value]')).toHaveText('2');
            await tab(s.page, 'Projetos').click(); await expect(s.page.locator('tbody tr')).toHaveCount(2);
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });

    await run('Unified workspace: one menu entry, five URL sections, project management and old agenda link remain usable', async () => {
        const s = await setup(); try {
            await expect(s.page.getByRole('heading', { name: 'Projetos e Agenda', exact: true })).toBeVisible();
            await expect(s.page.getByRole('link', { name: 'Projetos e Agenda', exact: true })).toHaveCount(1);
            await expect(s.page.getByRole('link', { name: 'Agenda', exact: true })).toHaveCount(0);
            await expect(s.page.getByRole('tab')).toHaveCount(5); await expect(tab(s.page, 'Projetos')).toHaveAttribute('aria-selected', 'true');
            await expect(s.page.locator('tbody tr').filter({ hasText: s.records[0].name })).toContainText('Sem agendamento');
            await s.page.goto(base + '/dashboard/agenda'); await expect(tab(s.page, 'Agenda')).toHaveAttribute('aria-selected', 'true');
            await expect(s.page.getByText('Compromisso avulso unificado QA', { exact: true })).toBeVisible();
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Unified workspace: complete calendar shares full project editor, saves same service and shows changes in project list', async () => {
        const s = await setup(); try {
            await tab(s.page, 'Agenda').click(); await expect(event(s.page, s.records[1].name)).toBeVisible(); await expect(event(s.page, s.records[0].name)).toHaveCount(0);
            await expect(event(s.page, 'Compromisso avulso unificado QA')).toBeVisible();
            await s.page.screenshot({ path: path.join(shots, 'unified-agenda-desktop.png'), animations: 'disabled' });
            await event(s.page, s.records[1].name).click(); await expect(popup(s.page).getByRole('heading', { name: 'Editar projeto' })).toBeVisible();
            await expect(popup(s.page).getByLabel('Observações')).toHaveValue(s.records[1].notes);
            await popup(s.page).getByLabel('Nome do projeto').fill('Projeto atualizado unificado QA');
            await popup(s.page).getByLabel('Observações').fill('Orientações alteradas pela agenda QA'); await popup(s.page).getByRole('button', { name: 'Salvar projeto' }).click();
            await expect(popup(s.page)).toHaveCount(0); await expect(event(s.page, 'Projeto atualizado unificado QA')).toBeVisible();
            const changed = writes(s); assert.equal(changed.length, 1); assert.equal(changed[0].path, '/project-services/' + s.records[1].id); assert.equal(changed[0].method, 'PUT');
            assert.equal(changed[0].body.startDate, s.start); assert.equal(changed[0].body.endDate, s.end);
            await tab(s.page, 'Projetos').click(); await expect(tab(s.page, 'Projetos')).toHaveAttribute('aria-selected', 'true');
            await expect(s.page.getByLabel('Buscar projeto pelo nome')).toBeVisible();
            await expect(s.page.locator('tbody tr').filter({ hasText: 'Projeto atualizado unificado QA' })).toBeVisible();
            // Another operator changed the service after its detail was cached.
            s.records[1].notes = 'Atualização de outro usuário QA';
            await tab(s.page, 'Agenda').click(); await expect(event(s.page, s.records[1].name)).toBeVisible(); await event(s.page, s.records[1].name).click();
            await expect(popup(s.page).getByLabel('Observações')).toHaveValue('Atualização de outro usuário QA');
            assert(s.requests.filter(request => request.path === '/project-services/' + s.records[1].id && request.method === 'GET').length >= 2);
            assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Unified workspace: calendar filters cover every schedule page and list/browser navigation use same scope', async () => {
        const s = await setup({ route: '/dashboard/projetos?aba=agenda&visao=lista', many: true }); try {
            await expect(s.page.getByText('Compromisso adicional QA 101', { exact: true })).toBeVisible(); assert(s.requests.some(request => request.path === '/schedule' && request.query.page === '2'));
            await s.page.getByLabel('Tipo dos agendamentos').selectOption('INSTALLATION'); await expect(s.page.getByText('Compromisso adicional QA 101', { exact: true })).toHaveCount(0);
            await s.page.getByRole('button', { name: 'Calendário', exact: true }).click();
            const projectEvent = event(s.page, s.records[1].name);
            await expect(projectEvent).toBeVisible();
            await expect(projectEvent).toHaveClass(/fc-event-project-color/);
            await expect(projectEvent).toHaveCSS('background-color', 'rgb(171, 255, 16)');
            assert.notEqual(await projectEvent.evaluate(element => getComputedStyle(element).textShadow), 'none', 'Project event text keeps a dark outline over light colors');
            await expect(event(s.page, 'Compromisso avulso unificado QA')).toHaveCount(0);
            await expect(s.page.getByLabel('Tipo dos agendamentos')).toHaveValue('INSTALLATION');
            await s.page.goBack(); await expect(s.page.getByRole('button', { name: 'Calendário', exact: true })).toBeVisible(); await expect(s.page.getByText(s.records[1].name, { exact: true })).toBeVisible();
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Unified workspace: direct team section only queries installers; readonly controls and failures recover without fake empty result', async () => {
        const s = await setup({ route: '/dashboard/projetos?aba=equipe', readonly: true }); try {
            await expect(s.page.getByText(s.tech.name, { exact: true })).toBeVisible();
            assert(!s.requests.some(request => request.path === '/schedule' || request.path.startsWith('/project-services')));
            await expect(s.page.getByRole('button', { name: /Salvar/ })).toHaveCount(0); assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
            await expect(s.page.getByRole('button', { name: 'Ativo', exact: true })).toBeDisabled();
        } finally { await s.context.close(); }
        const failed = await setup({ failTeam: true }); try {
            await expect(failed.page.getByLabel('Buscar projeto pelo nome')).toBeVisible();
            await expect(failed.page.getByRole('button', { name: 'Novo projeto', exact: true })).toBeEnabled();
            await tab(failed.page, 'Equipe').click();
            const alert = failed.page.getByRole('alert').filter({ hasText: 'Não foi possível carregar a equipe' });
            await expect(alert).toBeVisible();
            await expect(failed.page.getByText('Nenhum colaborador cadastrado')).toHaveCount(0);
            failed.state.failTeam = false; await alert.getByRole('button', { name: 'Tentar novamente' }).click();
            await expect(failed.page.getByText(failed.tech.name, { exact: true })).toBeVisible();
            await failed.page.getByRole('button', { name: 'Ativo', exact: true }).click(); await failed.page.getByRole('button', { name: 'Salvar', exact: true }).click();
            await expect(failed.page.getByRole('button', { name: 'Salvar', exact: true })).toHaveCount(0);
            const changed = writes(failed); assert.equal(changed.length, 1); assert.equal(changed[0].path, '/schedule/installers/' + failed.tech.id); assert.equal(changed[0].body.agendaActive, false);
            const previousOptions = failed.requests.filter(request => request.path === '/project-services/options').length;
            await tab(failed.page, 'Projetos').click(); await expect(tab(failed.page, 'Projetos')).toHaveAttribute('aria-selected', 'true');
            await expect.poll(() => failed.requests.filter(request => request.path === '/project-services/options').length).toBeGreaterThan(previousOptions);
        } finally { await failed.context.close(); }
    });
    await run('Unified workspace: project detail failure stays in popup, retry uses canonical editor and readonly cannot mutate', async () => {
        const s = await setup({ route: '/dashboard/projetos?aba=agenda', readonly: true, failDetail: true }); try {
            await expect(event(s.page, s.records[1].name)).toBeVisible(); await event(s.page, s.records[1].name).click();
            await expect(popup(s.page).getByRole('alert')).toContainText('Não foi possível carregar o projeto');
            s.state.failDetail = false; await popup(s.page).getByRole('button', { name: 'Tentar novamente' }).click();
            await expect(popup(s.page).getByLabel('Observações')).toBeDisabled(); await expect(popup(s.page).getByRole('button', { name: 'Salvar projeto' })).toHaveCount(0);
            await s.page.keyboard.press('Escape'); await expect(popup(s.page)).toHaveCount(0); await expect(tab(s.page, 'Agenda')).toHaveAttribute('aria-selected', 'true');
            await expect(s.page.locator('.fc-event-draggable')).toHaveCount(0); assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Unified workspace: unauthorized/external audiences never load operational data on either entry', async () => {
        for (const settings of [{ denied: true }, { route: '/dashboard/agenda', external: true }]) {
            const s = await setup(settings); try {
                await expect(s.page.getByText('Você não tem permissão para visualizar a agenda de projetos.')).toBeVisible();
                assert(!s.requests.some(request => request.path === '/schedule' || request.path.startsWith('/project-services') || request.path === '/schedule/installers'));
                await expect(s.page.getByRole('tablist')).toHaveCount(0);
            } finally { await s.context.close(); }
        }
    });
    await run('Unified workspace: keyboard section navigation, URL reload and mobile calendar fit without navigation writes', async () => {
        const s = await setup({ mobile: true }); try {
            await tab(s.page, 'Projetos').focus(); await s.page.keyboard.press('ArrowRight'); await expect(tab(s.page, 'Agenda')).toBeFocused();
            await expect(tab(s.page, 'Agenda')).toHaveAttribute('aria-selected', 'true'); await expect(event(s.page, s.records[1].name)).toBeVisible();
            assert(new URL(s.page.url()).searchParams.get('aba') === 'agenda'); await s.page.reload(); await expect(tab(s.page, 'Agenda')).toHaveAttribute('aria-selected', 'true');
            await expect(event(s.page, s.records[1].name)).toBeVisible(); assert(await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            await s.page.screenshot({ path: path.join(shots, 'unified-agenda-mobile.png'), animations: 'disabled' });
            await tab(s.page, 'Equipe').click(); await expect(s.page.getByText(s.tech.name, { exact: true })).toBeVisible();
            await s.page.keyboard.press('Home'); await expect(tab(s.page, 'Visão geral')).toHaveAttribute('aria-selected', 'true'); assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
};
