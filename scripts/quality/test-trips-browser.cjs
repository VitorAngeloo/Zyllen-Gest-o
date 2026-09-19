/* Isolated Next and Chrome, synthetic loopback HTTP only; no DB or credentials. */
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

module.exports = async ({ run, browser, base, shots, fixedNow }) => {
    const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
    const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));
    const tech = { id: crypto.randomUUID(), name: 'Técnico viagens QA', agendaColor: '#2266AA' }, contractor = { id: crypto.randomUUID(), name: 'Terceirizado viagens QA' };
    const start = new Date(fixedNow + 2 * 86_400_000).toISOString(), end = new Date(fixedNow + 4 * 86_400_000).toISOString();
    const localTime = iso => new Date(Date.parse(iso) - 3 * 3_600_000).toISOString().slice(0, 16);
    const dialog = page => page.getByRole('dialog'), cards = page => page.locator('[data-trip-card]');
    const metric = (page, key) => page.locator(`[data-operation-metric="${key}"] [data-metric-value]`);
    const alert = page => page.locator('[role="alert"]:not(#__next-route-announcer__)');
    async function setup({ route = '/dashboard/viagens', mobile = false, denied = false, readonly = false, empty = false, many = false, agendaMany = false, conflict = false, failures = {} } = {}) {
        const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1100 }, timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
        const permissions = denied ? ['dashboard.view'] : ['dashboard.view', 'schedule.view', ...(!readonly ? ['schedule.create', 'schedule.update', 'schedule.delete'] : [])];
        const choices = { internalUsers: [tech], contractors: [contractor], services: Array.from({ length: 3 }, (_, index) => ({ id: crypto.randomUUID(), name: ['Instalação vinculada QA', 'Instalação nova QA', 'Desinstalação nova QA'][index], companyName: 'Cliente viagens QA', type: index === 2 ? 'REMOVAL' : 'INSTALLATION', tripId: null })) };
        function record(extra = {}) { return { id: crypto.randomUUID(), scheduleId: crypto.randomUUID(), title: 'Viagem para cliente QA', originCity: 'São Paulo', originState: 'SP', destinationCity: 'Rio de Janeiro', destinationState: 'RJ', interstate: true,
            status: 'SCHEDULED', startDate: start, endDate: end, internalAssignees: [tech], contractors: [], services: [], startedAt: null, completedAt: null, cancelledAt: null, notes: 'Orientações completas da viagem QA', createdAt: new Date(fixedNow).toISOString(), ...extra }; }
        const records = empty ? [] : Array.from({ length: agendaMany ? 101 : many ? 51 : 2 }, (_, index) => record({ title: index === 0 ? mobile ? 'Viagem ' + 'NomeExtenso'.repeat(12) : 'Viagem para cliente QA' : 'Viagem regional QA ' + index, destinationCity: index === 0 ? 'Rio de Janeiro' : 'Campinas', destinationState: index === 0 ? 'RJ' : 'SP', interstate: index === 0 }));
        if (records.length) { choices.services[0].tripId = records[0].id; records[0].services = [choices.services[0]]; }
        const state = { conflict, bonus: 0 }, requests = [], errors = [];
        await context.addInitScript(() => { localStorage.setItem('accessToken', 'synthetic-trips-qa'); localStorage.setItem('userType', 'internal'); });
        await context.route('**/*', async routing => {
            const request = routing.request(), url = new URL(request.url());
            if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return routing.abort();
            if (url.port !== '3999') return routing.continue();
            const respond = (data, status = 200) => routing.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' }, body: JSON.stringify(data) });
            if (request.method() === 'OPTIONS') return respond({});
            const body = request.postData() ? request.postDataJSON() : undefined;
            requests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), method: request.method(), body });
            if (failures[url.pathname]) return respond({ error: { message: 'Falha sintética viagens QA' } }, 503);
            if (url.pathname === '/auth/me') return respond({ data: { id: 'trips-reader-qa', type: 'internal', name: 'Viagens QA', role: { id: 'role-qa', name: 'Viagens QA' } } });
            if (url.pathname === '/auth/me/permissions') return respond({ data: permissions });
            if (url.pathname === '/tickets/my-internal/pending-rating') return respond({ data: null });
            if (url.pathname === '/trips/options') return respond({ data: choices });
            if (url.pathname === '/schedule/installers') return respond({ data: [{ ...tech, email: 'synthetic@example.test', sector: 'Operações', agendaActive: true }] });
            if (url.pathname === '/schedule' && request.method() === 'GET') return respond({ data: records.slice((Number(url.searchParams.get('page') || 1) - 1) * 100, Number(url.searchParams.get('page') || 1) * 100).map(trip => ({ id: trip.scheduleId, title: trip.title, type: 'OTHER', status: trip.status, startDate: trip.startDate, endDate: trip.endDate,
                address: null, notes: trip.notes, companyId: null, projectId: null, parentScheduleId: null, companyName: null, projectName: null, createdByName: 'Viagens QA', installers: trip.internalAssignees,
                projectService: null, trip: { id: trip.id, originCity: trip.originCity, originState: trip.originState, destinationCity: trip.destinationCity, destinationState: trip.destinationState, contractors: trip.contractors } })), total: records.length });
            if (url.pathname === '/project-services/statistics') return respond({ data: { generatedAt: new Date(fixedNow).toISOString(), type: url.searchParams.get('type'), period: { start: url.searchParams.get('start'), end: url.searchParams.get('end') }, current: { total: 0, active: 0, pending: 0, scheduled: 0, inProgress: 0, done: 0, cancelled: 0 }, completedInPeriod: 0, cancelledInPeriod: 0, dataQuality: { completedWithoutDate: 0, cancelledWithoutDate: 0, unclassified: 0 }, highlights: [] } });
            if (url.pathname === '/trips/statistics') {
                const initial = Date.parse(url.searchParams.get('start')), final = Date.parse(url.searchParams.get('end'));
                const inPeriod = at => at >= initial && at < final;
                const highlights = empty ? [] : Array.from({ length: 5 }, (_, index) => ({ id: 'op-service-' + index, projectId: 'op-project-' + index, name: index === 0 && mobile ? 'Instalação ' + 'SemEspacos'.repeat(18) : 'Instalação operacional ' + index,
                    companyName: 'Cliente operações QA', type: 'INSTALLATION', status: index === 0 ? 'PENDING' : 'SCHEDULED', markerName: index === 0 ? 'Sala interativa QA' : null, urgency: index === 0 ? 2 : 0, color: '#55CCAA', relevant: true,
                    startDate: index === 0 ? null : start, endDate: index === 0 ? null : end, completedAt: null }));
                const latest = highlights.map((value, index) => ({ ...value, id: 'latest-' + index, status: 'DONE', completedAt: new Date(fixedNow - (index + 1) * 86_400_000).toISOString() })).filter(value => inPeriod(Date.parse(value.completedAt)));
                return respond({ data: { generatedAt: new Date(fixedNow).toISOString(), period: { start: url.searchParams.get('start'), end: url.searchParams.get('end') },
                    installationsCompleted: empty ? 0 : latest.length + state.bonus, removalsCompleted: empty ? 0 : latest.length, tripsPlanned: empty ? 0 : inPeriod(Date.parse(start)) ? 2 : 0, tripsCompleted: empty ? 0 : inPeriod(fixedNow - 2 * 86_400_000) ? 1 : 0,
                    current: { plannedTrips: empty ? 0 : 2, tripsInProgress: empty ? 0 : 1 }, dataQuality: { servicesCompletedWithoutDate: empty ? 0 : 1, tripsCompletedWithoutDate: empty ? 0 : 1, travelWithoutBooking: empty ? 0 : 2, unclassified: 0 },
                    nextInstallations: highlights.filter(value => value.startDate), relevantInstallations: highlights, latestInstallations: latest, latestRemovals: latest.map(value => ({ ...value, type: 'REMOVAL', id: 'removal-' + value.id })),
                    nextInterstateTrips: empty ? [] : records.filter(value => value.interstate).slice(0, 5).map(value => ({ ...value, serviceCount: value.services.length })) } });
            }
            const match = url.pathname.match(/^\/trips(?:\/([^/]+)(?:\/(status))?)?$/);
            if (match) {
                const existing = records.find(value => value.id === match[1]);
                if (request.method() === 'GET' && match[1]) return existing ? respond({ data: existing }) : respond({ error: { message: 'Não encontrada' } }, 404);
                if (request.method() === 'GET') {
                    const filtered = records.filter(value => (!url.searchParams.get('interstate') || String(value.interstate) === url.searchParams.get('interstate'))
                        && (!url.searchParams.get('status') || value.status === url.searchParams.get('status')) && (!url.searchParams.get('search') || value.title.toLowerCase().includes(url.searchParams.get('search').toLowerCase())));
                    const page = Number(url.searchParams.get('page') || 1), limit = Number(url.searchParams.get('limit') || 50);
                    return respond({ data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit });
                }
                if (match[2]) {
                    existing.status = body.status;
                    if (body.status === 'IN_PROGRESS') existing.startedAt = new Date(fixedNow).toISOString();
                    if (body.status === 'DONE') existing.completedAt = new Date(fixedNow).toISOString();
                    if (body.status === 'SCHEDULED') { existing.startedAt = null; existing.completedAt = null; existing.cancelledAt = null; }
                    return respond({ data: existing });
                }
                if (state.conflict && !body.allowConflicts) return respond({ error: { message: 'Há conflito de horário para um responsável. Confira e confirme a viagem com conflito.' } }, 409);
                const value = { ...record(), ...existing, ...body, interstate: body.originState !== body.destinationState,
                    internalAssignees: choices.internalUsers.filter(user => body.installerIds.includes(user.id)), contractors: choices.contractors.filter(user => body.contractorIds.includes(user.id)), services: choices.services.filter(service => body.serviceIds.includes(service.id)) };
                if (existing) Object.assign(existing, value); else records.push(value);
                return respond({ data: value }, existing ? 200 : 201);
            }
            return respond({ data: [] });
        });
        const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
        await page.clock.install({ time: fixedNow }); await page.clock.setFixedTime(fixedNow); await page.goto(base + route);
        return { context, page, choices, records, state, requests, failures, errors };
    }
    async function fillNew(page, { crew = true } = {}) {
        const popup = dialog(page);
        await popup.getByLabel('Nome da viagem').fill('Viagem cadastrada UI QA');
        await popup.getByLabel('Cidade de origem').fill('São Paulo'); await popup.getByLabel('UF de origem').selectOption('SP');
        await popup.getByLabel('Cidade de destino').fill('Rio de Janeiro'); await popup.getByLabel('UF de destino').selectOption('RJ');
        await popup.getByLabel('Saída prevista').fill(localTime(start)); await popup.getByLabel('Retorno previsto').fill(localTime(end));
        if (crew) await popup.getByLabel(contractor.name).check();
    }
    await run('Travel UI: full route, dates, executors, linked services and private notes remain available in the popup', async () => {
        const data = await setup();
        try {
            await expect(cards(data.page)).toHaveCount(2); await expect(cards(data.page).first()).toContainText('São Paulo/SP → Rio de Janeiro/RJ');
            await expect(cards(data.page).first()).toContainText('1 serviço(s) vinculado(s)'); await expect(cards(data.page).first()).toContainText(tech.name);
            await cards(data.page).first().getByRole('button', { name: 'Ver viagem' }).click();
            await expect(dialog(data.page).getByLabel('Observações da viagem')).toHaveValue('Orientações completas da viagem QA'); await expect(dialog(data.page).getByLabel('Instalação vinculada QA', { exact: false })).toBeChecked();
            await expect(dialog(data.page)).toContainText('Saída real'); await expect(dialog(data.page)).toContainText('Ainda não registrada');
            await data.page.keyboard.press('Escape'); await expect(dialog(data.page)).toHaveCount(0); await expect(data.page).toHaveURL(base + '/dashboard/projetos?aba=viagens');
            await data.page.screenshot({ path: path.join(shots, 'trips-desktop.png'), fullPage: true, animations: 'disabled' }); assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
    await run('Travel UI: agenda creates contractor-only trip with multiple services and correct local-to-UTC planning', async () => {
        const data = await setup({ route: '/dashboard/agenda' });
        try {
            await data.page.getByRole('button', { name: 'Nova viagem', exact: true }).click(); await fillNew(data.page);
            await dialog(data.page).getByRole('checkbox', { name: /^Instalação nova QA/ }).check(); await dialog(data.page).getByRole('checkbox', { name: /^Desinstalação nova QA/ }).check();
            await dialog(data.page).getByLabel('Observações da viagem').fill('Roteiro completo UI QA'); await dialog(data.page).getByRole('button', { name: 'Salvar viagem' }).click(); await expect(dialog(data.page)).toHaveCount(0);
            const request = data.requests.find(value => value.path === '/trips' && value.method === 'POST');
            assert.deepEqual(request.body.installerIds, []); assert.deepEqual(request.body.contractorIds, [contractor.id]); assert.equal(request.body.serviceIds.length, 2);
            assert.equal(request.body.startDate.slice(0, 16), start.slice(0, 16)); assert.equal(request.body.endDate.slice(0, 16), end.slice(0, 16)); assert.equal(request.body.notes, 'Roteiro completo UI QA');
            assert(!data.requests.some(value => value.path === '/schedule' && value.method === 'POST'));
            await data.page.getByRole('button', { name: 'Calendário', exact: true }).click(); const event = data.page.locator('.fc-event').filter({ hasText: 'Viagem cadastrada UI QA' }).first(); await expect(event).toContainText('Viagem'); await event.click();
            await expect(dialog(data.page).getByLabel('Nome da viagem')).toHaveValue('Viagem cadastrada UI QA'); await expect(dialog(data.page).getByLabel(contractor.name)).toBeChecked(); assert.deepEqual(data.errors, []);
            await data.page.screenshot({ path: path.join(shots, 'trip-calendar-popup.png'), animations: 'disabled' });
            await data.page.keyboard.press('Escape'); await data.page.locator('.zyllen-calendar').getByRole('button', { name: /lista/i }).click();
            const listEvent = data.page.locator('.fc-event').filter({ hasText: 'Viagem cadastrada UI QA' }).first();
            if (!await listEvent.count()) await data.page.locator('.zyllen-calendar .fc-next-button').click();
            await expect(listEvent).toContainText(contractor.name);
        } finally { await data.context.close(); }
    });
    await run('Travel UI: validation retains the draft; conflict confirmation is explicit and cleared after a plan edit', async () => {
        const data = await setup({ conflict: true });
        try {
            await data.page.getByRole('button', { name: 'Nova viagem', exact: true }).click(); await fillNew(data.page, { crew: false });
            await dialog(data.page).getByRole('button', { name: 'Salvar viagem' }).click(); await expect(dialog(data.page).getByRole('alert')).toContainText('Selecione pelo menos um responsável');
            assert(!data.requests.some(value => value.path === '/trips' && value.method === 'POST'));
            await dialog(data.page).getByLabel(contractor.name).check(); await dialog(data.page).getByRole('button', { name: 'Salvar viagem' }).click(); await expect(dialog(data.page).getByRole('alert')).toContainText('conflito de horário');
            const override = dialog(data.page).getByLabel(/Conferi a agenda/); await override.check(); await dialog(data.page).getByLabel('Nome da viagem').fill('Viagem ajustada UI QA'); await expect(override).toHaveCount(0);
            await dialog(data.page).getByRole('button', { name: 'Salvar viagem' }).click(); await expect(dialog(data.page).getByRole('alert')).toContainText('conflito de horário'); await override.check();
            await dialog(data.page).getByRole('button', { name: 'Salvar viagem' }).click(); await expect(dialog(data.page)).toHaveCount(0);
            assert.equal(data.requests.filter(value => value.path === '/trips' && value.method === 'POST').at(-1).body.allowConflicts, true);
        } finally { await data.context.close(); }
    });
    await run('Travel UI: real departure/return require confirmation, route is locked in progress and reopening starts another attempt', async () => {
        const data = await setup();
        try {
            const first = cards(data.page).first(); await first.getByRole('button', { name: 'Ver viagem' }).click(); await dialog(data.page).getByRole('button', { name: 'Iniciar viagem' }).click();
            await expect(dialog(data.page).getByRole('alert')).toContainText('saída real'); assert(!data.requests.some(value => value.path.endsWith('/status')));
            await dialog(data.page).getByRole('button', { name: 'Confirmar ação' }).click(); await expect(dialog(data.page)).toHaveCount(0); await expect(first).toContainText('Em viagem');
            await first.getByRole('button', { name: 'Ver viagem' }).click(); await expect(dialog(data.page).getByLabel('Cidade de origem')).toBeDisabled();
            await dialog(data.page).getByRole('button', { name: 'Finalizar viagem' }).click(); await dialog(data.page).getByRole('button', { name: 'Confirmar ação' }).click(); await expect(dialog(data.page)).toHaveCount(0); await expect(first).toContainText('Realizada');
            await first.getByRole('button', { name: 'Ver viagem' }).click(); await expect(dialog(data.page).getByRole('button', { name: 'Salvar viagem' })).toHaveCount(0);
            await dialog(data.page).getByRole('button', { name: 'Reabrir como planejada' }).click(); await expect(dialog(data.page).getByRole('alert')).toContainText('histórico de auditoria'); await dialog(data.page).getByRole('button', { name: 'Confirmar ação' }).click(); await expect(dialog(data.page)).toHaveCount(0);
            assert.deepEqual(data.requests.filter(value => value.path.endsWith('/status') && value.method === 'PUT').map(value => value.body.status), ['IN_PROGRESS', 'DONE', 'SCHEDULED']);
        } finally { await data.context.close(); }
    });
    await run('Travel UI: read-only mobile details fit, trap keyboard focus, close with Escape and prevent calendar dragging/writes', async () => {
        const data = await setup({ mobile: true, readonly: true });
        try {
            await expect(data.page.getByRole('button', { name: 'Nova viagem', exact: true })).toHaveCount(0); const trigger = cards(data.page).first().getByRole('button', { name: 'Ver viagem' }); await trigger.click();
            await expect(dialog(data.page).getByLabel('Observações da viagem')).toBeDisabled(); await expect(dialog(data.page).getByRole('button', { name: 'Iniciar viagem' })).toHaveCount(0);
            assert.equal(await dialog(data.page).evaluate(element => element.scrollTop), 0, 'Read-only popup opens at the heading, not the footer');
            await data.page.screenshot({ path: path.join(shots, 'trip-mobile-details-top.png'), animations: 'disabled' });
            await dialog(data.page).getByRole('button', { name: 'Fechar', exact: true }).focus(); await data.page.keyboard.press('Tab'); assert(await dialog(data.page).evaluate(element => element.contains(document.activeElement)));
            assert(await dialog(data.page).evaluate(element => element.getBoundingClientRect().right <= innerWidth && element.getBoundingClientRect().left >= 0 && element.scrollWidth <= element.clientWidth));
            await data.page.screenshot({ path: path.join(shots, 'trip-mobile-details.png'), animations: 'disabled' }); await data.page.keyboard.press('Escape'); await expect(dialog(data.page)).toHaveCount(0); await expect(trigger).toBeFocused();
            await data.page.goto(base + '/dashboard/agenda'); await data.page.getByRole('button', { name: 'Calendário', exact: true }).click(); await expect(data.page.locator('.fc-event').first()).toBeVisible(); await expect(data.page.locator('.fc-event-draggable')).toHaveCount(0);
            await data.page.locator('.fc-event').first().click(); await expect(dialog(data.page).getByLabel('Cidade de origem')).toBeDisabled();
            assert(data.requests.every(value => value.method === 'GET')); assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
    await run('Travel UI: calendar includes travel beyond the first hundred events without creating a second calendar', async () => {
        const data = await setup({ route: '/dashboard/agenda', agendaMany: true, readonly: true });
        try {
            await data.page.getByRole('button', { name: 'Calendário', exact: true }).click();
            await expect(data.page.locator('.fc-event').first()).toBeVisible();
            await data.page.locator('.zyllen-calendar').getByRole('button', { name: /lista/i }).click();
            const event = data.page.locator('.fc-event').filter({ hasText: 'Viagem regional QA 100' }).first();
            if (!await event.count()) await data.page.locator('.zyllen-calendar .fc-next-button').click();
            await expect(event).toBeVisible(); await event.click();
            await expect(dialog(data.page).getByLabel('Nome da viagem')).toHaveValue('Viagem regional QA 100'); assert(data.requests.some(value => value.path === '/schedule' && value.params.page === '2'));
            assert(!data.requests.some(value => value.path === '/trips' && value.method === 'POST'));
        } finally { await data.context.close(); }
    });
    await run('Travel UI: filters reset pagination and all registered trips remain reachable beyond the first page', async () => {
        const data = await setup({ many: true });
        try {
            await expect(cards(data.page)).toHaveCount(50); await data.page.getByRole('button', { name: 'Próxima', exact: true }).click(); await expect(cards(data.page)).toHaveCount(1); await expect(data.page.getByText('Página 2 · 51 viagem(ns)')).toBeVisible();
            await data.page.getByLabel('Tipo de trajeto').selectOption('true'); await expect(cards(data.page)).toHaveCount(1); await expect(cards(data.page).first()).toContainText('Interestadual'); await expect(data.page.getByText('Página 1 · 1 viagem(ns)')).toBeVisible();
            await data.page.getByLabel('Status da viagem').selectOption('DONE'); await expect(data.page.getByText(/Nenhuma viagem encontrada/)).toBeVisible();
        } finally { await data.context.close(); }
    });
    await run('Travel UI: initial failures/retry, failed detail and denied audience never invent records or issue unauthorized calls', async () => {
        const data = await setup({ failures: { '/trips': true } });
        try {
            await data.page.clock.runFor(8000); await expect(alert(data.page)).toContainText('Não foi possível carregar'); await expect(cards(data.page)).toHaveCount(0);
            delete data.failures['/trips']; await data.page.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await expect(cards(data.page)).toHaveCount(2);
            data.failures['/trips/' + data.records[0].id] = true; await cards(data.page).first().getByRole('button', { name: 'Ver viagem' }).click(); await data.page.clock.runFor(8000); await expect(dialog(data.page).getByRole('alert')).toContainText('Não foi possível carregar');
            await data.page.keyboard.press('Escape'); await expect(dialog(data.page)).toHaveCount(0);
        } finally { await data.context.close(); }
        const denied = await setup({ denied: true });
        try { await expect(denied.page.getByText('Você não tem permissão para visualizar a agenda de projetos.')).toBeVisible(); assert(!denied.requests.some(value => value.path.startsWith('/trips'))); }
        finally { await denied.context.close(); }
    });
    await run('Operations UI: contextual totals, five separate read-only sections, actual-date gaps and unbooked travel', async () => {
        const data = await setup({ route: '/dashboard/operacoes' });
        try {
            await expect(data.page.getByRole('heading', { name: 'Instalações e viagens', exact: true })).toBeVisible(); for (const [key, value] of Object.entries({ installations: 5, removals: 5, 'planned-trips': 0, 'completed-trips': 1 })) await expect(metric(data.page, key)).toHaveText(String(value));
            for (const name of ['Próximas instalações', 'Instalações relevantes', 'Últimas instalações concluídas', 'Últimas desinstalações concluídas', 'Próximas viagens interestaduais']) await expect(data.page.getByRole('region', { name, exact: true })).toBeVisible();
            await expect(data.page.getByRole('region', { name: 'Últimas instalações concluídas' }).locator('[data-operation-service]')).toHaveCount(5);
            await expect(data.page.getByRole('region', { name: 'Instalações relevantes' })).toContainText('Sem agendamento'); await expect(data.page.getByText(/finalizados sem data real/)).toBeVisible(); await expect(data.page.getByText(/precisam de viagem/)).toBeVisible();
            await expect(data.page.getByRole('button', { name: /Salvar|Editar|Iniciar|Finalizar/ })).toHaveCount(0); assert(data.requests.every(value => value.method === 'GET')); assert(!data.requests.some(value => value.path === '/trips' || value.path === '/trips/options'));
            await data.page.screenshot({ path: path.join(shots, 'operations-desktop.png'), fullPage: true, animations: 'disabled' }); assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
    await run('Operations UI: custom local period maps to UTC; invalid dates suppress fetch and upcoming executions stay current', async () => {
        const data = await setup({ route: '/dashboard/operacoes' });
        try {
            await expect(metric(data.page, 'installations')).toHaveText('5'); await data.page.getByLabel('Período dos indicadores').selectOption('TODAY'); await expect(metric(data.page, 'installations')).toHaveText('0');
            await expect(data.page.getByRole('region', { name: 'Próximas instalações' }).locator('[data-operation-service]')).toHaveCount(4);
            await data.page.getByLabel('Período dos indicadores').selectOption('CUSTOM'); await data.page.getByLabel('Data inicial', { exact: true }).fill('2026-09-01'); await data.page.getByLabel('Data final', { exact: true }).fill('2026-09-18');
            await expect(metric(data.page, 'installations')).toHaveText('5'); const last = data.requests.filter(value => value.path === '/trips/statistics').at(-1); assert.equal(last.params.start, '2026-09-01T03:00:00.000Z'); assert.equal(last.params.end, '2026-09-19T03:00:00.000Z');
            await data.page.getByLabel('Data final', { exact: true }).fill('2026-08-01'); await expect(alert(data.page)).toContainText('Informe datas válidas'); const count = data.requests.filter(value => value.path === '/trips/statistics').length; await data.page.clock.runFor(31_000); assert.equal(data.requests.filter(value => value.path === '/trips/statistics').length, count);
        } finally { await data.context.close(); }
    });
    await run('Operations UI: stale data survives failed refresh of the same filter; failure of another period has no fake zeros', async () => {
        const data = await setup({ route: '/dashboard/operacoes' });
        try {
            await expect(metric(data.page, 'installations')).toHaveText('5'); data.failures['/trips/statistics'] = true; await data.page.getByRole('button', { name: 'Atualizar indicadores', exact: true }).click(); await data.page.clock.runFor(8000);
            await expect(alert(data.page)).toContainText('última consulta'); await expect(metric(data.page, 'installations')).toHaveText('5');
            await data.page.getByLabel('Período dos indicadores').selectOption('TODAY'); await data.page.clock.runFor(8000); await expect(alert(data.page)).toContainText('Não foi possível atualizar'); await expect(data.page.locator('[data-operation-metric]')).toHaveCount(0);
            delete data.failures['/trips/statistics']; await data.page.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await expect(metric(data.page, 'installations')).toHaveText('0');
        } finally { await data.context.close(); }
    });
    await run('Operations UI: mobile long names fit, empty response is explicit and denied roles do not query', async () => {
        const data = await setup({ route: '/dashboard/operacoes', mobile: true });
        try {
            await expect(metric(data.page, 'installations')).toHaveText('5'); assert(await data.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            for (const item of await data.page.locator('[data-operation-service]').all()) assert(await item.evaluate(element => element.scrollWidth <= element.clientWidth));
            await data.page.screenshot({ path: path.join(shots, 'operations-mobile.png'), animations: 'disabled' }); await data.page.getByRole('region', { name: 'Instalações relevantes' }).screenshot({ path: path.join(shots, 'operations-mobile-highlights.png'), animations: 'disabled' }); assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
        const empty = await setup({ route: '/dashboard/operacoes', empty: true });
        try { await expect(metric(empty.page, 'installations')).toHaveText('0'); await expect(empty.page.getByText('Nenhum registro para esta seção.')).toHaveCount(5); }
        finally { await empty.context.close(); }
        const denied = await setup({ route: '/dashboard/operacoes', denied: true });
        try { await expect(denied.page.getByText('Você não tem permissão para visualizar a agenda de projetos.')).toBeVisible(); assert(!denied.requests.some(value => value.path === '/trips/statistics')); }
        finally { await denied.context.close(); }
    });
};
if (require.main === module) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-dashboard.cjs'), '--trips'], { stdio: 'inherit', windowsHide: true }); process.exitCode = result.status ?? 1;
}
