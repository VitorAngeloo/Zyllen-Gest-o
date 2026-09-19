const assert = require('node:assert/strict');
const path = require('node:path');
module.exports = async ({ run, contextFor, base, admin, shots, inventory, companyName }) => {
    assert.match(base, /^http:\/\/127\.0\.0\.1:/);
    await run('Features browser: stock sections, asset/movement details and form state work after extraction', async () => {
        const context = await contextFor(admin); const page = await context.newPage(); const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        try {
            await page.goto(base + '/dashboard/estoque');
            const search = page.getByPlaceholder('Buscar item por nome, código ou local...'); await search.fill(inventory.sku.skuCode);
            await page.getByText(inventory.sku.name, { exact: true }).first().click();
            await page.locator('[data-slot="dialog-content"]').getByText(inventory.asset.assetCode, { exact: true }).waitFor();
            await page.getByRole('button', { name: 'Fechar', exact: true }).click();
            await page.getByRole('button', { name: 'Entrada', exact: true }).click();
            await page.getByPlaceholder('Compra, reposição...').fill('Estado preservado QA');
            await page.getByPlaceholder('••••', { exact: true }).fill('1234');
            await page.getByRole('button', { name: 'Saída', exact: true }).click();
            await page.getByPlaceholder('Detalhes adicionais...').waitFor();
            await page.getByRole('button', { name: 'Entrada', exact: true }).click();
            assert.equal(await page.getByPlaceholder('Compra, reposição...').inputValue(), 'Estado preservado QA');
            assert.equal(await page.getByPlaceholder('••••', { exact: true }).inputValue(), '1234');
            await page.getByRole('button', { name: 'Bipagem Rápida', exact: true }).click();
            await page.getByPlaceholder('Bipe a etiqueta ou digite o código...').waitFor();
            await page.getByRole('button', { name: 'Saída em Lote', exact: true }).click();
            await page.getByPlaceholder('Bipe a etiqueta ou digite código/nome...').waitFor();
            await page.getByRole('button', { name: 'Relatórios', exact: true }).click();
            await page.getByText(inventory.location.name, { exact: true }).first().waitFor();
            await page.getByRole('button', { name: 'Histórico', exact: true }).click();
            await page.getByPlaceholder('Buscar por código, item, patrimônio, responsável, motivo ou local...').fill('Movimento QA arquitetura');
            await page.getByText('Movimento QA arquitetura', { exact: true }).click();
            await page.locator('[data-slot="dialog-content"]').waitFor();
            await page.getByRole('button', { name: 'Fechar', exact: true }).click();
            await page.setViewportSize({ width: 390, height: 844 });
            await page.screenshot({ path: path.join(shots, 'architecture-stock-mobile.png'), fullPage: true });
            assert.deepEqual(errors, []);
        } finally { await context.close(); }
    });
    await run('Features browser: schedule list, calendar, installer cards and creation dialog resolve', async () => {
        const context = await contextFor(admin); const page = await context.newPage(); const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        try {
            await page.goto(base + '/dashboard/agenda');
            await page.getByRole('heading', { name: 'Agenda Operacional', exact: true }).waitFor();
            await page.getByRole('button', { name: 'Instaladores', exact: true }).click();
            await page.getByPlaceholder('Buscar técnico…').waitFor();
            await page.getByRole('button', { name: 'Calendário', exact: true }).click();
            await page.locator('.fc').waitFor();
            await page.getByRole('button', { name: '+ Novo Agendamento', exact: true }).click();
            await page.locator('[data-slot="dialog-content"]').getByPlaceholder('Ex: Instalação sala interativa').fill('Agendamento QA');
            await page.getByRole('button', { name: 'Fechar', exact: true }).click();
            await page.getByRole('button', { name: 'Lista', exact: true }).first().click();
            await page.getByPlaceholder('Buscar agendamento…').waitFor();
            assert.deepEqual(errors, []);
        } finally { await context.close(); }
    });
    await run('Features browser: followup detail, media block and separate creation form resolve', async () => {
        const context = await contextFor(admin); const page = await context.newPage(); const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        try {
            await page.goto(base + '/dashboard/acompanhamento');
            await page.getByText(companyName, { exact: true }).first().click();
            const back = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') }).first();
            await back.waitFor();
            await back.click();
            await page.getByRole('button', { name: 'Novo Acompanhamento', exact: true }).click();
            await page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') }).first().waitFor();
            assert.deepEqual(errors, []);
        } finally { await context.close(); }
    });
};
