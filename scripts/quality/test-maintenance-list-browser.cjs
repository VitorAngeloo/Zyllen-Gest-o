const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));

module.exports = async ({ run, browser, base, fixedNow }) => {
    const previewAttachments = Array.from({ length: 6 }, (_, index) => ({
        id: `att-${index + 1}`,
        fileName: `registro-instalacao-${index + 1}.mp4`,
        mimeType: 'video/mp4',
    }));
    const orders = Array.from({ length: 115 }, (_, index) => ({
        id: `os-${index}`, osNumber: `OS-QA-${String(index).padStart(4, '0')}`,
        status: index === 40 ? 'IN_PROGRESS' : 'OPEN', formType: 'INSTALACAO_SALA',
        clientName: index === 40 ? 'Santa Ines QA' : `Cliente QA ${index}`,
        clientCity: index === 40 ? 'São Paulo' : null, clientState: index === 40 ? 'SP' : null,
        location: index === 40 ? 'Avenida Integra, 240 · Vila Zyllen · São Paulo' : null,
        contactName: index === 40 ? 'Responsável QA' : null, contactPhone: index === 40 ? '(11) 90000-0040' : null,
        startedAt: index === 40 ? new Date(fixedNow - 2 * 86400000).toISOString() : null,
        endedAt: index === 40 ? new Date(fixedNow - 60000).toISOString() : null,
        createdAt: new Date(fixedNow - index * 60_000).toISOString(),
        updatedAt: new Date(fixedNow - index * 60_000).toISOString(),
        openedById: index === 0 ? 'user-qa' : 'another-user-qa', openedByContractorId: null,
        openedBy: { name: 'Colaborador QA' }, openedByContractor: null, asset: null, project: null,
        formData: index === 40 ? {
            roomModel: 'Retangular', screenDimensions: '366 × 280 cm', hasOutlets: 'Sim', internetType: 'Cabeada',
            easyAccess: 'Sim', safeLocation: 'Sim', displayType: 'Projetor', displayModel: 'Optoma',
            computerConfig: 'CPU montado na Skyline', soundEquipment: 'Receiver Demon, 3 arandelas e 1 subwoofer JBL',
            tabletTotem: 'Tablet Samsung S6', cameraInstalled: 'Sim', anydeskAlias: '151 967 7703',
            logbook: 'Instalação concluída, automação validada e apresentação configurada.',
            witnessName: 'Acompanhante QA', witnessDocument: 'REGISTRO-QA-0040',
        } : {},
    }));

    async function setup(role, route) {
        const requests = [], errors = [];
        const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
        await context.addInitScript(() => {
            localStorage.setItem('accessToken', 'synthetic-os-qa');
            localStorage.setItem('userType', 'internal');
            window.print = () => { window.__zyllenPrintRequested = true; };
        });
        await context.route('**/*', async interception => {
            const request = interception.request(), url = new URL(request.url());
            if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !['data:', 'blob:'].includes(url.protocol)) return interception.abort();
            if (url.port !== '3999') return interception.continue();
            let body;
            try { body = request.postData() ? JSON.parse(request.postData()) : undefined; } catch { body = request.postData(); }
            requests.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), method: request.method(), body });
            const respond = payload => interception.fulfill({ status: 200, contentType: 'application/json', headers: {
                'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
            }, body: JSON.stringify(payload) });
            if (request.method() === 'OPTIONS') return respond({});
            if (url.pathname === '/auth/me') return respond({ data: { id: 'user-qa', name: 'Usuário QA', email: 'qa@example.test', type: 'internal', role: { id: 'role-qa', name: role } } });
            if (url.pathname === '/auth/me/permissions') return respond({ data: ['dashboard.view', 'maintenance.view'] });
            if (url.pathname === '/tickets/my-internal/pending-rating') return respond({ data: null });
            if (url.pathname === '/maintenance' || url.pathname === '/maintenance/my-orders') {
                let filtered = orders.filter(os => url.pathname !== '/maintenance/my-orders' || os.openedById === 'user-qa');
                const origin = url.searchParams.get('origin'), status = url.searchParams.get('status'), search = url.searchParams.get('search')?.toLowerCase();
                if (origin === 'INTERNAL') filtered = filtered.filter(os => os.openedById && !os.openedByContractorId);
                if (origin === 'CONTRACTOR') filtered = filtered.filter(os => os.openedByContractorId);
                if (status) filtered = filtered.filter(os => os.status === status);
                if (search) filtered = filtered.filter(os => `${os.osNumber} ${os.clientName}`.toLowerCase().includes(search));
                const page = Number(url.searchParams.get('page') || 1), limit = Number(url.searchParams.get('limit') || 20);
                return respond({ data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit });
            }
            if (url.pathname === '/maintenance/os-40/attachments') return respond({ data: previewAttachments });
            if (/^\/maintenance\/os-\d+\/attachments$/.test(url.pathname)) return respond({ data: [] });
            if (/^\/maintenance\/os-\d+\/followup-blocks$/.test(url.pathname)) return respond({ data: [] });
            if (request.method() === 'PUT' && /^\/maintenance\/os-\d+\/form-data$/.test(url.pathname)) {
                const id = url.pathname.split('/')[2];
                const original = orders.find(order => order.id === id);
                return respond({ data: { ...original, ...body, updatedAt: new Date(fixedNow + 1000).toISOString() } });
            }
            return respond({ data: [] });
        });
        const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + route);
        return { context, page, requests, errors };
    }

    await run('Gestor without access.manage sees every OS, including older Santa Ines, with search and later pages', async () => {
        const s = await setup('Gestor', '/dashboard/minhas-os');
        try {
            await expect(s.page.getByRole('button', { name: 'Todas as OS' })).toHaveAttribute('aria-pressed', 'true');
            await expect(s.page.getByText('Santa Ines QA')).toBeVisible();
            await expect(s.page.getByRole('navigation', { name: 'Páginas de ordens de serviço' })).toContainText('115 OS');
            assert(s.requests.some(r => r.path === '/maintenance' && r.query.limit === '50'));
            const pagination = s.page.getByRole('navigation', { name: 'Páginas de ordens de serviço' });
            await pagination.getByRole('button', { name: 'Próxima' }).click();
            await pagination.getByRole('button', { name: 'Próxima' }).click();
            await expect(s.page.getByRole('button', { name: 'Abrir detalhes da OS OS-QA-0114' })).toBeVisible();
            await s.page.getByRole('textbox', { name: 'Buscar OS por número, cliente ou projeto' }).fill('Santa Ines');
            await s.page.getByRole('button', { name: 'Buscar' }).click();
            await expect(s.page.getByText('Santa Ines QA')).toBeVisible();
            await expect(s.page.getByText('OS-QA-0114')).toHaveCount(0);
            assert(s.requests.some(r => r.path === '/maintenance' && r.query.search === 'Santa Ines' && r.query.page === '1'));
            assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });

    await run('Administrador sees all OS and technician remains in their own OS scope', async () => {
        const admin = await setup('Administrador', '/dashboard/minhas-os');
        try {
            await expect(admin.page.getByText('Santa Ines QA')).toBeVisible();
        } finally { await admin.context.close(); }
        const tech = await setup('Técnico', '/dashboard/minhas-os');
        try {
            await expect(tech.page.getByRole('button', { name: 'Todas as OS' })).toHaveCount(0);
            await expect(tech.page.getByText('Cliente QA 0')).toBeVisible();
            await expect(tech.page.getByText('Santa Ines QA')).toHaveCount(0);
            assert(tech.requests.some(r => r.path === '/maintenance/my-orders'));
            assert(!tech.requests.some(r => r.path === '/maintenance'));
        } finally { await tech.context.close(); }
    });

    await run('OS opening page reaches older records instead of stopping at the first page', async () => {
        const s = await setup('Gestor', '/dashboard/manutencao');
        try {
            await expect(s.page.getByText('Santa Ines QA')).toBeVisible();
            const pagination = s.page.getByRole('navigation', { name: 'Páginas de ordens de serviço' });
            await pagination.getByRole('button', { name: 'Próxima' }).click();
            await pagination.getByRole('button', { name: 'Próxima' }).click();
            await expect(s.page.getByText('OS-QA-0114')).toBeVisible();
            assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });

    await run('OS PDF uses the official Zyllen identity and keeps the operational content readable', async () => {
        const s = await setup('Gestor', '/dashboard/minhas-os');
        try {
            await s.page.getByRole('button', { name: 'Abrir detalhes da OS OS-QA-0040' }).click();
            await expect(s.page.getByRole('button', { name: 'Gerar PDF' })).toBeVisible();
            await expect(s.page.locator('video[controls]')).toHaveCount(6);
            const popupPromise = s.page.waitForEvent('popup');
            await s.page.getByRole('button', { name: 'Gerar PDF' }).click();
            const pdfPage = await popupPromise;
            await expect(pdfPage.locator('.document')).toBeVisible();
            await expect(pdfPage.locator('.brand-lockup img')).toHaveAttribute('src', /^data:image\/svg\+xml;base64,/);
            await expect.poll(() => pdfPage.locator('.brand-lockup img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
            await expect(pdfPage.locator('.document-header')).toContainText('OS-QA-0040');
            await expect(pdfPage.locator('.summary-strip')).toContainText('Santa Ines QA');
            await expect(pdfPage.locator('.detail-list')).toContainText('CPU montado na Skyline');
            await expect(pdfPage.locator('.attachment-item')).toHaveCount(6);
            await expect(pdfPage.locator('.attachment-placeholder')).toHaveCount(6);
            await expect(pdfPage.locator('.brand-watermark')).toHaveCount(1);
            await expect(pdfPage.locator('.brand-watermark .watermark-ink path')).toHaveCount(2);
            await expect(pdfPage.locator('.brand-watermark .watermark-accent path')).toHaveCount(2);
            await expect(pdfPage.locator('.brand-spine')).toHaveCount(1);

            const output = process.env.AUDIT_OS_PDF_OUTPUT;
            if (output) {
                fs.mkdirSync(path.dirname(output), { recursive: true });
                await pdfPage.pdf({ path: output, format: 'A4', printBackground: true, preferCSSPageSize: true });
            }

            assert.deepEqual(s.errors, []);
            await pdfPage.close();
        } finally { await s.context.close(); }
    });

    await run('OS signature stays collapsed until requested and only confirmed ink is saved', async () => {
        const s = await setup('Gestor', '/dashboard/minhas-os');
        try {
            await s.page.getByRole('button', { name: 'Abrir detalhes da OS OS-QA-0040' }).click();
            await s.page.getByRole('button', { name: 'Editar' }).click();
            const signatureButton = s.page.getByRole('button', { name: /Clique para assinar/ });
            await expect(signatureButton).toBeVisible();
            await expect(s.page.locator('canvas')).toHaveCount(0);
            await signatureButton.click();

            const canvas = s.page.locator('canvas').last();
            await expect(canvas).toBeVisible();
            await canvas.scrollIntoViewIfNeeded();
            const box = await canvas.boundingBox();
            assert(box);
            await s.page.mouse.move(box.x + 35, box.y + box.height * 0.65);
            await s.page.mouse.down();
            await s.page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3, { steps: 8 });
            await s.page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.7, { steps: 8 });
            await s.page.mouse.up();

            await s.page.getByRole('button', { name: 'Salvar Rascunho' }).click();
            await expect(s.page.getByText('Confirme ou cancele a assinatura que está aberta antes de salvar a OS.')).toBeVisible();
            assert(!s.requests.some(request => request.method === 'PUT' && request.path === '/maintenance/os-40/form-data'));

            await s.page.getByRole('button', { name: 'Confirmar assinatura' }).click();
            await expect(s.page.getByText('Assinatura confirmada')).toBeVisible();
            await s.page.getByRole('button', { name: 'Salvar Rascunho' }).click();
            await expect(s.page.getByText('Rascunho salvo')).toBeVisible();

            const update = s.requests.find(request => request.method === 'PUT' && request.path === '/maintenance/os-40/form-data');
            assert(update);
            assert.equal(update.body.expectedUpdatedAt, orders[40].updatedAt);
            assert.match(update.body.formData.witnessSignature, /^data:image\/png;base64,/);
            assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
};
