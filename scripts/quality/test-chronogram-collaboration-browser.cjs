const assert = require('node:assert/strict');
const path = require('node:path');
module.exports = async ({ run, setup, tab, panel, row, writes, expect, shots }) => {
    await run('Collaboration UI: multiple actions, edit, resolve and notes update the same project and summary', async () => {
        const s = await setup({ collaboration: true }); try {
            await row(s.page, s.records[1].id).click();
            await s.page.getByRole('button', { name: 'Adicionar ação pendente', exact: true }).click();
            await s.page.getByLabel('Tipo de pendência', { exact: true }).selectOption('Aguardando contrato');
            await s.page.getByLabel('Responsável pela pendência', { exact: true }).fill('Responsável novo QA');
            await s.page.getByLabel('Prazo da pendência', { exact: true }).fill('2028-02-29');
            await s.page.getByLabel('Detalhes da pendência', { exact: true }).fill('Conferir documentação QA');
            await s.page.getByRole('button', { name: 'Salvar pendência', exact: true }).click();
            await expect(s.page.getByRole('dialog').locator('[data-pending-id]')).toHaveCount(2);
            const item = s.page.locator(`[data-pending-id="${s.records[1].pending.at(-1).id}"]`);
            await item.getByRole('button', { name: 'Editar pendência', exact: true }).click();
            await s.page.getByLabel('Detalhes da pendência', { exact: true }).fill('Conferência revisada QA');
            await s.page.getByRole('button', { name: 'Salvar pendência', exact: true }).click(); await expect(item).toContainText('Conferência revisada QA');
            await item.getByRole('button', { name: 'Resolver pendência', exact: true }).click(); await expect(s.page.getByRole('dialog').locator('[data-pending-id]')).toHaveCount(1);
            await s.page.getByText('Ações resolvidas', { exact: true }).click(); await expect(s.page.getByRole('dialog')).toContainText('Resolvida em');
            await s.page.getByLabel('Texto da anotação', { exact: true }).fill('Novo combinado QA'); await s.page.getByRole('button', { name: 'Adicionar anotação', exact: true }).click();
            await expect(s.page.getByRole('dialog')).toContainText('Novo combinado QA'); await expect(s.page.getByRole('dialog')).toContainText('Organizador QA');
            await expect(s.page.getByRole('button', { name: 'Fechar card', exact: true })).toBeEnabled();
            await s.page.keyboard.press('Escape'); await tab(s.page, 'Pendências').click(); await expect(panel(s.page)).toContainText('Aguardando kickoff');
            assert.equal(writes(s).length, 4); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Collaboration UI: failed saves preserve draft and nonce; in-flight submissions cannot close the card', async () => {
        const s = await setup({ collaboration: true, failSave: true }); try {
            await row(s.page, s.records[1].id).click(); await s.page.getByLabel('Texto da anotação', { exact: true }).fill('Não perder este combinado QA');
            await s.page.getByRole('button', { name: 'Adicionar anotação', exact: true }).click(); await expect(s.page.getByRole('dialog').getByRole('alert')).toContainText('Falha sintética ao salvar');
            await expect(s.page.getByLabel('Texto da anotação', { exact: true })).toHaveValue('Não perder este combinado QA');
            const id = writes(s).at(-1).body.id; s.state.failSave = false; s.state.saveDelayMs = 1000;
            await s.page.getByRole('button', { name: 'Adicionar anotação', exact: true }).click(); await expect(s.page.getByLabel('Texto da anotação', { exact: true })).toBeDisabled();
            await s.page.keyboard.press('Escape'); await expect(s.page.getByRole('dialog')).toHaveCount(1);
            await expect(s.page.getByLabel('Texto da anotação', { exact: true })).toHaveValue(''); await expect(s.page.getByLabel('Texto da anotação', { exact: true })).toBeEnabled();
            assert.equal(writes(s).at(-1).body.id, id); assert.equal(s.records[1].annotations.length, 2); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Collaboration UI: stale edit reports conflict, preserves draft and never overwrites the latest action', async () => {
        const s = await setup({ collaboration: true }); try {
            await row(s.page, s.records[1].id).click(); await s.page.getByRole('button', { name: 'Editar pendência', exact: true }).click();
            await s.page.getByLabel('Detalhes da pendência', { exact: true }).fill('Edição antiga QA');
            s.records[1].pending[0].version++; s.records[1].pending[0].detail = 'Conferência feita por outra pessoa QA';
            await s.page.getByRole('button', { name: 'Salvar pendência', exact: true }).click();
            await expect(s.page.getByRole('dialog').getByRole('alert')).toContainText('A pendência mudou');
            await expect(s.page.getByLabel('Detalhes da pendência', { exact: true })).toHaveValue('Edição antiga QA');
            assert.equal(s.records[1].pending[0].detail, 'Conferência feita por outra pessoa QA'); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Collaboration UI: read-only users see authors/history without write controls; mobile forms fit the dialog', async () => {
        const reader = await setup({ collaboration: true, readonly: true }); try {
            await row(reader.page, reader.records[1].id).click(); await expect(reader.page.getByRole('dialog')).toContainText('Primeira anotação QA');
            await expect(reader.page.getByRole('button', { name: 'Adicionar ação pendente', exact: true })).toHaveCount(0);
            await expect(reader.page.getByRole('button', { name: 'Resolver pendência', exact: true })).toHaveCount(0); assert.deepEqual(writes(reader), []);
        } finally { await reader.context.close(); }
        const s = await setup({ collaboration: true, mobile: true }); try {
            await row(s.page, s.records[1].id).click(); await s.page.getByRole('button', { name: 'Adicionar ação pendente', exact: true }).click();
            await s.page.getByLabel('Tipo de pendência', { exact: true }).selectOption('Aguardando equipamento ou logística');
            await s.page.getByLabel('Detalhes da pendência', { exact: true }).fill('Detalhe da ação no celular QA');
            await s.page.getByLabel('Detalhes da pendência', { exact: true }).scrollIntoViewIfNeeded();
            assert(await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            await s.page.screenshot({ path: path.join(shots, 'chronogram-collaboration-mobile.png'), fullPage: true, animations: 'disabled' });
            assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
};
