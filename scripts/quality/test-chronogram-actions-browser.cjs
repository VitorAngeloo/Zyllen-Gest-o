const assert = require('node:assert/strict');
module.exports = async ({ run, setup, row, writes, expect }) => {
    await run('Project actions UI: quick stage and observations preserve forecast and execution; cancellation records reason and history', async () => {
        const s = await setup({ planning: true, actions: true, collaboration: true }); try {
            const record = s.records[1]; await row(s.page, record.id).click();
            await s.page.getByRole('button', { name: 'Alterar etapa', exact: true }).click(); await s.page.getByLabel('Nova etapa', { exact: true }).selectOption('pausado');
            await s.page.getByRole('button', { name: 'Salvar alteração', exact: true }).click(); await expect(s.page.getByRole('button', { name: 'Fechar card', exact: true })).toBeEnabled();
            assert.equal(record.planning.stage, 'pausado'); assert.equal(record.status, 'SCHEDULED'); assert(record.planning.forecast.endsWith('-01'));
            await s.page.getByRole('button', { name: 'Editar observações', exact: true }).click(); await s.page.getByLabel('Observações do projeto', { exact: true }).fill('Orientação revisada QA');
            await s.page.getByRole('button', { name: 'Salvar alteração', exact: true }).click(); await expect(s.page.getByRole('button', { name: 'Fechar card', exact: true })).toBeEnabled();
            await expect(s.page.getByRole('dialog')).toContainText('Orientação revisada QA');
            await s.page.getByRole('button', { name: 'Cancelar projeto', exact: true }).click(); await s.page.getByLabel('Justificativa do cancelamento', { exact: true }).fill('Cliente adiou a implantação QA');
            await s.page.getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click(); await expect(s.page.getByRole('button', { name: 'Fechar card', exact: true })).toBeEnabled();
            assert.equal(record.status, 'CANCELLED'); assert.equal(record.pending.length, 1); assert.equal(record.annotations.length, 1);
            await s.page.getByRole('button', { name: 'Histórico do projeto', exact: true }).click(); await expect(s.page.getByLabel('Histórico do projeto', { exact: true })).toContainText('Cliente adiou a implantação QA');
            assert.equal(writes(s).length, 3); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Project actions UI: failed cancellation retains justification and blocks dismissal while saving; read-only has only history', async () => {
        const s = await setup({ actions: true, failSave: true }); try {
            await row(s.page, s.records[1].id).click(); await s.page.getByRole('button', { name: 'Cancelar projeto', exact: true }).click(); await s.page.getByLabel('Justificativa do cancelamento', { exact: true }).fill('Guardar justificativa QA');
            await s.page.getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click(); await expect(s.page.getByRole('dialog').getByRole('alert')).toContainText('Falha sintética ao salvar'); await expect(s.page.getByLabel('Justificativa do cancelamento', { exact: true })).toHaveValue('Guardar justificativa QA');
            assert.equal(s.records[1].status, 'SCHEDULED'); s.state.failSave = false; s.state.saveDelayMs = 700;
            await s.page.getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click(); await expect(s.page.getByRole('button', { name: 'Fechar card', exact: true })).toBeDisabled(); await s.page.keyboard.press('Escape'); await expect(s.page.getByRole('dialog')).toHaveCount(1);
            await expect(s.page.getByRole('button', { name: 'Fechar card', exact: true })).toBeEnabled(); assert.equal(s.records[1].status, 'CANCELLED'); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
        const reader = await setup({ actions: true, readonly: true }); try {
            await row(reader.page, reader.records[1].id).click(); for (const name of ['Alterar etapa', 'Editar observações', 'Cancelar projeto', 'Reagendar projeto']) await expect(reader.page.getByRole('button', { name, exact: true })).toHaveCount(0);
            await reader.page.getByRole('button', { name: 'Histórico do projeto', exact: true }).click(); await expect(reader.page.getByLabel('Histórico do projeto', { exact: true })).toContainText('Nenhuma alteração'); assert.deepEqual(writes(reader), []);
        } finally { await reader.context.close(); }
    });
};
