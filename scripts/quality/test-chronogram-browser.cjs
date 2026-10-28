/* New workspace integration: isolated Next/Chrome and intercepted synthetic HTTP only. */
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
module.exports = async ({ run, browser, base, shots, fixedNow }) => {
    const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
    const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));
    async function setup({ route = '/dashboard/projetos', readonly = false, denied = false, external = false, mobile = false, many = false, empty = false, failProjects = false, failDetail = false, failOptions = false, specifications = false, planning = false, collaboration = false, actions = false, failSave = false, legacy = false, internos = false, hiddenProject = false } = {}) {
        const company = { id: crypto.randomUUID(), name: 'Cliente Cronograma QA', address: 'Rua de teste, 10', city: 'Goiânia', state: 'GO' };
        const tech = { id: crypto.randomUUID(), name: 'Técnico Cronograma QA', email: 'qa@example.test', sector: 'Operações', agendaColor: '#2255AA', agendaActive: true, roleName: 'Técnico' };
        const plannedDate = new Date(fixedNow); plannedDate.setDate(Math.min(plannedDate.getDate() + 2, 28)); plannedDate.setHours(12, 0, 0, 0);
        const start = plannedDate.toISOString(), end = new Date(plannedDate.getTime() + 3600000).toISOString();
        const legacyRecords = !legacy ? [] : Array.from({ length: 105 }, (_, index) => ({ id: crypto.randomUUID(), sourceId: 'legacy-' + index, name: 'Histórico legado QA ' + index,
            location: 'Goiânia/GO', service: 'REMOVAL', planning: { stage: 'concluido', forecast: null }, specifications: { category: 'sala', equipment: ['Equipamento legado QA'], room: null },
            start: index ? start.slice(0, 10) : null, end: null, original: null, technician: 'Texto da origem QA', notes: 'Observação da origem QA', annotations: [],
            pending: [{ sourceId: 'p-' + index, type: 'Aguardando contrato', responsible: 'Texto responsável', deadline: null, detail: 'Dado histórico QA', open: true, createdAt: '', createdBy: '', resolvedAt: '', resolvedBy: '' }],
            source: { name: 'source-qa.zip', sha256: 'a'.repeat(64), importedAt: new Date(fixedNow).toISOString() } }));
        const older = new Date(plannedDate); older.setDate(1);
        const makeProject = extra => ({ id: crypto.randomUUID(), projectId: crypto.randomUUID(), name: 'Projeto sem data QA', company, type: 'INSTALLATION', status: 'PENDING', marker: null,
            urgency: 0, color: '#ABFF10', address: 'Rua de teste, 100', city: 'Goiânia', state: 'GO', mapsUrl: null, notes: 'Orientações do projeto QA', sectors: ['Operações'],
            requiresTravel: false, relevant: false, internalAssignees: [tech], contractors: [], schedule: null, createdAt: new Date(fixedNow).toISOString(), startedAt: null, completedAt: null, cancelledAt: null, ...extra });
        const records = empty ? [] : [makeProject(), makeProject({ name: 'Projeto agendado QA', status: 'SCHEDULED', schedule: { id: crypto.randomUUID(), startDate: start, endDate: end } }),
            makeProject({ name: 'Projeto com data vencida QA', status: 'SCHEDULED', schedule: { id: crypto.randomUUID(), startDate: older.toISOString(), endDate: new Date(older.getTime() + 3600000).toISOString() } })];
        if (hiddenProject) records[1].id = process.env.AUDIT_HIDDEN_PROJECT_SERVICE_ID;
        if (many) records.push(...Array.from({ length: 101 }, (_, index) => makeProject({ name: 'Projeto adicional QA ' + index })));
        if (collaboration && records.length) {
            for (const record of records) { record.pending = []; record.annotations = []; }
            records[1].pending.push({ id: crypto.randomUUID(), type: 'Aguardando kickoff', responsible: 'Responsável QA', deadline: start.slice(0, 10), detail: 'Primeira pendência QA', version: 0,
                createdAt: new Date(fixedNow).toISOString(), updatedAt: new Date(fixedNow).toISOString(), createdBy: { id: 'chronogram-qa', name: 'Organizador QA' }, resolvedAt: null, resolvedBy: null });
            records[1].annotations.push({ id: crypto.randomUUID(), text: 'Primeira anotação QA', createdAt: new Date(fixedNow).toISOString(), author: { id: 'chronogram-qa', name: 'Organizador QA' } });
        }
        const choices = { ...(specifications || planning ? { capabilities: { projectSpecifications: specifications, projectPlanning: planning } } : {}), companies: [company], projects: [], markers: [], followups: [], internalUsers: [tech], contractors: [] };
        if (planning && records.length) {
            records[0].planning = { stage: 'kickoff', forecast: start.slice(0, 7) };
            records[1].planning = { stage: 'agendado', forecast: `${new Date(fixedNow).getFullYear() + 1}-01` };
            records[2].planning = { stage: 'predef', forecast: null };
        }
        if (actions) for (const record of records) { record.actionsAvailable = true; record.originalScheduledStartAt = null; record.history = []; }
        if (specifications && records.length) records[1].specifications = { category: 'sala', equipment: ['Projetor técnico QA'], room: {
            roomType: 'interativa', format: 'Semicircular', projections: '3', proportion: '16:9', resolution: '3840 × 2160', control: 'Tablet QA', sound: '5.1',
        } };
        const extras = Array.from({ length: empty ? 0 : many ? 102 : 1 }, (_, index) => ({ id: crypto.randomUUID(), title: 'Compromisso avulso QA ' + index,
            type: 'OTHER', status: 'SCHEDULED', startDate: start, endDate: end, address: null, notes: 'Notas do compromisso QA', companyId: null, projectId: null,
            parentScheduleId: null, companyName: null, projectName: null, createdByName: null, installers: [tech] }));
        const scheduledRows = () => [...records.filter(record => record.schedule).map(record => ({ ...record.schedule, title: record.name, type: record.type, status: record.status,
            address: record.address, notes: record.notes, companyId: company.id, projectId: record.projectId, companyName: company.name, projectName: record.name,
            parentScheduleId: null, createdByName: null, installers: [tech], projectService: { id: record.id, projectId: record.projectId, marker: null, color: record.color, urgency: 0, requiresTravel: false, contractors: [] } })), ...extras];
        const requests = [], errors = [], state = { failProjects, failDetail, failOptions, failSave, saveDelayMs: 0 };
        const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1100 }, timezoneId: 'America/Sao_Paulo' });
        await context.addInitScript(() => { localStorage.setItem('accessToken', 'synthetic-chronogram-qa'); localStorage.setItem('userType', 'internal'); });
        await context.route('**/*', async interception => {
            const request = interception.request(), url = new URL(request.url());
            if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return interception.abort();
            if (url.port !== '3999') return interception.continue();
            const respond = (payload, status = 200) => interception.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }, body: JSON.stringify(payload) });
            if (request.method() === 'OPTIONS') return respond({});
            const body = request.postData() ? request.postDataJSON() : null;
            requests.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), method: request.method(), body });
            if (body && state.failSave && url.pathname.startsWith('/project-services')) return respond({ error: { message: 'Falha sintética ao salvar' } }, 503);
            if (body && state.saveDelayMs && url.pathname.startsWith('/project-services')) await new Promise(resolve => setTimeout(resolve, state.saveDelayMs));
            if (url.pathname === '/auth/me') return respond({ data: { id: 'chronogram-qa', name: 'Organizador QA', type: external ? 'external' : 'internal', role: { name: internos ? 'Internos' : 'Gestor' } } });
            if (url.pathname === '/auth/me/permissions') return respond({ data: denied ? ['dashboard.view'] : readonly ? ['dashboard.view', 'schedule.view'] : ['dashboard.view', 'schedule.view', 'schedule.create', 'schedule.update', 'schedule.manage_installers'] });
            if (url.pathname.includes('pending-rating')) return respond({ data: null });
            if (url.pathname === '/project-services/options') return state.failOptions ? respond({ error: { message: 'Falha sintética de opções' } }, 503) : respond({ data: choices });
            if (url.pathname === '/project-services/legacy/records') {
                const page = Number(url.searchParams.get('page') || 1);
                return respond({ data: legacyRecords.slice((page - 1) * 100, page * 100), total: legacyRecords.length, page, limit: 100 });
            }
            if (url.pathname.startsWith('/project-services/legacy/records/')) return respond({ data: legacyRecords.find(item => item.id === url.pathname.split('/').at(-1)) });
            if (url.pathname === '/project-services') {
                if (state.failProjects) return respond({ error: { message: 'Falha sintética de projetos' } }, 503);
                if (body) { const created = makeProject({ ...body, name: body.name }); records.push(created); return respond({ data: created }); }
                const page = Number(url.searchParams.get('page') || 1), limit = Number(url.searchParams.get('limit') || 100);
                return respond({ data: records.slice((page - 1) * limit, page * limit), total: records.length, page, limit });
            }
            const action = url.pathname.match(/^\/project-services\/([^/]+)\/(planning|observations|cancel|history)$/);
            if (action) {
                const record = records.find(item => item.id === action[1]);
                if (!record) return respond({ error: { message: 'Projeto não encontrado' } }, 404);
                if (action[2] === 'history') return respond({ data: record.history, total: record.history.length, page: 1, limit: 30 });
                if (action[2] === 'planning') { if (JSON.stringify(record.planning ?? null) !== JSON.stringify(body.expected)) return respond({ error: { message: 'O planejamento mudou' } }, 409); record.planning = body.next; }
                if (action[2] === 'observations') { if ((record.notes ?? '') !== (body.expected ?? '')) return respond({ error: { message: 'As observações mudaram' } }, 409); record.notes = body.next; }
                if (action[2] === 'cancel') { record.status = 'CANCELLED'; record.cancelledAt = new Date(fixedNow).toISOString(); }
                record.history.unshift({ id: crypto.randomUUID(), action: action[2] === 'cancel' ? 'PROJECT_CANCEL_WITH_REASON' : 'PROJECT_SERVICE_UPDATE', createdAt: new Date(fixedNow).toISOString(), author: 'Organizador QA', changes: [], reason: body.reason ?? null });
                return respond({ data: { id: record.id } }, action[2] === 'cancel' ? 201 : 200);
            }
            const activity = url.pathname.match(/^\/project-services\/([^/]+)\/(pending|notes)(?:\/([^/]+))?(\/resolve)?$/);
            if (activity && body) {
                const record = records.find(item => item.id === activity[1]);
                if (!record) return respond({ error: { message: 'Projeto não encontrado' } }, 404);
                const author = { id: 'chronogram-qa', name: 'Organizador QA' }, stamp = new Date(fixedNow).toISOString();
                if (activity[2] === 'notes') { if (!record.annotations.some(item => item.id === body.id)) record.annotations.unshift({ ...body, createdAt: stamp, author }); return respond({ data: { id: body.id } }); }
                if (!activity[3]) { if (!record.pending.some(item => item.id === body.id)) record.pending.push({ ...body, version: 0, createdAt: stamp, updatedAt: stamp, createdBy: author, resolvedAt: null, resolvedBy: null }); return respond({ data: { id: body.id } }); }
                const pending = record.pending.find(item => item.id === activity[3]);
                if (!pending) return respond({ error: { message: 'Pendência não encontrada' } }, 404);
                if (activity[4] && pending.resolvedAt) return respond({ data: { id: pending.id } });
                if (pending.version !== body.expectedVersion) return respond({ error: { message: 'A pendência mudou. Atualize o card antes de editar.' } }, 409);
                if (activity[4]) Object.assign(pending, { resolvedAt: stamp, resolvedBy: author, version: pending.version + 1 });
                else { const { expectedVersion, ...values } = body; Object.assign(pending, values, { version: pending.version + 1, updatedAt: stamp }); }
                return respond({ data: { id: pending.id } });
            }
            const match = url.pathname.match(/^\/project-services\/([^/]+)(?:\/status)?$/);
            if (match) {
                if (state.failDetail) return respond({ error: { message: 'Falha sintética de detalhe' } }, 503);
                const record = records.find(record => record.id === match[1]);
                if (!record) return respond({ error: { message: 'Registro sintético não encontrado' } }, 404);
                if (body) { if (body.startDate && record.schedule && body.startDate !== record.schedule.startDate && !record.originalScheduledStartAt) record.originalScheduledStartAt = record.schedule.startDate; Object.assign(record, body); if (body.startDate) record.schedule = { ...record.schedule, startDate: body.startDate, endDate: body.endDate }; }
                return respond({ data: record });
            }
            if (url.pathname === '/schedule/installers') return respond({ data: [tech] });
            if (url.pathname === '/clients/companies') return respond({ data: [company] });
            if (url.pathname === '/schedule') {
                const rows = scheduledRows(), page = Number(url.searchParams.get('page') || 1), limit = Number(url.searchParams.get('limit') || 100);
                return respond({ data: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, limit });
            }
            if (url.pathname.startsWith('/schedule/')) return respond({ data: scheduledRows().find(row => row.id === url.pathname.split('/').at(-1)) });
            if (url.pathname === '/trips' || url.pathname === '/structures') return respond({ data: [], total: 0, page: 1, limit: 50 });
            return respond({ data: [] });
        });
        const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
        await page.clock.install({ time: fixedNow }); await page.clock.setFixedTime(fixedNow);
        await page.goto(base + route);
        return { context, page, requests, errors, records, extras, state, legacyRecords };
    }
    const tab = (page, name) => page.getByRole('tab', { name, exact: true });
    const panel = page => page.locator('[id^="chronogram-panel-"]');
    const row = (page, id) => panel(page).locator(`[data-chronogram-record="project:${id}"]`);
    const writes = data => data.requests.filter(request => ['POST', 'PUT', 'DELETE'].includes(request.method));
    await run('Chronogram: new navigation preserves four package views and hides old overview/team', async () => {
        const s = await setup(); try {
            await expect(s.page.getByRole('heading', { name: 'Cronograma e Planejamento', exact: true })).toBeVisible();
            await expect(s.page.getByRole('link', { name: 'Cronograma e Planejamento', exact: true })).toHaveCount(1);
            await expect(tab(s.page, 'Cronograma')).toHaveAttribute('aria-selected', 'true'); await expect(tab(s.page, 'Agenda')).toHaveAttribute('aria-selected', 'true');
            for (const name of ['Calendário', 'Projetos', 'Pendências', 'Viagens']) await expect(tab(s.page, name)).toHaveCount(1);
            await expect(tab(s.page, 'Equipe')).toHaveCount(0); await expect(tab(s.page, 'Visão geral')).toHaveCount(0);
            await expect(s.page.locator('[data-chronogram-metric="active"] strong')).toHaveText('3');
            await s.page.screenshot({ path: path.join(shots, 'chronogram-desktop.png'), fullPage: true, animations: 'disabled' });
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Chronogram: agenda deduplicates project schedules and retains standalone commitments', async () => {
        const s = await setup(); try {
            await expect(panel(s.page).locator('[data-chronogram-record]')).toHaveCount(3);
            await expect(row(s.page, s.records[1].id)).toHaveCount(1);
            await expect(panel(s.page).getByText('Compromisso avulso QA 0', { exact: true })).toBeVisible();
            await tab(s.page, 'Projetos').click(); await expect(row(s.page, s.records[0].id)).toBeVisible();
            await expect(panel(s.page).locator('[data-chronogram-record]')).toHaveCount(3);
            assert.deepEqual(writes(s), []);
        } finally { await s.context.close(); }
    });
    await run('Chronogram: search, status and UF share scope across agenda, board, calendar and URL reload', async () => {
        const s = await setup(); try {
            await s.page.getByLabel('Buscar no cronograma', { exact: true }).fill('GOIANIA');
            await expect(panel(s.page).locator('[data-chronogram-record]')).toHaveCount(2);
            await s.page.getByLabel('Status', { exact: true }).selectOption('PENDING');
            await tab(s.page, 'Projetos').click(); await expect(row(s.page, s.records[0].id)).toHaveCount(1); await expect(row(s.page, s.records[1].id)).toHaveCount(0);
            await s.page.reload(); await expect(s.page.getByLabel('Buscar no cronograma', { exact: true })).toHaveValue('GOIANIA');
            await expect(s.page.getByLabel('Estado', { exact: true })).toHaveValue('all'); await s.page.getByLabel('Estado', { exact: true }).selectOption('GO');
            await tab(s.page, 'Calendário').click(); await expect(panel(s.page).locator('[data-calendar-record]')).toHaveCount(0);
            assert.equal(new URL(s.page.url()).searchParams.get('status'), 'PENDING'); assert.deepEqual(writes(s), []);
        } finally { await s.context.close(); }
    });
    await run('Chronogram: calendar, agenda and pending list open the same fresh project card', async () => {
        const s = await setup({ readonly: true }); try {
            await row(s.page, s.records[1].id).click(); await expect(s.page.getByRole('dialog')).toContainText('Orientações do projeto QA');
            await expect(s.page.getByRole('dialog').getByRole('button', { name: 'Editar projeto', exact: true })).toHaveCount(0);
            await s.page.keyboard.press('Escape'); s.records[1].notes = 'Informação atualizada por outra pessoa QA';
            await tab(s.page, 'Calendário').click(); await panel(s.page).locator(`[data-calendar-record="project:${s.records[1].id}"]`).first().click();
            await expect(s.page.getByRole('dialog')).toContainText('Informação atualizada por outra pessoa QA'); await expect(s.page.getByRole('dialog')).toContainText('Características técnicas não informadas');
            await s.page.keyboard.press('Escape'); await tab(s.page, 'Pendências').click(); await panel(s.page).getByRole('button', { name: 'Abrir card' }).first().click();
            await expect(s.page.getByRole('dialog')).toContainText('Projeto com data vencida QA');
            assert(s.requests.filter(request => request.path === '/project-services/' + s.records[1].id).length >= 2); assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Chronogram: existing canonical project editor saves and invalidates the adapted list', async () => {
        const s = await setup(); try {
            await row(s.page, s.records[1].id).click(); await s.page.getByRole('dialog').getByRole('button', { name: 'Editar projeto', exact: true }).click();
            await expect(s.page.getByRole('dialog').getByRole('heading', { name: 'Editar projeto', exact: true })).toBeVisible();
            await s.page.getByLabel('Nome do projeto', { exact: true }).fill('Projeto editado pelo cronograma QA');
            await s.page.getByRole('button', { name: 'Salvar projeto', exact: true }).click(); await expect(s.page.getByRole('dialog')).toHaveCount(0);
            await expect(row(s.page, s.records[1].id)).toContainText('Projeto editado pelo cronograma QA'); assert.equal(writes(s).length, 1); assert.equal(writes(s)[0].method, 'PUT'); assert(!Object.hasOwn(writes(s)[0].body, 'specifications')); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Chronogram: new record opens current form and failed options remain recoverable without writes', async () => {
        const s = await setup({ failOptions: true }); try {
            await s.page.getByRole('button', { name: 'Novo registro', exact: true }).click();
            await expect(s.page.getByRole('dialog').getByRole('alert')).toBeVisible({ timeout: 15000 }); s.state.failOptions = false;
            await s.page.getByRole('dialog').getByRole('button', { name: 'Tentar novamente' }).click(); await expect(s.page.getByLabel('Cliente', { exact: true })).toBeVisible();
            await s.page.keyboard.press('Escape'); await expect(s.page.getByRole('dialog')).toHaveCount(0); assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Chronogram: standalone cards fetch current detail and existing recurring-schedule tools remain accessible', async () => {
        const s = await setup({ readonly: true }); try {
            await panel(s.page).locator(`[data-chronogram-record="schedule:${s.extras[0].id}"]`).click();
            await expect(s.page.getByRole('dialog')).toContainText('Notas do compromisso QA');
            assert(s.requests.some(request => request.path === '/schedule/' + s.extras[0].id));
            await s.page.keyboard.press('Escape'); await s.page.getByText('Compromissos avulsos e recorrências', { exact: true }).click();
            await expect(s.page.getByLabel('Buscar agendamento', { exact: true })).toBeVisible();
            await expect(s.page.getByRole('button', { name: /Novo Agendamento/i })).toHaveCount(0); assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Chronogram: all project and schedule pages are queried, with more-than-four calendar entries accessible', async () => {
        const s = await setup({ many: true }); try {
            await expect(s.page.locator('[data-chronogram-metric="active"] strong')).toHaveText('104');
            assert(s.requests.some(request => request.path === '/project-services' && request.query.page === '2'));
            assert(s.requests.some(request => request.path === '/schedule' && request.query.page === '2'));
            await tab(s.page, 'Projetos').click(); await expect(row(s.page, s.records.at(-1).id)).toHaveCount(1);
            await tab(s.page, 'Calendário').click(); const more = panel(s.page).getByRole('button', { name: /Ver mais/ }).first(); await more.click();
            await expect(panel(s.page).locator(`[data-calendar-record="schedule:${s.extras.at(-1).id}"]`)).toHaveCount(1); assert.deepEqual(writes(s), []);
        } finally { await s.context.close(); }
    });
    await run('Chronogram: empty is a successful zero state; failed list does not fabricate zero indicators', async () => {
        const s = await setup({ empty: true }); try { await expect(s.page.locator('[data-chronogram-metric="active"] strong')).toHaveText('0'); await expect(panel(s.page)).toContainText('Nenhum compromisso neste período'); await expect(s.page.locator('[data-theme]').getByRole('alert')).toHaveCount(0); assert.deepEqual(s.errors, []); } finally { await s.context.close(); }
        const failed = await setup({ failProjects: true }); try {
            await expect(failed.page.locator('[data-theme]').getByRole('alert')).toContainText('Não foi possível carregar o cronograma completo', { timeout: 15000 }); await expect(failed.page.locator('[data-chronogram-metric]')).toHaveCount(0);
            failed.state.failProjects = false; await failed.page.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await expect(failed.page.locator('[data-chronogram-metric="active"] strong')).toHaveText('3');
            assert.deepEqual(writes(failed), []);
        } finally { await failed.context.close(); }
    });
    await run('Chronogram: detail failure stays in a closeable dialog and retries the selected ID', async () => {
        const s = await setup({ failDetail: true }); try {
            await row(s.page, s.records[1].id).click(); await expect(s.page.getByRole('dialog').getByRole('alert')).toBeVisible({ timeout: 15000 });
            s.state.failDetail = false; await s.page.getByRole('dialog').getByRole('button', { name: 'Tentar novamente' }).click(); await expect(s.page.getByRole('dialog')).toContainText('Orientações do projeto QA');
            await s.page.keyboard.press('Escape'); await expect(s.page.getByRole('dialog')).toHaveCount(0); await expect(row(s.page, s.records[1].id)).toBeFocused(); assert.deepEqual(writes(s), []);
        } finally { await s.context.close(); }
    });
    await run('Chronogram: read-only and denied sessions cannot create records or fetch hidden team management', async () => {
        const s = await setup({ readonly: true }); try { await expect(s.page.locator('[data-chronogram-metric="active"] strong')).toHaveText('3'); await expect(s.page.getByRole('button', { name: 'Novo registro' })).toHaveCount(0); assert(!s.requests.some(request => request.path === '/schedule/installers')); assert.deepEqual(writes(s), []); } finally { await s.context.close(); }
        const denied = await setup({ denied: true, route: '/dashboard/projetos?aba=equipe' }); try { await expect(denied.page.getByText('Você não tem permissão para visualizar a agenda de projetos.', { exact: true })).toBeVisible(); assert(!denied.requests.some(request => ['/project-services', '/schedule', '/schedule/installers'].includes(request.path))); } finally { await denied.context.close(); }
    });
    await run('Chronogram: legacy links keep the correct destination and trips remain an independent view', async () => {
        const s = await setup(); try {
            for (const [url, name] of [['/dashboard/agenda', 'Agenda'], ['/dashboard/projetos?aba=agenda&visao=calendario', 'Calendário'], ['/dashboard/projetos?aba=projetos', 'Projetos'], ['/dashboard/operacoes', 'Agenda'], ['/dashboard/projetos?aba=equipe', 'Agenda']]) {
                await s.page.goto(base + url); await expect(tab(s.page, name)).toHaveAttribute('aria-selected', 'true'); await expect(s.page).toHaveURL(/\/dashboard\/projetos\?/);
            }
            await s.page.goto(base + '/dashboard/viagens'); await expect(tab(s.page, 'Viagens')).toHaveAttribute('aria-selected', 'true'); await expect(s.page.getByRole('tab', { name: 'Agenda', exact: true })).toHaveCount(0); assert.deepEqual(writes(s), []);
        } finally { await s.context.close(); }
    });
    await run('Chronogram: mobile keyboard navigation, browser reload and scoped theme retain usable layout', async () => {
        const s = await setup({ mobile: true }); try {
            await expect(s.page.locator('[data-chronogram-metric="active"] strong')).toHaveText('3'); await tab(s.page, 'Agenda').focus(); await s.page.keyboard.press('ArrowRight');
            await expect(tab(s.page, 'Calendário')).toBeFocused(); await expect(tab(s.page, 'Calendário')).toHaveAttribute('aria-selected', 'true');
            await s.page.reload(); await expect(tab(s.page, 'Calendário')).toHaveAttribute('aria-selected', 'true'); assert(await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            await panel(s.page).locator('[data-calendar-day]').first().scrollIntoViewIfNeeded();
            await s.page.screenshot({ path: path.join(shots, 'chronogram-mobile-calendar.png'), animations: 'disabled' });
            const oldRootTheme = await s.page.locator('html').getAttribute('data-theme'); await s.page.getByRole('button', { name: 'Usar tema claro no cronograma' }).click();
            await expect(s.page.locator('[data-theme="light"]')).toHaveCount(1); assert.equal(await s.page.locator('html').getAttribute('data-theme'), oldRootTheme);
            await s.page.screenshot({ path: path.join(shots, 'chronogram-light.png'), fullPage: true, animations: 'disabled' });
            await s.page.reload(); await expect(s.page.getByRole('button', { name: 'Usar tema escuro no cronograma' })).toBeVisible(); assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Specifications: explicit technical data appears in cards, category filters and equipment search for read-only accounts', async () => {
        const s = await setup({ specifications: true, readonly: true }); try {
            await s.page.getByLabel('Categoria', { exact: true }).selectOption('sala');
            await expect(row(s.page, s.records[1].id)).toHaveCount(1);
            await s.page.getByLabel('Buscar no cronograma', { exact: true }).fill('projetor tecnico');
            await expect(row(s.page, s.records[1].id)).toHaveCount(1); await row(s.page, s.records[1].id).click();
            const dialog = s.page.getByRole('dialog'); await expect(dialog).toContainText('Projetor técnico QA'); await expect(dialog).toContainText('3840 × 2160');
            await expect(dialog.getByRole('button', { name: 'Editar projeto', exact: true })).toHaveCount(0);
            await s.page.screenshot({ path: path.join(shots, 'chronogram-specifications-card.png'), fullPage: true, animations: 'disabled' });
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Specifications: editing retains multiline draft on failure and room data when switching category', async () => {
        const s = await setup({ specifications: true, failSave: true }); try {
            await row(s.page, s.records[1].id).click(); await s.page.getByRole('button', { name: 'Editar projeto', exact: true }).click();
            await expect(s.page.getByLabel('Tipo de sala', { exact: true })).toHaveValue('interativa');
            await s.page.getByLabel('Equipamentos (um por linha, com modelo exato)', { exact: true }).fill('Projetor novo QA\n\nSom novo QA\n');
            await s.page.getByLabel('Resolução', { exact: true }).fill('7680 × 2160');
            await s.page.getByLabel('Categoria da instalação', { exact: true }).selectOption('tela');
            await expect(s.page.getByLabel('Resolução', { exact: true })).toHaveValue('7680 × 2160');
            await s.page.getByRole('button', { name: 'Salvar projeto', exact: true }).click();
            await expect(s.page.getByRole('dialog').getByRole('alert')).toContainText('Falha sintética ao salvar');
            await expect(s.page.getByLabel('Equipamentos (um por linha, com modelo exato)', { exact: true })).toHaveValue('Projetor novo QA\n\nSom novo QA\n');
            s.state.failSave = false; await s.page.getByRole('button', { name: 'Salvar projeto', exact: true }).click();
            await expect(s.page.getByRole('dialog')).toHaveCount(0);
            const saved = writes(s).at(-1).body.specifications; assert.equal(saved.category, 'tela'); assert.equal(saved.room.resolution, '7680 × 2160');
            assert.deepEqual(saved.equipment, ['Projetor novo QA', 'Som novo QA']);
            await row(s.page, s.records[1].id).click(); await expect(s.page.getByRole('dialog')).toContainText('7680 × 2160'); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Specifications: new form keeps unknowns empty and creates technical data with the canonical project', async () => {
        const s = await setup({ specifications: true, mobile: true }); try {
            await s.page.getByRole('button', { name: 'Novo registro', exact: true }).click();
            await s.page.getByRole('combobox', { name: 'Cliente', exact: true }).click(); await s.page.getByRole('option', { name: 'Cliente Cronograma QA', exact: true }).click();
            await s.page.getByLabel('Nome do projeto', { exact: true }).fill('Projeto técnico novo QA');
            await expect(s.page.getByLabel('Categoria da instalação', { exact: true })).toHaveValue('');
            await expect(s.page.getByLabel('Tipo de sala', { exact: true })).toHaveCount(0);
            await s.page.getByLabel('Categoria da instalação', { exact: true }).selectOption('sala');
            await expect(s.page.getByLabel('Tipo de sala', { exact: true })).toHaveValue('');
            await s.page.getByLabel('Formato', { exact: true }).fill('Semicircular');
            await s.page.getByLabel('Equipamentos (um por linha, com modelo exato)', { exact: true }).fill('Projetor sintético QA');
            await s.page.getByLabel('Formato', { exact: true }).scrollIntoViewIfNeeded();
            assert(await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            await s.page.screenshot({ path: path.join(shots, 'chronogram-specifications-mobile.png'), fullPage: true, animations: 'disabled' });
            await s.page.getByRole('button', { name: 'Salvar projeto', exact: true }).click(); await expect(s.page.getByRole('dialog')).toHaveCount(0);
            assert.equal(writes(s).length, 1); assert.equal(writes(s)[0].method, 'POST');
            assert.equal(writes(s)[0].body.specifications.room.roomType, ''); assert.equal(writes(s)[0].body.specifications.room.format, 'Semicircular');
            await tab(s.page, 'Projetos').click(); await row(s.page, s.records.at(-1).id).click(); await expect(s.page.getByRole('dialog')).toContainText('Semicircular'); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Specifications: explicit clear sends null and the old backend offers only its supported form', async () => {
        const s = await setup({ specifications: true }); try {
            await row(s.page, s.records[1].id).click(); await s.page.getByRole('button', { name: 'Editar projeto', exact: true }).click();
            await s.page.getByRole('button', { name: 'Limpar dados técnicos', exact: true }).click();
            await expect(s.page.getByLabel('Categoria da instalação', { exact: true })).toHaveValue('');
            await expect(s.page.getByLabel('Equipamentos (um por linha, com modelo exato)', { exact: true })).toHaveValue('');
            await s.page.getByRole('button', { name: 'Salvar projeto', exact: true }).click(); await expect(s.page.getByRole('dialog')).toHaveCount(0);
            assert.equal(writes(s)[0].body.specifications, null);
        } finally { await s.context.close(); }
        const old = await setup(); try {
            await old.page.getByRole('button', { name: 'Novo registro', exact: true }).click(); await expect(old.page.getByLabel('Nome do projeto', { exact: true })).toBeVisible();
            await expect(old.page.getByLabel('Categoria da instalação', { exact: true })).toHaveCount(0); assert.deepEqual(writes(old), []);
        } finally { await old.context.close(); }
    });
    await run('Planning: all eight stage choices and month/day drafts survive a failed save without completing execution', async () => {
        const s = await setup({ planning: true, failSave: true }); try {
            await row(s.page, s.records[0].id).click(); await s.page.getByRole('button', { name: 'Editar projeto', exact: true }).click();
            const stages = s.page.getByLabel('Etapa do cronograma', { exact: true }); await expect(stages.locator('option')).toHaveCount(9);
            for (const stage of ['contrato', 'kickoff', 'semprev', 'predef', 'agendado', 'pausado', 'concluido', 'cancelado']) { await stages.selectOption(stage); await expect(stages).toHaveValue(stage); }
            await stages.selectOption('concluido');
            const month = s.records[0].planning.forecast;
            await s.page.getByLabel('Precisão da previsão', { exact: true }).selectOption('date'); await s.page.getByLabel('Dia previsto', { exact: true }).fill('2028-02-29');
            await s.page.getByLabel('Precisão da previsão', { exact: true }).selectOption('month'); await expect(s.page.getByLabel('Mês previsto', { exact: true })).toHaveValue(month);
            await s.page.getByLabel('Precisão da previsão', { exact: true }).selectOption('date'); await expect(s.page.getByLabel('Dia previsto', { exact: true })).toHaveValue('2028-02-29');
            await s.page.getByLabel('Etapa do cronograma', { exact: true }).scrollIntoViewIfNeeded();
            await s.page.screenshot({ path: path.join(shots, 'chronogram-planning-form.png'), fullPage: true, animations: 'disabled' });
            await s.page.getByRole('button', { name: 'Salvar projeto', exact: true }).click(); await expect(s.page.getByRole('dialog').getByRole('alert')).toContainText('Falha sintética ao salvar');
            await expect(stages).toHaveValue('concluido'); await expect(s.page.getByLabel('Dia previsto', { exact: true })).toHaveValue('2028-02-29');
            s.state.failSave = false; await s.page.getByRole('button', { name: 'Salvar projeto', exact: true }).click(); await expect(s.page.getByRole('dialog')).toHaveCount(0);
            assert.deepEqual(writes(s).at(-1).body.planning, { stage: 'concluido', forecast: '2028-02-29' });
            assert.equal(s.records[0].status, 'PENDING'); assert.equal(s.records[0].completedAt, null); assert.equal(s.records[0].schedule, null);
            await expect(s.page.locator('[data-chronogram-metric="installations"] strong')).toHaveText('0');
            assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Planning: monthly and exact-day forecasts cross years, open canonical cards and remain tentative on mobile', async () => {
        const s = await setup({ planning: true, readonly: true, mobile: true }); try {
            await expect(row(s.page, s.records[0].id)).toBeVisible(); await tab(s.page, 'Calendário').click();
            await expect(panel(s.page)).toContainText('sem dia definido'); await panel(s.page).getByRole('button', { name: s.records[0].name, exact: true }).click();
            await expect(s.page.getByRole('dialog')).toContainText('Etapa: Aguardando kickoff'); await expect(s.page.getByRole('button', { name: 'Editar projeto', exact: true })).toHaveCount(0);
            await s.page.keyboard.press('Escape'); s.records[0].planning.forecast = '2028-02-29';
            await s.page.getByRole('button', { name: 'Atualizar', exact: true }).click();
            await s.page.getByLabel('Ano do cronograma', { exact: true }).selectOption('2028'); await s.page.getByRole('button', { name: 'Fevereiro de 2028', exact: true }).click();
            const ghost = panel(s.page).locator(`[data-calendar-day="2028-02-29"] [data-calendar-record="project:${s.records[0].id}"]`);
            await expect(ghost).toHaveClass(/tentative/); assert(await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            await ghost.scrollIntoViewIfNeeded();
            await s.page.screenshot({ path: path.join(shots, 'chronogram-planning-mobile-calendar.png'), fullPage: true, animations: 'disabled' });
            await ghost.click(); await expect(s.page.getByRole('dialog')).toContainText('29/02/2028');
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Planning: confirmed intervals override forecasts in calendar while the card preserves both values', async () => {
        const s = await setup({ planning: true, readonly: true }); try {
            await row(s.page, s.records[1].id).click();
            await expect(s.page.getByRole('dialog')).toContainText('Cronograma: Agendado por e-mail');
            await expect(s.page.getByRole('dialog')).toContainText('Execução: Agendado / preparação');
            await expect(s.page.getByRole('dialog')).toContainText('janeiro de 2027');
            await s.page.keyboard.press('Escape'); await s.page.getByLabel('Ano do cronograma', { exact: true }).selectOption('2027');
            await s.page.getByRole('button', { name: 'Janeiro de 2027', exact: true }).click(); await tab(s.page, 'Calendário').click();
            await expect(panel(s.page).locator(`[data-calendar-record="project:${s.records[1].id}"]`)).toHaveCount(0);
            await expect(panel(s.page).getByRole('button', { name: s.records[1].name, exact: true })).toHaveCount(0);
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Planning: stage and execution filters retain independent meaning through URL reload and the project board', async () => {
        const s = await setup({ planning: true }); try {
            await s.page.getByLabel('Status', { exact: true }).selectOption('kickoff'); await expect(row(s.page, s.records[0].id)).toHaveCount(1);
            await expect(row(s.page, s.records[1].id)).toHaveCount(0); await s.page.reload(); await expect(s.page.getByLabel('Status', { exact: true })).toHaveValue('kickoff');
            await s.page.getByLabel('Status', { exact: true }).selectOption('SCHEDULED'); await expect(row(s.page, s.records[1].id)).toHaveCount(1);
            await tab(s.page, 'Projetos').click(); await expect(row(s.page, s.records[1].id)).toHaveCount(1); await expect(row(s.page, s.records[2].id)).toHaveCount(1);
            await expect(row(s.page, s.records[0].id)).toHaveCount(0); assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Planning: stale planning stage cannot hide real completions or revive completed projects in the active board', async () => {
        const s = await setup({ planning: true }); try {
            s.records[1].status = 'DONE'; s.records[1].completedAt = new Date(fixedNow).toISOString(); s.records[1].planning.stage = 'contrato';
            await s.page.getByRole('button', { name: 'Atualizar', exact: true }).click();
            await expect(s.page.locator('[data-chronogram-metric="installations"] strong')).toHaveText('1');
            await tab(s.page, 'Projetos').click(); await expect(row(s.page, s.records[1].id)).toHaveCount(0);
            await expect(s.page.getByRole('complementary', { name: 'Informações do cronograma' }).locator(`[data-chronogram-record="project:${s.records[1].id}"]`)).toHaveCount(0);
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Planning: clearing is explicit, technical data and scheduled interval survive; old API receives no planning field', async () => {
        const s = await setup({ planning: true, specifications: true }); try {
            const before = { schedule: { ...s.records[1].schedule }, specifications: s.records[1].specifications };
            await row(s.page, s.records[1].id).click(); await s.page.getByRole('button', { name: 'Editar projeto', exact: true }).click();
            await s.page.getByRole('button', { name: 'Limpar planejamento', exact: true }).click();
            await expect(s.page.getByLabel('Etapa do cronograma', { exact: true })).toHaveValue(''); await expect(s.page.getByLabel('Mês previsto', { exact: true })).toHaveValue('');
            await s.page.getByRole('button', { name: 'Salvar projeto', exact: true }).click(); await expect(s.page.getByRole('dialog')).toHaveCount(0);
            assert.equal(writes(s).at(-1).body.planning, null); assert.deepEqual(s.records[1].schedule, before.schedule); assert.deepEqual(s.records[1].specifications, before.specifications);
        } finally { await s.context.close(); }
        const old = await setup({ specifications: true }); try {
            await row(old.page, old.records[1].id).click(); await old.page.getByRole('button', { name: 'Editar projeto', exact: true }).click();
            await expect(old.page.getByLabel('Etapa do cronograma', { exact: true })).toHaveCount(0);
            await old.page.getByRole('button', { name: 'Salvar projeto', exact: true }).click(); await expect(old.page.getByRole('dialog')).toHaveCount(0);
            assert(!Object.hasOwn(writes(old)[0].body, 'planning')); assert.deepEqual(old.errors, []);
        } finally { await old.context.close(); }
    });
    await require('./test-chronogram-collaboration-browser.cjs')({ run, setup, tab, panel, row, writes, expect, shots });
    await require('./test-chronogram-actions-browser.cjs')({ run, setup, row, writes, expect });
    // Opt in with the same synthetic ID compiled into NEXT_PUBLIC_PLANNING_HIDDEN_SERVICE_IDS.
    if (process.env.AUDIT_HIDDEN_PROJECT_SERVICE_ID) await run('Planning visibility: excluded project stays out of every view and complementary agenda without losing legacy or new projects', async () => {
        const s = await setup({ legacy: true, collaboration: true, hiddenProject: true }); try {
            await expect(s.page.getByText('105 registros do ZIP', { exact: false })).toBeVisible();
            const hidden = s.records[1];
            await expect(row(s.page, hidden.id)).toHaveCount(0);
            await expect(s.page.locator('[data-chronogram-metric="active"] strong')).toHaveText('2');
            await tab(s.page, 'Calendário').click();
            await expect(s.page.locator(`[data-calendar-record="project:${hidden.id}"]`)).toHaveCount(0);
            await expect(s.page.locator(`[data-calendar-record="schedule:${hidden.schedule.id}"]`)).toHaveCount(0);
            await expect(s.page.locator('[data-calendar-record^="legacy:"]').first()).toBeVisible();
            await tab(s.page, 'Projetos').click(); await expect(row(s.page, hidden.id)).toHaveCount(0);
            await expect(row(s.page, s.records[0].id)).toHaveCount(1);
            await tab(s.page, 'Pendências').click(); await expect(panel(s.page)).not.toContainText('Primeira pendência QA');
            await expect(panel(s.page)).toContainText('Dado histórico QA');
            await s.page.getByText('Compromissos avulsos e recorrências', { exact: true }).click();
            const extra = s.page.locator('details').filter({ has: s.page.locator('summary').filter({ hasText: 'Compromissos avulsos e recorrências' }) });
            await expect(extra.getByText('Compromisso avulso QA 0', { exact: true })).toBeVisible();
            await expect(extra.getByText(hidden.name, { exact: true })).toHaveCount(0);
            await s.page.getByRole('button', { name: 'Atualizar', exact: true }).click();
            await s.page.reload(); await expect(s.page.getByText(hidden.name, { exact: true })).toHaveCount(0);
            assert.equal(s.records.length, 3); assert.equal(s.legacyRecords.length, 105);
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Release UI: legacy pages/cards/pending are read-only, undated records stay discoverable and real metrics exclude source completion', async () => {
        const s = await setup({ legacy: true, mobile: true }); try {
            await expect(s.page.getByText('105 registros do ZIP', { exact: false })).toBeVisible();
            assert(s.requests.some(item => item.path === '/project-services/legacy/records' && item.query.page === '2'));
            await expect(s.page.locator('[data-chronogram-metric="removals"] strong')).toHaveText('0');
            await s.page.getByText('Histórico legado sem data informada', { exact: true }).click(); await s.page.getByRole('button', { name: 'Histórico legado QA 0 · Goiânia', exact: true }).click();
            await expect(s.page.getByRole('dialog')).toContainText('Histórico legado · somente consulta'); await expect(s.page.getByRole('dialog')).toContainText('source-qa.zip'); await expect(s.page.getByRole('dialog')).toContainText('Autoria histórica não verificada');
            for (const name of ['Editar projeto', 'Editar agendamento', 'Adicionar ação pendente', 'Resolver pendência', 'Cancelar projeto', 'Adicionar anotação']) await expect(s.page.getByRole('dialog').getByRole('button', { name, exact: true })).toHaveCount(0);
            await s.page.keyboard.press('Escape'); await tab(s.page, 'Pendências').click(); await expect(panel(s.page)).toContainText('Dado histórico QA');
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Release UI: Internos cannot enter the page or fetch planning data even with schedule permissions', async () => {
        const s = await setup({ internos: true }); try {
            await expect(s.page.getByRole('heading', { name: 'Cronograma e Planejamento', exact: true })).toHaveCount(0);
            await expect(s.page.getByRole('link', { name: 'Cronograma e Planejamento', exact: true })).toHaveCount(0);
            assert(!s.requests.some(item => item.path.startsWith('/project-services'))); assert.deepEqual(writes(s), []);
        } finally { await s.context.close(); }
    });
};
