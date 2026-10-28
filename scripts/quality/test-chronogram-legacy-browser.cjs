const assert = require('node:assert/strict');
const path = require('node:path');
const core = record => Object.fromEntries(['name', 'location', 'service', 'planning', 'specifications', 'start', 'end', 'original', 'technician', 'notes'].map(key => [key, record[key]]));
module.exports = async ({ run, setup, tab, panel, writes, expect, shots }) => {
    async function open(s) {
        await expect(s.page.getByText('105 registros do ZIP', { exact: false })).toBeVisible();
        await s.page.getByText('Histórico legado sem data informada', { exact: true }).click();
        await s.page.getByRole('button', { name: 'Histórico legado QA 0 · Goiânia', exact: true }).click();
        await expect(s.page.getByRole('dialog')).toContainText('Registro importado do ZIP');
    }
    await run('ZIP editing UI: original form fields persist, source identity survives, and active ZIP projects appear in the board without real execution metrics', async () => {
        const s = await setup({ legacyEditing: true }); try {
            await open(s); await s.page.getByRole('button', { name: 'Editar dados', exact: true }).click();
            const form = s.page.getByRole('form', { name: 'Editar dados do registro importado' });
            await form.getByLabel('Cliente', { exact: true }).fill('Registro importado editado QA'); await form.getByLabel('Cidade/UF', { exact: true }).fill('Brasília/DF');
            await form.getByLabel('Serviço', { exact: true }).selectOption('MAINTENANCE'); await form.getByLabel('Técnico responsável', { exact: true }).fill('Técnico de planejamento QA');
            await form.getByLabel('Início', { exact: true }).fill('2026-10-16'); await form.getByLabel('Fim (se durar mais de um dia)', { exact: true }).fill('2026-10-17');
            await form.getByLabel('Data original (se reagendado)', { exact: true }).fill('2026-10-10'); await form.getByLabel('Etapa do cronograma', { exact: true }).selectOption('predef');
            await form.getByLabel('Mês previsto', { exact: true }).fill('2027-01'); await form.getByLabel('Resolução', { exact: true }).fill('3840x2160');
            await form.getByLabel('Observação', { exact: true }).fill('Observação editada QA'); await form.getByRole('button', { name: 'Salvar dados', exact: true }).click();
            await expect(s.page.getByRole('dialog')).toContainText('Registro importado editado QA'); await expect(form).toHaveCount(0);
            assert.equal(s.legacyRecords[0].planning.forecast, '2027-01'); assert.equal(s.legacyRecords[0].specifications.room.resolution, '3840x2160'); assert.equal(s.legacyRecords[0].sourceId, 'legacy-0');
            await s.page.keyboard.press('Escape'); await tab(s.page, 'Projetos').click();
            await expect(panel(s.page).locator(`[data-chronogram-record="legacy:${s.legacyRecords[0].id}"]`)).toContainText('Registro importado editado QA');
            await expect(s.page.locator('[data-chronogram-metric="installations"] strong')).toHaveText('0');
            await s.page.reload(); await expect(panel(s.page)).toContainText('Registro importado editado QA'); assert.deepEqual(s.errors, []);
            assert(writes(s).every(item => item.path.startsWith('/project-services/legacy/records/')));
        } finally { await s.context.close(); }
    });
    await run('ZIP editing UI: failed and stale saves preserve drafts; in-flight save blocks dismissal and source dates remain editable on mobile', async () => {
        const s = await setup({ legacyEditing: true, mobile: true }); try {
            await open(s); await s.page.getByRole('button', { name: 'Editar dados', exact: true }).click();
            const form = s.page.getByRole('form', { name: 'Editar dados do registro importado' });
            await form.getByLabel('Cliente', { exact: true }).fill('Rascunho preservado QA'); s.state.failSave = true;
            await form.getByRole('button', { name: 'Salvar dados', exact: true }).click(); await expect(form.getByRole('alert')).toContainText('Falha sintética');
            await expect(form.getByLabel('Cliente', { exact: true })).toHaveValue('Rascunho preservado QA'); s.state.failSave = false; s.legacyRecords[0].version++;
            await form.getByRole('button', { name: 'Salvar dados', exact: true }).click(); await expect(form.getByRole('alert')).toContainText('registro mudou');
            await expect(form.getByLabel('Cliente', { exact: true })).toHaveValue('Rascunho preservado QA');
            await form.getByRole('button', { name: 'Cancelar edição', exact: true }).click(); await s.page.getByRole('button', { name: 'Editar dados', exact: true }).click();
            await form.getByLabel('Cliente', { exact: true }).fill('Salvamento acompanhado QA'); s.state.saveDelayMs = 700;
            await form.getByRole('button', { name: 'Salvar dados', exact: true }).click(); await expect(form.getByRole('button', { name: 'Salvando…', exact: true })).toBeDisabled();
            await s.page.keyboard.press('Escape'); await expect(s.page.getByRole('dialog')).toBeVisible();
            await expect(form).toHaveCount(0); await s.page.getByRole('button', { name: 'Editar dados', exact: true }).click();
            await expect(form.getByLabel('Cliente', { exact: true })).toBeInViewport();
            await s.page.screenshot({ path: path.join(shots, 'zip-editing-mobile.png'), fullPage: true, animations: 'disabled' });
            assert(await s.page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth + 1)); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('ZIP editing UI: pending actions, notes, quick stage changes, cancellation reason and history use the imported record routes', async () => {
        const s = await setup({ legacyEditing: true }); try {
            await open(s); const dialog = s.page.getByRole('dialog');
            await dialog.getByRole('button', { name: 'Resolver pendência', exact: true }).click(); await expect(dialog.getByText('Pendência resolvida.', { exact: true })).toBeVisible();
            await dialog.getByLabel('Texto da anotação', { exact: true }).fill('Conversa registrada QA'); await dialog.getByRole('button', { name: 'Adicionar anotação', exact: true }).click(); await expect(dialog.getByText('Conversa registrada QA', { exact: true })).toBeVisible();
            await dialog.getByRole('button', { name: 'Alterar etapa', exact: true }).click(); await dialog.getByLabel('Nova etapa', { exact: true }).selectOption('pausado'); await dialog.getByRole('button', { name: 'Salvar alteração', exact: true }).click();
            await expect(dialog.getByText('Etapa: Pausado', { exact: true })).toBeVisible();
            await dialog.getByRole('button', { name: 'Cancelar registro', exact: true }).click(); await dialog.getByLabel('Justificativa do cancelamento', { exact: true }).fill('Cancelamento revisado QA'); await dialog.getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click();
            await expect(dialog.getByRole('button', { name: 'Cancelar registro', exact: true })).toHaveCount(0);
            await dialog.getByRole('button', { name: 'Histórico do projeto', exact: true }).click(); await expect(dialog.getByLabel('Histórico do projeto')).toContainText('Cancelamento revisado QA');
            assert(s.legacyRecords[0].annotations.length === 1); assert.equal(s.legacyRecords[0].pending[0].open, false); assert(writes(s).every(item => item.path.startsWith('/project-services/legacy/records/'))); assert.deepEqual(s.errors, []);
        } finally { await s.context.close(); }
    });
    await run('ZIP editing UI: consultation permission and Internos restrictions remain effective after editing capability is available', async () => {
        const s = await setup({ legacyEditing: true, readonly: true }); try {
            await open(s); const dialog = s.page.getByRole('dialog');
            for (const name of ['Editar dados', 'Alterar etapa', 'Cancelar registro', 'Resolver pendência', 'Adicionar ação pendente', 'Adicionar anotação']) await expect(dialog.getByRole('button', { name, exact: true })).toHaveCount(0);
            await dialog.getByRole('button', { name: 'Histórico do projeto', exact: true }).click(); await expect(dialog.getByLabel('Histórico do projeto')).toContainText('Nenhuma alteração registrada.'); assert.deepEqual(writes(s), []);
        } finally { await s.context.close(); }
    });
};
module.exports.respond = ({ url, request, body, respond, legacyRecords, legacyHistory, fixedNow }) => {
    const suffix = url.pathname.slice('/project-services/legacy/records/'.length).split('/');
    const record = legacyRecords.find(item => item.id === suffix[0]); if (!record) return respond({ error: { message: 'Registro não encontrado' } }, 404);
    const history = legacyHistory.get(record.id) ?? []; legacyHistory.set(record.id, history);
    if (suffix[1] === 'history') return respond({ data: history, total: history.length, page: 1, limit: 30 });
    if (request.method() === 'GET') return respond({ data: record });
    const before = core(record), stamp = new Date(fixedNow).toISOString(); let action = 'PROJECT_LEGACY_UPDATE';
    if (suffix.length === 1) {
        if (body.expectedVersion !== record.version) return respond({ error: { message: 'O registro mudou. Atualize o card antes de editar.' } }, 409);
        Object.assign(record, body.data);
    } else if (suffix[1] === 'planning') { record.planning = body.next; action = 'PROJECT_LEGACY_PLANNING'; }
    else if (suffix[1] === 'observations') { record.notes = body.next; action = 'PROJECT_LEGACY_OBSERVATIONS'; }
    else if (suffix[1] === 'cancel') { record.planning = { ...record.planning, stage: 'cancelado' }; action = 'PROJECT_LEGACY_CANCEL'; }
    else if (suffix[1] === 'notes') { record.annotations.push({ sourceId: body.id, date: stamp, author: 'Organizador QA', text: body.text }); action = 'PROJECT_LEGACY_NOTE_CREATE'; }
    else if (suffix[1] === 'pending') {
        const pending = record.pending.find(item => item.sourceId === suffix[2]);
        if (!suffix[2]) record.pending.push({ sourceId: body.id, ...body, open: true, version: 0, createdAt: stamp, createdBy: 'Organizador QA', resolvedAt: '', resolvedBy: '' });
        else if (suffix[3] === 'resolve') Object.assign(pending, { open: false, resolvedAt: stamp, resolvedBy: 'Organizador QA', version: (pending.version ?? 0) + 1 });
        else Object.assign(pending, body, { version: (pending.version ?? 0) + 1 });
        action = 'PROJECT_LEGACY_PENDING_RESOLVE';
    }
    record.version++; record.editedAt = stamp; record.editedBy = 'Organizador QA';
    history.unshift({ id: String(history.length + 1), action, createdAt: stamp, author: 'Organizador QA', changes: [{ field: 'Dados do registro', before: JSON.stringify(before), after: JSON.stringify(core(record)) }], reason: body.reason ?? null });
    return respond({ data: record }, request.method() === 'POST' ? 201 : 200);
};
