/* UI behavior with intercepted synthetic data only. API rules are tested separately. */
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

module.exports = async ({ run, browser, base, shots, fixedNow }) => {
    const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
    const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));
    const company = { id: crypto.randomUUID(), name: 'Empresa projetos QA', address: 'Rua da sede, 10', city: 'Brasília', state: 'DF' };
    const tech = { id: crypto.randomUUID(), name: 'Responsável interno QA', sector: 'Operações', agendaColor: '#2255AA', roleName: 'Técnico' };
    const contractor = { id: crypto.randomUUID(), name: 'Prestador projetos QA' };
    const marker = { id: crypto.randomUUID(), name: 'Sala interativa QA' };
    const start = new Date(fixedNow + 2 * 86_400_000).toISOString(), end = new Date(Date.parse(start) + 3_600_000).toISOString();
    const localTime = iso => { const date = new Date(iso); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };
    function record(name, extra = {}) {
        return { id: crypto.randomUUID(), projectId: crypto.randomUUID(), name, company, type: 'INSTALLATION', status: 'PENDING', marker: null,
            urgency: 0, color: '#ABFF10', address: 'Rua de teste, 100', city: 'São Paulo', state: 'SP', mapsUrl: 'https://maps.app.goo.gl/teste-qa', notes: 'Observações completas QA', sectors: ['Operações'],
            requiresTravel: false, relevant: false, internalAssignees: [], contractors: [], schedule: null, startedAt: null, completedAt: null, cancelledAt: null, createdAt: new Date(fixedNow).toISOString(), ...extra };
    }
    async function setup({ permissions = ['dashboard.view', 'schedule.view', 'schedule.create', 'schedule.update'], mobile = false, empty = false, failures = {} } = {}) {
        const records = empty ? [] : [record('Pendente normal QA'), record('Urgente agendado QA', { marker, urgency: 2, type: 'REMOVAL', contractors: [contractor], status: 'SCHEDULED', schedule: { id: crypto.randomUUID(), startDate: start, endDate: end } })];
        const choices = { companies: [company], projects: [{ id: crypto.randomUUID(), name: 'Cadastro antigo QA', companyId: company.id, address: 'Rua da obra, 42', city: 'Goiânia', state: 'GO', hasService: false }, { id: crypto.randomUUID(), name: 'Projeto já usado QA', companyId: company.id, address: null, city: null, state: null, hasService: true }], markers: [marker], followups: [], internalUsers: [tech], contractors: [contractor] };
        const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1100 } });
        const requests = [], errors = [];
        await context.addInitScript(() => { localStorage.setItem('accessToken', 'synthetic-projects'); localStorage.setItem('userType', 'internal'); });
        await context.route('**/*', async route => {
            const request = route.request(), url = new URL(request.url());
            if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return route.abort();
            if (url.port !== '3999') return route.continue();
            const body = request.postData() ? request.postDataJSON() : undefined;
            requests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), method: request.method(), body });
            const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }, body: JSON.stringify(data) });
            if (request.method() === 'OPTIONS') return respond({});
            if (failures[url.pathname]) return respond({ error: { message: 'Falha sintética projetos QA' } }, 503);
            if (url.pathname === '/auth/me') return respond({ data: { id: 'actor-qa', type: 'internal', name: 'Organizador QA', email: 'projects@example.test', role: { id: 'role-qa', name: 'Projetos QA' } } });
            if (url.pathname === '/auth/me/permissions') return respond({ data: permissions });
            if (url.pathname === '/tickets/my-internal/pending-rating') return respond({ data: null });
            if (url.pathname === '/project-services/options') return respond({ data: choices });
            if (url.pathname === '/schedule') {
                const rows = records.filter(record => record.schedule).map(record => ({ ...record.schedule, title: record.name, type: record.type, status: record.status,
                    address: record.address, notes: record.notes, companyId: company.id, projectId: record.projectId, companyName: company.name, projectName: record.name,
                    parentScheduleId: null, createdByName: null, installers: record.internalAssignees,
                    projectService: { id: record.id, projectId: record.projectId, marker: record.marker, color: record.color, urgency: record.urgency,
                        requiresTravel: record.requiresTravel, contractors: record.contractors.map(user => ({ user })) } }));
                return respond({ data: rows, total: rows.length });
            }
            if (url.pathname === '/project-services/markers') {
                const value = { id: crypto.randomUUID(), name: body.name }; choices.markers.push(value); return respond({ data: value }, 201);
            }
            const matched = url.pathname.match(/^\/project-services(?:\/([^/]+)(?:\/(status))?)?$/);
            if (matched) {
                if (request.method() === 'GET') {
                    if (matched[1]) return respond({ data: records.find(record => record.id === matched[1]) });
                    const filtered = records.filter(record => (!url.searchParams.get('search') || record.name.toLowerCase().includes(url.searchParams.get('search').toLowerCase()))
                        && (!url.searchParams.get('status') || record.status === url.searchParams.get('status')) && (!url.searchParams.get('type') || record.type === url.searchParams.get('type'))).sort((a, b) => b.urgency - a.urgency);
                    return respond({ data: filtered, total: filtered.length, limit: 50, page: 1 });
                }
                const existing = records.find(record => record.id === matched[1]);
                if (matched[2]) { existing.status = body.status; return respond({ data: existing }); }
                const value = { ...record(body.name), ...existing, ...body, company,
                    marker: choices.markers.find(marker => marker.id === body.markerId) || null,
                    internalAssignees: choices.internalUsers.filter(user => body.installerIds.includes(user.id)),
                    contractors: choices.contractors.filter(user => body.contractorIds.includes(user.id)),
                    schedule: body.startDate ? { id: existing?.schedule?.id || crypto.randomUUID(), startDate: body.startDate, endDate: body.endDate } : null,
                    status: existing?.schedule ? existing.status : body.startDate ? 'SCHEDULED' : 'PENDING' };
                if (existing) Object.assign(existing, value); else records.push(value);
                return respond({ data: value }, existing ? 200 : 201);
            }
            return respond({ data: [] });
        });
        const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '/dashboard/projetos?aba=projetos');
        return { context, page, requests, errors, records, choices, failures };
    }
    const row = (page, name) => page.locator('tbody tr').filter({ hasText: name });
    const dialog = page => page.getByRole('dialog');
    await run('Project UI: marker above title, urgent first, explicit undated state and source filters', async () => {
        const data = await setup();
        try {
            await expect(data.page.locator('tbody tr').first()).toContainText('Urgente agendado QA');
            await expect(data.page.getByRole('tab', { name: 'Visão geral', exact: true })).toBeVisible();
            await expect(data.page.getByRole('link', { name: 'Dashboard de projetos', exact: true })).toHaveCount(0);
            await expect(row(data.page, 'Pendente normal QA')).toContainText('Sem agendamento');
            const top = row(data.page, 'Urgente agendado QA');
            assert(await top.locator('[data-service-marker]').evaluate(element => element.getBoundingClientRect().bottom <= element.nextElementSibling.getBoundingClientRect().top));
            await expect(top.getByRole('link', { name: 'Abrir localização' })).toHaveAttribute('target', '_blank');
            await data.page.getByLabel('Filtrar por serviço').selectOption('INSTALLATION'); await expect(data.page.locator('tbody tr')).toHaveCount(1);
            await data.page.getByLabel('Filtrar por status').selectOption('SCHEDULED'); await expect(data.page.getByText(/Nenhum projeto encontrado/)).toBeVisible();
            assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
    await run('Project UI: creates installation with required address, grouped staff, highlighted followup and linked travel', async () => {
        const data = await setup();
        try {
            await data.page.getByText('Configurações de projetos', { exact: true }).click();
            await data.page.getByLabel('Novo marcador', { exact: true }).fill('Totem QA');
            await data.page.getByRole('button', { name: 'Adicionar marcador' }).click();
            await data.page.getByRole('button', { name: 'Novo projeto', exact: true }).click();
            await dialog(data.page).getByLabel('Cliente', { exact: true }).selectOption(company.id);
            await expect(dialog(data.page).getByLabel('Endereço', { exact: true })).toHaveValue(company.address);
            await expect(dialog(data.page).getByLabel('Cidade', { exact: true })).toHaveValue(company.city);
            await expect(dialog(data.page).getByLabel('UF', { exact: true })).toHaveValue(company.state);
            await dialog(data.page).getByLabel('Projeto existente (opcional)').selectOption(data.choices.projects[0].id);
            await expect(dialog(data.page).getByLabel('Endereço', { exact: true })).toHaveValue('Rua da obra, 42');
            await dialog(data.page).getByLabel('Projeto existente (opcional)').selectOption('');
            await expect(dialog(data.page).getByLabel('Endereço', { exact: true })).toHaveValue(company.address);
            await dialog(data.page).getByLabel('Nome do projeto', { exact: true }).fill('Projeto completo UI QA');
            await dialog(data.page).getByLabel('Endereço', { exact: true }).fill('Rua do destino, 55');
            await dialog(data.page).getByLabel('Cidade', { exact: true }).fill('Goiânia');
            await dialog(data.page).getByLabel('UF', { exact: true }).fill('GO');
            await dialog(data.page).getByLabel('Início previsto').fill(localTime(start));
            await dialog(data.page).getByLabel('Término previsto').fill(localTime(end));
            await dialog(data.page).getByLabel('Marcador de modelo').selectOption({ label: 'Totem QA' });
            await dialog(data.page).getByLabel('Urgência').selectOption('2'); await dialog(data.page).getByLabel('Cor do projeto').fill('#CC5500');
            await dialog(data.page).getByLabel(tech.name).first().check();
            await dialog(data.page).getByLabel('Terá viagem?').check();
            await dialog(data.page).getByLabel('Cidade de origem').fill('Brasília');
            await dialog(data.page).getByLabel('UF de origem').fill('DF');
            await dialog(data.page).getByLabel(new RegExp(tech.name)).last().check();
            await dialog(data.page).getByLabel('Destaque para acompanhamento').check();
            await dialog(data.page).getByLabel('Observações').fill('Todas as orientações da execução QA');
            await dialog(data.page).getByRole('button', { name: 'Salvar projeto', exact: true }).click();
            await expect(dialog(data.page)).toHaveCount(0); await expect(row(data.page, 'Projeto completo UI QA')).toContainText('Agendado');
            const saved = data.requests.find(request => request.path === '/project-services' && request.method === 'POST').body;
            assert.deepEqual(saved.sectors, []); assert.equal(saved.requiresTravel, true); assert.equal(saved.color, '#cc5500');
            assert.equal(saved.type, 'INSTALLATION'); assert.equal(saved.address, 'Rua do destino, 55');
            assert.deepEqual(saved.travelParticipantIds, [tech.id]); assert.equal(saved.travelOriginState, 'DF');
            assert.equal(saved.relevant, true); assert.equal(saved.urgency, 2);
            assert.equal(saved.notes, 'Todas as orientações da execução QA'); assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
    await run('Project UI: schedules a pending project with a contractor only; same dates appear on calendar and form', async () => {
        const data = await setup();
        try {
            await row(data.page, 'Pendente normal QA').getByRole('button', { name: 'Editar projeto' }).click();
            await dialog(data.page).getByLabel('Início previsto').fill(localTime(start)); await dialog(data.page).getByLabel('Término previsto').fill(localTime(end));
            await dialog(data.page).getByLabel(contractor.name).check();
            await dialog(data.page).getByRole('button', { name: 'Salvar projeto' }).click(); await expect(dialog(data.page)).toHaveCount(0);
            const saved = data.requests.find(request => request.method === 'PUT' && request.path.startsWith('/project-services/')).body;
            assert.deepEqual(saved.installerIds, []); assert.deepEqual(saved.contractorIds, [contractor.id]);
            await data.page.getByRole('tab', { name: 'Agenda', exact: true }).click();
            await data.page.getByRole('button', { name: 'Calendário', exact: true }).click();
            await expect(data.page.locator('.fc-event').filter({ hasText: 'Pendente normal QA' }).first()).toBeVisible();
            await data.page.locator('.fc-event').filter({ hasText: 'Pendente normal QA' }).first().click();
            await expect(dialog(data.page).getByLabel('Início previsto')).toHaveValue(localTime(start));
            await expect(dialog(data.page).getByLabel(contractor.name)).toBeChecked(); assert.deepEqual(data.errors, []);
            await data.page.screenshot({ path: path.join(shots, 'project-calendar-form.png'), animations: 'disabled' });
        } finally { await data.context.close(); }
    });
    await run('Project UI: read-only user can inspect full details but cannot edit or drag calendar events', async () => {
        const data = await setup({ permissions: ['dashboard.view', 'schedule.view'] });
        try {
            await expect(data.page.getByRole('button', { name: 'Novo projeto' })).toHaveCount(0);
            await row(data.page, 'Pendente normal QA').getByRole('button', { name: 'Ver projeto' }).click();
            await expect(dialog(data.page).getByLabel('Observações')).toHaveValue('Observações completas QA');
            await expect(dialog(data.page).getByLabel('Observações')).toBeDisabled(); await expect(dialog(data.page).getByRole('button', { name: 'Salvar projeto' })).toHaveCount(0);
            await data.page.keyboard.press('Escape'); await expect(dialog(data.page)).toHaveCount(0);
            await data.page.getByRole('tab', { name: 'Agenda', exact: true }).click();
            await data.page.getByRole('button', { name: 'Calendário', exact: true }).click(); await expect(data.page.locator('.fc-event').first()).toBeVisible();
            await expect(data.page.locator('.fc-event-draggable')).toHaveCount(0);
            assert(!data.requests.some(request => request.method === 'POST' || request.method === 'PUT'));
        } finally { await data.context.close(); }
    });
    await run('Project UI: mobile form fits, keyboard stays in popup, Escape preserves screen and validation retains draft', async () => {
        const data = await setup({ mobile: true });
        try {
            await data.page.getByRole('button', { name: 'Novo projeto' }).click();
            await dialog(data.page).getByLabel('Cliente', { exact: true }).selectOption(company.id);
            await dialog(data.page).getByLabel('Nome do projeto').fill('Rascunho móvel QA');
            await dialog(data.page).getByLabel('Endereço', { exact: true }).fill('Rua móvel, 10');
            await dialog(data.page).getByLabel('Início previsto').fill(localTime(start));
            await dialog(data.page).getByRole('button', { name: 'Salvar projeto' }).click();
            await expect(dialog(data.page).getByRole('alert')).toContainText('Informe início e término válidos');
            await expect(dialog(data.page).getByLabel('Nome do projeto')).toHaveValue('Rascunho móvel QA');
            await data.page.keyboard.press('Tab'); assert(await dialog(data.page).evaluate(element => element.contains(document.activeElement)));
            assert(await dialog(data.page).evaluate(element => element.getBoundingClientRect().right <= innerWidth && element.getBoundingClientRect().left >= 0));
            assert(await data.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            await data.page.screenshot({ path: path.join(shots, 'project-mobile-form.png'), animations: 'disabled' });
            await data.page.keyboard.press('Escape'); await expect(dialog(data.page)).toHaveCount(0); assert.equal(data.page.url(), base + '/dashboard/projetos?aba=projetos');
            assert(!data.requests.some(request => request.path === '/project-services' && request.method === 'POST')); assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
    await run('Project UI: empty state, recovery and denied role do not expose editing requests', async () => {
        const data = await setup({ empty: true });
        try { await expect(data.page.getByText(/Nenhum projeto encontrado/)).toBeVisible(); } finally { await data.context.close(); }
        const failures = { '/project-services': true }, failed = await setup({ failures });
        try {
            const alert = failed.page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os projetos' });
            await expect(alert).toBeVisible(); delete failures['/project-services'];
            await alert.getByRole('button', { name: 'Tentar novamente' }).click();
            await expect(failed.page.locator('tbody tr')).toHaveCount(2);
        } finally { await failed.context.close(); }
        const denied = await setup({ permissions: ['dashboard.view'] });
        try { await expect(denied.page.getByText('Você não tem permissão para visualizar a agenda de projetos.')).toBeVisible(); assert(!denied.requests.some(request => request.path.startsWith('/project-services'))); } finally { await denied.context.close(); }
    });
};
if (require.main === module) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-dashboard.cjs'), '--projects'], { stdio: 'inherit', windowsHide: true });
    process.exitCode = result.status ?? 1;
}
