const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));
module.exports = async ({ run, browser, base, shots, fixedNow }) => {
    async function setup({ readonly = false, denied = false, external = false, mobile = false, many = false, failList = false, failHistory = false, failSave = false, route = '/dashboard/projetos/estruturas' } = {}) {
        const company = { id: crypto.randomUUID(), name: 'Cliente ciclos QA' }, other = { id: crypto.randomUUID(), name: 'Outro cliente ciclos QA' }, tech = { id: crypto.randomUUID(), name: 'Técnico estruturas QA' };
        const structure = { id: crypto.randomUUID(), name: 'Sala principal QA', kind: 'ROOM', company, createdAt: new Date(fixedNow).toISOString() };
        const rows = [structure, ...Array.from({ length: many ? 101 : 1 }, (_, i) => ({ ...structure, id: crypto.randomUUID(), name: `Totem adicional QA ${i}`, kind: 'TOTEM', company: other }))];
        const choices = { companies: [company, other], projects: [], markers: [], internalUsers: [tech], contractors: [] };
        const cycle = { id: crypto.randomUUID(), structureId: structure.id, structureName: structure.name, companyName: company.name,
            installation: { id: crypto.randomUUID(), projectName: 'Instalação concluída ciclos QA', status: 'DONE', completedAt: new Date(fixedNow - 5 * 86_400_000).toISOString() },
            removals: [{ id: crypto.randomUUID(), projectName: 'Desinstalação cancelada ciclos QA', status: 'CANCELLED', completedAt: null }],
            installedAt: new Date(fixedNow - 5 * 86_400_000).toISOString(), removedAt: null, durationDays: 5, status: 'INSTALLED', createdAt: new Date(fixedNow - 6 * 86_400_000).toISOString() };
        const record = { id: cycle.installation.id, projectId: crypto.randomUUID(), name: cycle.installation.projectName, company, type: 'INSTALLATION', status: 'DONE', marker: null,
            urgency: 0, color: '#ABFF10', address: '', city: '', state: '', mapsUrl: null, notes: 'Instruções completas ciclos QA', sectors: [], requiresTravel: false, relevant: false,
            internalAssignees: [tech], contractors: [], schedule: { id: crypto.randomUUID(), startDate: new Date(fixedNow + 86_400_000).toISOString(), endDate: new Date(fixedNow + 90_000_000).toISOString() },
            startedAt: null, completedAt: cycle.installedAt, cancelledAt: null, createdAt: cycle.createdAt,
            structureCycle: { id: cycle.id, structureId: structure.id, structureName: structure.name, installationId: cycle.installation.id } };
        const requests = [], errors = [], state = { failList, failHistory, failSave, failAvailable: false };
        const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1100 }, timezoneId: 'America/Sao_Paulo' });
        await context.addInitScript(() => { localStorage.setItem('accessToken', 'synthetic-structures-qa'); localStorage.setItem('userType', 'internal'); });
        await context.route('**/*', async interception => {
            const request = interception.request(), url = new URL(request.url());
            if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return interception.abort();
            if (url.port !== '3999') return interception.continue();
            const respond = (payload, status = 200) => interception.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }, body: JSON.stringify(payload) });
            if (request.method() === 'OPTIONS') return respond({});
            const body = request.postData() ? request.postDataJSON() : null;
            requests.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), method: request.method(), body });
            if (url.pathname === '/auth/me') return respond({ data: { id: 'structures-user-qa', name: 'Usuário estruturas QA', type: external ? 'external' : 'internal', role: { name: 'Gestor' } } });
            if (url.pathname === '/auth/me/permissions') return respond({ data: denied ? ['dashboard.view'] : readonly ? ['dashboard.view', 'schedule.view'] : ['dashboard.view', 'schedule.view', 'schedule.create', 'schedule.update'] });
            if (url.pathname.includes('pending-rating')) return respond({ data: null });
            if (url.pathname === '/project-services/options') return respond({ data: choices });
            if (url.pathname === '/project-services' && body) return respond({ data: { ...record, ...body, id: crypto.randomUUID() } }, 201);
            if (url.pathname === '/project-services') return respond({ data: [record], total: 1, page: 1, limit: 50 });
            if (url.pathname === `/project-services/${record.id}`) return respond({ data: record });
            if (url.pathname === '/structures' && body) {
                if (state.failSave) return respond({ error: { message: 'Nome de estrutura duplicado QA' } }, 409);
                const row = { id: crypto.randomUUID(), name: body.name, kind: body.kind, company: choices.companies.find(item => item.id === body.companyId), createdAt: new Date(fixedNow).toISOString() }; rows.push(row); return respond({ data: row }, 201);
            }
            if (url.pathname === '/structures') {
                if (state.failList) return respond({ error: { message: 'Falha sintética de estruturas QA' } }, 503);
                const filtered = rows.filter(row => (!url.searchParams.get('companyId') || row.company.id === url.searchParams.get('companyId')) && (!url.searchParams.get('search') || row.name.includes(url.searchParams.get('search'))));
                const page = Number(url.searchParams.get('page') || 1), limit = Number(url.searchParams.get('limit') || 50);
                return respond({ data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit });
            }
            if (url.pathname.endsWith('/available-cycle')) return state.failAvailable ? respond({ error: { message: 'Falha sintética de ciclo QA' } }, 503) : respond({ data: cycle });
            if (url.pathname.endsWith('/cycles')) return state.failHistory ? respond({ error: { message: 'Falha sintética de histórico QA' } }, 503) : respond({ data: url.pathname.includes(structure.id) ? [cycle] : [], total: url.pathname.includes(structure.id) ? 1 : 0, page: 1, limit: 20 });
            return respond({ data: [] });
        });
        const page = await context.newPage(); page.on('pageerror', err => errors.push(err.message)); await page.goto(base + route);
        return { context, page, requests, errors, state, structure, cycle, company, other };
    }
    const dialog = page => page.getByRole('dialog');
    await run('Project creation omits the room/totem field and does not create a structure implicitly', async () => {
        const s = await setup({ route: '/dashboard/projetos?aba=projetos' }); try {
            await s.page.getByRole('button', { name: 'Novo projeto', exact: true }).click(); const d = dialog(s.page);
            await d.getByLabel('Cliente', { exact: true }).selectOption(s.company.id); await d.getByLabel('Nome do projeto').fill('Projeto sem sala vinculada QA');
            await d.getByLabel('Endereço').fill('Rua de teste, 10');
            await expect(d.getByLabel('Sala ou totem atendido (opcional)')).toHaveCount(0);
            await expect(d.getByRole('button', { name: 'Cadastrar sala ou totem', exact: true })).toHaveCount(0);
            await d.getByRole('button', { name: 'Salvar projeto', exact: true }).click(); await expect(d).toHaveCount(0);
            const writes = s.requests.filter(row => ['POST', 'PUT', 'DELETE'].includes(row.method));
            assert.equal(writes.length, 1); assert.equal(writes[0].path, '/project-services');
            assert.equal(writes[0].body.companyId, s.company.id); assert.equal(writes[0].body.name, 'Projeto sem sala vinculada QA');
            assert.equal(writes[0].body.structureId, null); assert.equal(writes[0].body.removalCycleId, null);
            assert.equal(new URL(s.page.url()).searchParams.get('aba'), 'projetos'); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Unified R3 history: readonly project details open installation history without nested popup or navigation', async () => {
        const s = await setup({ route: '/dashboard/projetos?aba=projetos', readonly: true }); try {
            await s.page.getByRole('button', { name: 'Ver projeto', exact: true }).click(); const d = dialog(s.page);
            await expect(d.getByLabel('Nome do projeto')).toBeDisabled();
            await d.getByRole('button', { name: 'Ver histórico de instalações', exact: true }).click();
            await expect(d.getByRole('region', { name: 'Histórico de instalações: Sala principal QA', exact: true })).toContainText('Dias instalada');
            await expect(s.page.getByRole('dialog')).toHaveCount(1);
            await expect(d.getByRole('button', { name: 'Salvar projeto', exact: true })).toHaveCount(0);
            assert(!s.requests.some(row => ['POST', 'PUT', 'DELETE'].includes(row.method)));
            await s.page.keyboard.press('Escape'); await expect(d).toHaveCount(0);
            assert.equal(new URL(s.page.url()).searchParams.get('aba'), 'projetos'); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Structures UI: client filters, all list pages and permission-controlled registration', async () => {
        const s = await setup({ many: true }); try {
            await expect(s.page.getByRole('heading', { name: 'Histórico de instalações', exact: true })).toBeVisible();
            await expect(s.page.getByText('Página 1 de 3')).toBeVisible();
            await s.page.getByRole('button', { name: 'Próxima', exact: true }).click(); await expect(s.page.getByText('Página 2 de 3')).toBeVisible();
            await s.page.getByRole('tabpanel').getByLabel('Cliente', { exact: true }).last().selectOption(s.company.id);
            await expect(s.page.locator('tbody tr')).toHaveCount(1); await expect(s.page.getByText('Página 2 de 3')).toHaveCount(0);
            await s.page.getByLabel('Buscar sala ou totem', { exact: true }).fill('Não existe'); await expect(s.page.getByText('Nenhum local atendido cadastrado para este filtro.')).toBeVisible();
            assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
        const r = await setup({ readonly: true }); try { await expect(r.page.getByRole('button', { name: 'Ver histórico de instalações: Sala principal QA' })).toBeVisible(); await expect(r.page.getByRole('button', { name: 'Cadastrar sala ou totem', exact: true })).toHaveCount(0); } finally { await r.context.close(); }
    });
    await run('Structures UI: failed registration retains draft; successful registration opens explicit history', async () => {
        const s = await setup({ failSave: true }); try {
            await s.page.getByRole('button', { name: 'Cadastrar sala ou totem', exact: true }).click(); const form = s.page.getByRole('form', { name: 'Cadastrar sala ou totem', exact: true });
            await form.getByLabel('Cliente', { exact: true }).selectOption(s.company.id); await form.getByLabel('Nome do local atendido', { exact: true }).fill('Totem cadastrado QA'); await form.getByLabel('Tipo do local atendido', { exact: true }).selectOption('TOTEM');
            await form.getByRole('button', { name: 'Salvar local atendido', exact: true }).click(); await expect(form.getByRole('alert')).toContainText('Nome de estrutura duplicado QA'); await expect(form.getByLabel('Nome do local atendido', { exact: true })).toHaveValue('Totem cadastrado QA');
            s.state.failSave = false; await form.getByRole('button', { name: 'Salvar local atendido', exact: true }).click(); await expect(s.page.getByRole('region', { name: 'Histórico de instalações: Totem cadastrado QA' })).toContainText('Este local atendido ainda não possui instalações vinculadas.');
            assert.equal(s.requests.filter(r => r.path === '/structures' && r.body).at(-1).body.kind, 'TOTEM'); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Structures UI: actual dates, duration, cancelled attempts, full project popup and focus return', async () => {
        const s = await setup(); try {
            await s.page.getByRole('button', { name: 'Ver histórico de instalações: Sala principal QA' }).click(); const history = s.page.getByRole('region', { name: 'Histórico de instalações: Sala principal QA' });
            await expect(history).toContainText('Dias instalada'); await expect(history).toContainText('Ainda instalada'); await expect(history).toContainText('Desinstalação cancelada ciclos QA'); await expect(history.locator('dd').last()).toHaveText('5');
            await history.getByRole('button', { name: 'Instalação concluída ciclos QA', exact: true }).click(); await expect(dialog(s.page)).toContainText('Instruções completas ciclos QA');
            await expect(dialog(s.page).getByLabel('Sala ou totem atendido (opcional)', { exact: true })).toHaveCount(0);
            await dialog(s.page).getByRole('button', { name: 'Fechar', exact: true }).click(); await expect(history.getByRole('button', { name: 'Instalação concluída ciclos QA', exact: true })).toBeFocused();
            await s.page.screenshot({ path: path.join(shots, 'structures-desktop.png'), fullPage: true }); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Existing room link remains read-only and survives a project edit', async () => {
        const s = await setup({ route: '/dashboard/projetos?aba=projetos' }); try {
            await s.page.getByRole('button', { name: 'Editar projeto', exact: true }).click(); const d = dialog(s.page);
            await expect(d.getByText(s.structure.name)).toBeVisible();
            await expect(d.getByLabel('Sala ou totem atendido (opcional)', { exact: true })).toHaveCount(0);
            await d.getByLabel('Endereço').fill('Rua de teste, 10');
            await d.getByRole('button', { name: 'Salvar projeto', exact: true }).click(); await expect(d).toHaveCount(0);
            const write = s.requests.find(r => r.path.startsWith('/project-services/') && r.method === 'PUT');
            assert.equal(write.body.structureId, s.structure.id); assert.equal(write.body.removalCycleId, null); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Structures UI: initial list/history failures are visible and retry recovers without fake emptiness', async () => {
        const s = await setup({ failList: true, failHistory: true }); try {
            await expect(s.page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o histórico de instalações.' })).toBeVisible(); await expect(s.page.getByText('Nenhum local atendido cadastrado para este filtro.')).toHaveCount(0);
            s.state.failList = false; await s.page.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await s.page.getByRole('button', { name: 'Ver histórico de instalações: Sala principal QA' }).click(); const history = s.page.getByRole('region', { name: 'Histórico de instalações: Sala principal QA' });
            await expect(history.getByRole('alert')).toContainText('Não foi possível carregar o histórico de instalações.'); await expect(history.getByText('Este local atendido ainda não possui instalações vinculadas.')).toHaveCount(0);
            s.state.failHistory = false; await history.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await expect(history).toContainText('Instalação concluída ciclos QA'); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Structures UI: denied/external sessions do not query operational data; mobile fits viewport', async () => {
        for (const opts of [{ denied: true }, { external: true }]) { const s = await setup(opts); try { await expect(s.page.getByText('Você não tem permissão para visualizar a agenda de projetos.', { exact: true })).toBeVisible(); assert(!s.requests.some(r => r.path === '/structures' || r.path === '/project-services/options')); } finally { await s.context.close(); } }
        const s = await setup({ mobile: true }); try { await s.page.getByRole('button', { name: 'Ver histórico de instalações: Sala principal QA' }).click(); await expect(s.page.getByRole('region', { name: 'Histórico de instalações: Sala principal QA' })).toContainText('Dias instalada'); assert(await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await s.page.screenshot({ path: path.join(shots, 'structures-mobile.png'), fullPage: true }); assert.deepEqual(s.errors, []); } finally { await s.context.close(); }
    });
};
