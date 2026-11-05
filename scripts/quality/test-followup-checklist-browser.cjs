/* Synthetic intercepted API only; shared browser runner starts an isolated Next. */
const assert = require('node:assert/strict'), path = require('node:path'), crypto = require('node:crypto');
const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));
module.exports = async ({ run, browser, base, shots }) => {
    async function setup({ reader = false, failCatalog = false, uncertain = false, viewport, computer = false, projectorSupport = false } = {}) {
        const context = await browser.newContext({ viewport: viewport || { width: 1440, height: 1000 } });
        const catalog = [{ id: crypto.randomUUID(), text: 'Cabo HDMI' }, ...Array.from({ length: 60 }, (_, i) => ({ id: crypto.randomUUID(), text: 'Item extra ' + String(i).padStart(3,'0') })), { id: crypto.randomUUID(), text: 'Monitor 24 polegadas' }];
        if (computer) catalog.push({ id: crypto.randomUUID(), text: 'Computador', components: [
            { text: 'GPU atual', quantity: 1, selectedByDefault: true },
            { text: 'SSD 1TB', quantity: 1, selectedByDefault: true },
            { text: 'RAM 32GB', quantity: 2, selectedByDefault: true },
            { text: 'GPU antiga', quantity: 1, selectedByDefault: false },
        ] });
        if (projectorSupport) catalog.push({ id: crypto.randomUUID(), text: 'Suporte de projetor', components: [
            { text: 'Bases para teto', quantity: 3, selectedByDefault: true },
            { text: 'Bases para projetor', quantity: 3, selectedByDefault: true },
            { text: 'Cálices', quantity: 3, selectedByDefault: true },
            { text: 'Parafusos para fixação', quantity: 9, selectedByDefault: true },
        ] });
        const block = { id: 'block-qa', type: 'CHECKLIST', title: 'Equipamentos QA', order: 0, attachments: [], comments: [],
            checklistItems: [{ id: 'legacy-qa', text: 'Item antigo', quantity: null, details: 'Detalhes preservados', checked: true, order: 0 }] };
        const followup = { id: 'followup-qa', code: 'AC-CHECKLIST-QA', status: 'IN_PROGRESS', company: { id: 'company-qa', name: 'Cliente checklist QA' },
            createdBy: { id: 'editor-qa', name: 'Editor QA', email: 'editor@example.test' }, createdAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z', blocks: [block] };
        const requests = [], errors = [], applied = new Set();
        await context.addInitScript(() => { localStorage.setItem('accessToken', 'synthetic-checklist'); localStorage.setItem('userType', 'internal'); });
        await context.route('**/*', async route => {
            const request = route.request(), url = new URL(request.url());
            if (!['127.0.0.1','localhost'].includes(url.hostname) && !['data:','blob:','about:'].includes(url.protocol)) return route.abort();
            if (url.port !== '3999') return route.continue();
            const body = request.postData() ? request.postDataJSON() : undefined;
            requests.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), method: request.method(), body });
            const respond = (payload, status = 200) => route.fulfill({ status, contentType: 'application/json',
                headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' },
                body: JSON.stringify(payload) });
            if (request.method() === 'OPTIONS') return respond({});
            if (url.pathname === '/auth/me') return respond({ data: { id: 'editor-qa', type: 'internal', name: 'Editor QA', role: { id: 'role-qa', name: 'Técnico' } } });
            if (url.pathname === '/auth/me/permissions') return respond({ data: ['dashboard.view','followups.view', ...(!reader ? ['followups.edit'] : [])] });
            if (url.pathname === '/tickets/my-internal/pending-rating') return respond({ data: null });
            if (url.pathname === '/followups') return respond({ data: [followup], total: 1 });
            if (url.pathname === '/followups/followup-qa') return respond({ data: followup });
            if (url.pathname.endsWith('/projects-public')) return respond({ data: [] });
            if (url.pathname === '/followups/checklist-catalog') {
                if (request.method() === 'POST') {
                    const item = catalog.find(item => item.text.toLowerCase() === body.text.toLowerCase()) || { id: crypto.randomUUID(), text: body.text };
                    if (!catalog.includes(item)) catalog.push(item);
                    return respond({ data: item }, 201);
                }
                if (failCatalog) return respond({ error: { message: 'Falha de catálogo QA' } }, 503);
                const search = (url.searchParams.get('search') || '').toLowerCase(), page = Number(url.searchParams.get('page') || 1);
                const rows = catalog.filter(item => item.text.toLowerCase().includes(search)).sort((a,b) => a.text.localeCompare(b.text));
                return respond({ data: rows.slice((page - 1) * 50, page * 50), total: rows.length, page, limit: 50 });
            }
            if (url.pathname.endsWith('/checklist/batch') && request.method() === 'POST') {
                if (!applied.has(body.requestId)) {
                    for (const selected of body.items) {
                        const item = catalog.find(row => row.id === selected.catalogItemId);
                        block.checklistItems.push({ id: crypto.randomUUID(), text: item.text, quantity: selected.quantity, components: selected.components ?? [], checked: false, details: null, order: block.checklistItems.length });
                    }
                    applied.add(body.requestId);
                }
                if (uncertain) { uncertain = false; return respond({ error: { message: 'Resposta perdida QA' } }, 503); }
                return respond({ data: { addedCount: body.items.length, replayed: true } }, 201);
            }
            if (url.pathname.includes('/checklist/') && request.method() === 'PUT') {
                const item = block.checklistItems.find(row => row.id === url.pathname.split('/').at(-1));
                Object.assign(item, body);
                return respond({ data: item });
            }
            return respond({ error: { message: 'Rota fora do cenário QA' } }, 403);
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '/dashboard/acompanhamento');
        await page.getByText(followup.code, { exact: true }).click();
        await expect(page.getByText('Equipamentos QA', { exact: true })).toBeVisible();
        return { context, page, requests, errors, block, catalog };
    }
    const open = page => page.getByRole('button', { name: 'Selecionar itens do catálogo', exact: true }).click();
    await run('Checklist UI: pagination, selection survives search, per-item quantities, new catalog item and later additions', async () => {
        const data = await setup();
        const { page, requests } = data;
        try {
            await open(page);
            const dialog = page.getByRole('dialog');
            await expect(dialog.getByRole('checkbox')).toHaveCount(50);
            await dialog.getByRole('button', { name: 'Carregar mais itens', exact: true }).click();
            await expect(dialog.getByRole('checkbox')).toHaveCount(62);
            await dialog.getByRole('checkbox', { name: 'Monitor 24 polegadas', exact: true }).check();
            await dialog.getByRole('spinbutton', { name: 'Quantidade de Monitor 24 polegadas', exact: true }).fill('4');
            await dialog.getByRole('textbox', { name: 'Buscar no catálogo', exact: true }).fill('Cabo');
            await expect(dialog.getByRole('checkbox')).toHaveCount(1);
            await dialog.getByRole('checkbox', { name: 'Cabo HDMI', exact: true }).check();
            await dialog.getByRole('spinbutton', { name: 'Quantidade de Cabo HDMI', exact: true }).fill('2');
            await expect(dialog.getByRole('spinbutton', { name: 'Quantidade de Monitor 24 polegadas', exact: true })).toHaveValue('4');
            await dialog.getByRole('textbox', { name: 'Cadastrar novo item no catálogo', exact: true }).fill('Adaptador USB');
            await dialog.getByRole('button', { name: 'Cadastrar e selecionar', exact: true }).click();
            await dialog.getByRole('spinbutton', { name: 'Quantidade de Adaptador USB', exact: true }).fill('3');
            await dialog.getByRole('spinbutton', { name: 'Quantidade de Cabo HDMI', exact: true }).fill('0');
            await dialog.getByRole('button', { name: 'Adicionar selecionados (3)', exact: true }).click();
            await expect(dialog.getByRole('alert')).toContainText('quantidade inteira');
            assert.equal(requests.filter(row => row.path.endsWith('/checklist/batch') && row.method === 'POST').length, 0);
            await dialog.getByRole('spinbutton', { name: 'Quantidade de Cabo HDMI', exact: true }).fill('2');
            await page.screenshot({ path: path.join(shots, 'followup-checklist-selection.png') });
            await dialog.getByRole('button', { name: 'Adicionar selecionados (3)', exact: true }).click();
            await expect(dialog).toHaveCount(0);
            await expect(page.getByRole('spinbutton', { name: 'Quantidade de Cabo HDMI', exact: true })).toHaveValue('2');
            assert.deepEqual(data.block.checklistItems.map(item => item.quantity), [null,4,2,3]);
            await open(page);
            await expect(page.getByRole('dialog').getByRole('checkbox', { name: 'Adaptador USB', exact: true })).toBeVisible();
            await page.getByRole('dialog').getByRole('checkbox', { name: 'Cabo HDMI', exact: true }).check();
            await page.getByRole('dialog').getByRole('spinbutton', { name: 'Quantidade de Cabo HDMI', exact: true }).fill('9');
            await page.getByRole('button', { name: 'Adicionar selecionados (1)', exact: true }).click();
            await expect(page.getByRole('dialog')).toHaveCount(0);
            await expect(page.getByRole('spinbutton', { name: 'Quantidade de Cabo HDMI', exact: true })).toHaveCount(2);
            const quantity = page.getByRole('spinbutton', { name: 'Quantidade de Adaptador USB', exact: true });
            await quantity.fill('8'); await quantity.press('Tab');
            await expect.poll(() => data.block.checklistItems.find(row => row.text === 'Adaptador USB').quantity).toBe(8);
            assert.equal(data.block.checklistItems[0].details, 'Detalhes preservados');
            const [print] = await Promise.all([
                page.waitForEvent('popup'),
                page.getByRole('button', { name: 'Exportar PDF', exact: true }).click(),
            ]);
            await expect(print.locator('body')).toContainText('Qtd.: 8');
            await print.close();
            assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
    await run('Checklist UI: uncertain response retains quantities and replays the same request without duplicates', async () => {
        const data = await setup({ uncertain: true });
        try {
            await open(data.page);
            const dialog = data.page.getByRole('dialog');
            await dialog.getByRole('checkbox', { name: 'Cabo HDMI', exact: true }).check();
            await dialog.getByRole('spinbutton', { name: 'Quantidade de Cabo HDMI', exact: true }).fill('7');
            await dialog.getByRole('button', { name: 'Adicionar selecionados (1)', exact: true }).click();
            await expect(dialog.getByRole('alert')).toContainText('sem duplicar');
            await expect(dialog.getByRole('spinbutton')).toHaveValue('7');
            await expect(dialog.getByRole('spinbutton')).toBeDisabled();
            await dialog.getByRole('button', { name: 'Verificar e concluir inclusão', exact: true }).click();
            await expect(dialog).toHaveCount(0);
            const submissions = data.requests.filter(row => row.path.endsWith('/checklist/batch') && row.method === 'POST');
            assert.equal(submissions.length, 2); assert.deepEqual(submissions[0].body, submissions[1].body);
            assert.equal(data.block.checklistItems.length, 2);
            assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
    await run('Checklist UI: catalog errors offer retry; reader cannot access catalog or editing', async () => {
        const failed = await setup({ failCatalog: true });
        try {
            await open(failed.page);
            await expect(failed.page.getByRole('dialog').getByText('Não foi possível carregar os itens do catálogo.')).toBeVisible();
            await expect(failed.page.getByRole('dialog').getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
            await expect(failed.page.getByRole('dialog').getByText('O catálogo ainda não tem itens.', { exact: false })).toHaveCount(0);
        } finally { await failed.context.close(); }
        const reader = await setup({ reader: true });
        try {
            await expect(reader.page.getByRole('button', { name: 'Selecionar itens do catálogo', exact: true })).toHaveCount(0);
            await expect(reader.page.getByRole('spinbutton')).toHaveCount(0);
            assert(!reader.requests.some(row => row.path === '/followups/checklist-catalog'));
            assert.deepEqual(reader.errors, []);
        } finally { await reader.context.close(); }
    });
    await run('Checklist UI: mobile layout, keyboard containment, Escape and focus restoration', async () => {
        const data = await setup({ viewport: { width: 375, height: 812 } });
        try {
            await open(data.page);
            const dialog = data.page.getByRole('dialog');
            await expect(dialog).toBeFocused();
            await dialog.getByRole('checkbox', { name: 'Cabo HDMI', exact: true }).check();
            await dialog.getByRole('spinbutton', { name: 'Quantidade de Cabo HDMI', exact: true }).fill('6');
            assert(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
            await dialog.getByRole('button', { name: 'Adicionar selecionados (1)', exact: true }).focus();
            await data.page.keyboard.press('Tab');
            await expect(dialog.getByRole('button', { name: 'Fechar', exact: true })).toBeFocused();
            await data.page.keyboard.press('Tab');
            await expect(dialog.getByRole('textbox', { name: 'Buscar no catálogo', exact: true })).toBeFocused();
            await data.page.screenshot({ path: path.join(shots, 'followup-checklist-mobile.png') });
            await data.page.keyboard.press('Escape');
            await expect(dialog).toHaveCount(0);
            await expect(data.page.getByRole('button', { name: 'Selecionar itens do catálogo', exact: true })).toBeFocused();
            assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
    await run('Checklist UI components: computer loads its previous parts, allows alternatives and independent quantities, then saves and edits snapshots', async () => {
        const data = await setup({ computer: true });
        const { page } = data;
        try {
            await open(page);
            const dialog = page.getByRole('dialog');
            await dialog.getByRole('checkbox', { name: 'Computador', exact: true }).check();
            const parts = dialog.getByRole('group', { name: 'Componentes de Computador', exact: true });
            await expect(parts.getByRole('checkbox', { name: 'Incluir GPU atual em Computador', exact: true })).toBeChecked();
            await expect(parts.getByRole('checkbox', { name: 'Incluir GPU antiga em Computador', exact: true })).not.toBeChecked();
            await parts.getByRole('checkbox', { name: 'Incluir GPU atual em Computador', exact: true }).uncheck();
            await parts.getByRole('checkbox', { name: 'Incluir GPU antiga em Computador', exact: true }).check();
            await dialog.getByRole('spinbutton', { name: 'Quantidade de Computador', exact: true }).fill('2');
            await parts.getByRole('spinbutton', { name: 'Quantidade de GPU antiga em Computador', exact: true }).fill('3');
            await parts.getByRole('spinbutton', { name: 'Quantidade de RAM 32GB em Computador', exact: true }).fill('0');
            await dialog.getByRole('button', { name: 'Adicionar selecionados (1)', exact: true }).click();
            await expect(dialog.getByRole('alert')).toContainText('componente');
            assert(!data.requests.some(row => row.method === 'POST' && row.path.endsWith('/batch')));
            await parts.getByRole('spinbutton', { name: 'Quantidade de RAM 32GB em Computador', exact: true }).fill('4');
            await parts.getByRole('textbox', { name: 'Novo componente de Computador', exact: true }).fill('Fonte 850W');
            await parts.getByRole('button', { name: 'Incluir componente', exact: true }).click();
            await parts.getByRole('spinbutton', { name: 'Quantidade de Fonte 850W em Computador', exact: true }).fill('5');
            await page.screenshot({ path: path.join(shots, 'followup-computer-components.png') });
            await dialog.getByRole('button', { name: 'Adicionar selecionados (1)', exact: true }).click();
            await expect(dialog).toHaveCount(0);
            const saved = data.block.checklistItems.find(item => item.text === 'Computador');
            assert.equal(saved.quantity, 2);
            assert.deepEqual(saved.components, [{ text: 'SSD 1TB', quantity: 1 },{ text: 'RAM 32GB', quantity: 4 },{ text: 'GPU antiga', quantity: 3 },{ text: 'Fonte 850W', quantity: 5 }]);
            const savedParts = page.getByRole('group', { name: 'Componentes de Computador', exact: true });
            await expect(savedParts.getByRole('spinbutton', { name: 'Quantidade de RAM 32GB em Computador', exact: true })).toHaveValue('4');
            await savedParts.getByRole('spinbutton', { name: 'Quantidade de Fonte 850W em Computador', exact: true }).fill('8');
            await page.getByRole('button', { name: 'Salvar componentes', exact: true }).click();
            await expect.poll(() => data.block.checklistItems.find(item => item.text === 'Computador').components.find(part => part.text === 'Fonte 850W').quantity).toBe(8);
            const [print] = await Promise.all([page.waitForEvent('popup'),page.getByRole('button', { name: 'Exportar PDF', exact: true }).click()]);
            await expect(print.locator('body')).toContainText('Fonte 850W — Qtd.: 8'); await print.close();
            assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
    await run('Checklist UI components: computer selection and part quantities fit on mobile', async () => {
        const data = await setup({ computer: true, viewport: { width: 375, height: 812 } });
        try {
            await open(data.page);
            const dialog = data.page.getByRole('dialog');
            await dialog.getByRole('checkbox', { name: 'Computador', exact: true }).check();
            await dialog.getByRole('spinbutton', { name: 'Quantidade de RAM 32GB em Computador', exact: true }).fill('6');
            assert(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
            await dialog.getByRole('button', { name: 'Adicionar selecionados (1)', exact: true }).scrollIntoViewIfNeeded();
            await data.page.screenshot({ path: path.join(shots, 'followup-computer-components-mobile.png') });
            await dialog.getByRole('button', { name: 'Adicionar selecionados (1)', exact: true }).click();
            await expect(dialog).toHaveCount(0);
            assert.equal(data.block.checklistItems.find(item => item.text === 'Computador').components.find(part => part.text === 'RAM 32GB').quantity, 6);
            assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
    await run('Projector support UI: selecting the kit loads parts and saves each chosen quantity', async () => {
        const data = await setup({ projectorSupport: true });
        try {
            await open(data.page);
            const dialog = data.page.getByRole('dialog');
            await dialog.getByRole('textbox', { name: 'Buscar no catálogo', exact: true }).fill('Suporte');
            await dialog.getByRole('checkbox', { name: 'Suporte de projetor', exact: true }).check();
            const parts = dialog.getByRole('group', { name: 'Componentes de Suporte de projetor', exact: true });
            await expect(parts.getByRole('spinbutton', { name: 'Quantidade de Bases para teto em Suporte de projetor', exact: true })).toHaveValue('3');
            await parts.getByRole('spinbutton', { name: 'Quantidade de Bases para teto em Suporte de projetor', exact: true }).fill('4');
            await parts.getByRole('spinbutton', { name: 'Quantidade de Parafusos para fixação em Suporte de projetor', exact: true }).fill('12');
            await parts.getByRole('checkbox', { name: 'Incluir Cálices em Suporte de projetor', exact: true }).uncheck();
            await dialog.getByRole('button', { name: 'Adicionar selecionados (1)', exact: true }).click();
            await expect(dialog).toHaveCount(0);
            const saved = data.block.checklistItems.find(item => item.text === 'Suporte de projetor');
            assert.deepEqual(saved.components, [{ text: 'Bases para teto', quantity: 4 },{ text: 'Bases para projetor', quantity: 3 },{ text: 'Parafusos para fixação', quantity: 12 }]);
            assert.deepEqual(data.errors, []);
        } finally { await data.context.close(); }
    });
};
