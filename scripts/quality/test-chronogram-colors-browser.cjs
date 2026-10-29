const assert = require('node:assert/strict');
const path = require('node:path');
module.exports = async ({ run, setup, tab, panel, writes, expect, shots }) => {
    await run('Calendar colors: related projects share accents, distinct projects vary and colors persist across filters/themes/reload', async () => {
        for (const mobile of [false, true]) {
            const s = await setup({ legacy: true, mobile }); try {
                await expect(s.page.getByText('105 registros do ZIP', { exact: false })).toBeVisible();
                s.legacyRecords.splice(7);
                Object.assign(s.legacyRecords[1], { name: 'Projeto Colorido QA', location: 'Goiânia/GO' });
                Object.assign(s.legacyRecords[2], { name: 'projeto colorido QA', location: 'Goiania/GO', service: 'INSTALLATION' });
                const cycle = { id: 'cycle-qa', structureId: 'structure-qa', installationId: s.records[1].id, structureName: 'Sala QA' };
                s.records[1].structureCycle = cycle; s.records[2].structureCycle = cycle;
                s.extras[0].projectId = s.records[1].projectId;
                await s.page.getByRole('button', { name: 'Atualizar', exact: true }).click();
                await expect(s.page.getByText('7 registros do ZIP', { exact: false })).toBeVisible();
                await tab(s.page, 'Calendário').click();
                const event = id => panel(s.page).locator(`[data-calendar-record="${id}"]`).first();
                const color = id => event(id).evaluate(element => getComputedStyle(element).getPropertyValue('--event-color').trim());
                const day = panel(s.page).locator(`[data-calendar-day="${s.legacyRecords[1].start}"]`);
                await day.getByRole('button', { name: /Ver mais/ }).click();
                const first = 'legacy:' + s.legacyRecords[1].id, related = 'legacy:' + s.legacyRecords[2].id;
                const accent = await color(first); assert.equal(accent, await color(related));
                assert.equal(await color('project:' + s.records[1].id), await color('project:' + s.records[2].id));
                assert.equal(await color('project:' + s.records[1].id), await color('schedule:' + s.extras[0].id));
                const colors = await panel(s.page).locator('[data-calendar-record]').evaluateAll(elements => [...new Set(elements.map(element => getComputedStyle(element).getPropertyValue('--event-color').trim()))]);
                assert(colors.length >= 3, 'Calendar should visibly vary accents'); assert(!colors.includes('#ABFF10'));
                assert.equal(await event(first).evaluate(element => getComputedStyle(element).borderTopStyle), 'dashed');
                await panel(s.page).screenshot({ path: path.join(shots, `calendar-colors-${mobile ? 'mobile' : 'desktop'}-dark.png`) });
                await s.page.getByLabel('Buscar no cronograma', { exact: true }).fill('projeto colorido');
                await expect(panel(s.page).locator('[data-calendar-record]')).toHaveCount(2); assert.equal(await color(first), accent);
                await s.page.getByRole('button', { name: 'Usar tema claro no cronograma' }).click(); assert.equal(await color(first), accent);
                await panel(s.page).screenshot({ path: path.join(shots, `calendar-colors-${mobile ? 'mobile' : 'desktop'}-light.png`) });
                await s.page.reload(); await expect(event(first)).toBeVisible(); assert.equal(await color(first), accent);
                await event(first).click(); await expect(s.page.getByRole('dialog')).toContainText('Projeto Colorido QA');
                assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
            } finally { await s.context.close(); }
        }
    });
};
