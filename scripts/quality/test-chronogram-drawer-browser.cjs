const assert = require('node:assert/strict');
const path = require('node:path');
module.exports = async ({ run, setup, tab, panel, row, writes, expect, shots }) => {
    const host = page => page.locator('[data-planning-overlay]');
    async function anchored(page, mobile = false) {
        await expect(host(page)).toHaveAttribute('data-planning-overlay', 'open');
        const box = await page.getByRole('dialog').boundingBox(), viewport = page.viewportSize();
        assert(Math.abs(box.x + box.width - viewport.width) < 2, 'Drawer must stay at the right edge');
        assert(Math.abs(box.y) < 2 && Math.abs(box.height - viewport.height) < 2, 'Drawer must fill the viewport height');
        assert(mobile ? Math.abs(box.width - viewport.width) < 2 : box.width <= 600 && box.x > viewport.width / 2, 'Keep the main screen visible on desktop');
        return box;
    }
    await run('Drawer: right-side motion preserves filters, page position, keyboard focus and the visible main workspace', async () => {
        const s = await setup({ readonly: true }); try {
            await s.page.getByLabel('Buscar no cronograma', { exact: true }).fill('agendado QA');
            await expect(panel(s.page).locator('[data-chronogram-record]')).toHaveCount(1);
            const card = row(s.page, s.records[1].id); await expect(card).toHaveCount(1); await card.scrollIntoViewIfNeeded();
            const before = await card.boundingBox(), url = s.page.url(), scroll = await s.page.evaluate(() => window.scrollY);
            await card.click(); await anchored(s.page);
            assert.notEqual(await s.page.locator('[data-slot="dialog-backdrop"]').evaluate(element => getComputedStyle(element).backdropFilter), 'none');
            const behind = await card.boundingBox(); assert(Math.abs(behind.y - before.y) < 2 && Math.abs(behind.width - before.width) < 2, 'Opening must not move the main content: ' + JSON.stringify({ before, behind }));
            assert.equal(s.page.url(), url); assert.equal(await s.page.evaluate(() => window.scrollY), scroll);
            await s.page.screenshot({ path: path.join(shots, 'chronogram-drawer-desktop.png'), fullPage: false, animations: 'disabled' });
            await s.page.keyboard.press('Escape'); await expect(host(s.page)).toHaveAttribute('data-planning-overlay', 'closing');
            await expect(s.page.getByRole('dialog')).toHaveCount(0); await expect(card).toBeFocused();
            assert.equal(s.page.url(), url); assert.equal(await s.page.evaluate(() => window.scrollY), scroll); assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Drawer: project editing stays in the same lateral surface and backdrop dismissal returns to the current calendar', async () => {
        const s = await setup(); try {
            await row(s.page, s.records[1].id).click(); await anchored(s.page); const surface = await host(s.page).elementHandle();
            await s.page.getByRole('button', { name: 'Editar projeto', exact: true }).click();
            await expect(s.page.getByLabel('Nome do projeto', { exact: true })).toBeVisible(); await anchored(s.page);
            assert(await surface.evaluate(element => element === document.querySelector('[data-planning-overlay]')), 'Editing must keep the lateral surface mounted');
            await s.page.locator('[data-slot="dialog-backdrop"]').click({ position: { x: 8, y: 8 } }); await expect(host(s.page)).toHaveCount(0);
            await tab(s.page, 'Calendário').click();
            await panel(s.page).locator(`[data-calendar-record="project:${s.records[1].id}"]`).first().click(); await anchored(s.page);
            await s.page.locator('[data-slot="dialog-backdrop"]').click({ position: { x: 8, y: 8 } }); await expect(host(s.page)).toHaveCount(0);
            await expect(tab(s.page, 'Calendário')).toHaveAttribute('aria-selected', 'true'); assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Drawer: mobile uses the full screen, keeps close accessible above scrolling forms and honors reduced motion', async () => {
        const s = await setup({ legacyEditing: true, mobile: true, reducedMotion: true }); try {
            await expect(s.page.getByText('105 registros do ZIP', { exact: false })).toBeVisible();
            await s.page.getByText('Histórico legado sem data informada', { exact: true }).click();
            await s.page.getByRole('button', { name: 'Histórico legado QA 0 · Goiânia', exact: true }).click(); await anchored(s.page, true);
            assert.equal(await s.page.getByRole('dialog').evaluate(element => getComputedStyle(element).animationName), 'none');
            await s.page.getByRole('button', { name: 'Editar dados', exact: true }).click();
            const body = s.page.locator('[data-slot="dialog-body"]'); await body.evaluate(element => { element.scrollTop = element.scrollHeight; });
            await expect(s.page.getByRole('button', { name: 'Fechar', exact: true })).toBeInViewport();
            const save = s.page.getByRole('button', { name: 'Salvar dados', exact: true }); await save.hover();
            const contrast = await save.evaluate(element => {
                const luminance = color => { const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }); return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722; };
                const style = getComputedStyle(element), foreground = luminance(style.color), background = luminance(style.backgroundColor);
                return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
            }); assert(contrast >= 4.5, 'The primary action must stay readable on hover');
            await s.page.screenshot({ path: path.join(shots, 'chronogram-drawer-mobile.png'), fullPage: false, animations: 'disabled' });
            await s.page.getByRole('button', { name: 'Cancelar edição', exact: true }).click();
            assert.equal(await body.evaluate(element => element.scrollTop), 0);
            await s.page.getByRole('button', { name: 'Fechar', exact: true }).click(); await expect(host(s.page)).toHaveCount(0); assert.deepEqual(writes(s), []); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('Drawer: light mode keeps readable controls and blocks backdrop dismissal during an active save', async () => {
        const s = await setup({ legacyEditing: true }); try {
            await expect(s.page.getByText('105 registros do ZIP', { exact: false })).toBeVisible();
            await s.page.getByRole('button', { name: 'Usar tema claro no cronograma', exact: true }).click();
            await s.page.getByText('Histórico legado sem data informada', { exact: true }).click(); await s.page.getByRole('button', { name: 'Histórico legado QA 0 · Goiânia', exact: true }).click(); await anchored(s.page);
            await s.page.getByRole('button', { name: 'Editar dados', exact: true }).click();
            const form = s.page.getByRole('form', { name: 'Editar dados do registro importado' });
            await form.getByLabel('Cliente', { exact: true }).fill('Edição lateral QA');
            const colors = await form.getByLabel('Cliente', { exact: true }).evaluate(element => ({ foreground: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }));
            assert.notEqual(colors.foreground, colors.background);
            await s.page.screenshot({ path: path.join(shots, 'chronogram-drawer-light.png'), fullPage: false, animations: 'disabled' });
            s.state.saveDelayMs = 800; await form.getByRole('button', { name: 'Salvar dados', exact: true }).click();
            await expect(form.getByRole('button', { name: 'Salvando…', exact: true })).toBeDisabled();
            await s.page.locator('[data-slot="dialog-backdrop"]').click({ position: { x: 8, y: 8 } }); await expect(host(s.page)).toHaveAttribute('data-planning-overlay', 'open');
            await expect(form).toHaveCount(0); await expect(s.page.getByRole('dialog')).toContainText('Edição lateral QA'); assert.deepEqual(s.errors, []);
            await s.page.keyboard.press('Escape'); await expect(host(s.page)).toHaveCount(0);
            await row(s.page, s.records[1].id).click(); await s.page.getByRole('button', { name: 'Editar projeto', exact: true }).click();
            await expect(s.page.getByLabel('Nome do projeto', { exact: true })).toBeVisible();
            const foreground = await s.page.getByRole('dialog').locator('[data-slot="dialog-footer"]').getByRole('button', { name: 'Fechar', exact: true }).evaluate(element => getComputedStyle(element).color);
            const rgb = foreground.match(/[\d.]+/g).slice(0, 3).map(Number); assert(Math.min(...rgb) < 150, 'Secondary controls must remain legible in the light drawer');
            await s.page.screenshot({ path: path.join(shots, 'chronogram-drawer-light-project.png'), fullPage: false, animations: 'disabled' });
        } finally { await s.context.close(); }
    });
};
