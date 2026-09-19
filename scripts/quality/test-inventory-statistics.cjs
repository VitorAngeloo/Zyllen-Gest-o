const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
module.exports = async ({ run, prisma, origin, admin, unprivileged, client, thirdParty, company, internal }) => {
    assert.match(process.env.DATABASE_URL, /^postgresql:\/\/postgres:local-test@127\.0\.0\.1:/);
    const reader = await internal('Leitor estoque painel QA', ['inventory.view']);
    async function http(route, { actor = admin, method = 'GET', body } = {}) {
        const response = await fetch(origin + route, { method, headers: { ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: response.status, data: await response.json() };
    }
    const status = (r, code) => assert.equal(r.status, code, JSON.stringify(r.data)), ok = r => { status(r, 200); return r.data.data; };
    const stats = (query = {}, actor) => http('/inventory/statistics?' + new URLSearchParams(query), { actor });
    await run('Inventory panel: no selected warehouse consolidates internal stock without inventing minimum priorities', async () => {
        const data = ok(await stats()); assert.deepEqual(data.scope, { assets: 0, available: 0, maintenance: 0 }); assert.equal(data.location, null); assert.equal(data.replenishmentConfigured, false); assert.deepEqual(data.priorities, []);
    });
    const wh = await prisma.location.create({ data: { name: 'Depósito principal painel QA', kind: 'INTERNAL', isMainWarehouse: true } });
    const other = await prisma.location.create({ data: { name: 'Depósito outro painel QA', kind: 'INTERNAL' } });
    const clientLocation = await prisma.location.create({ data: { name: 'Cliente local painel QA', kind: 'CLIENT', companyId: company.id } });
    const category = await prisma.category.create({ data: { name: 'Painel estoque QA' } });
    const sku = async (name, code) => prisma.skuItem.create({ data: { name, skuCode: code, categoryId: category.id } });
    const a = await sku('Mais unidades painel QA', '894001'), b = await sku('Mais registros painel QA', '894002'), c = await sku('Zerado sem reserva painel QA', '894003');
    const units = async (item, count, status = 'ATIVO', loc = wh.id) => prisma.asset.createMany({ data: Array.from({ length: count }, () => ({ assetCode: 'PQA-' + crypto.randomUUID(), skuId: item.id, status, currentLocationId: loc })) });
    await units(a, 2); await units(a, 3, 'EM_MANUTENCAO'); await units(a, 1, 'BAIXADO'); await units(a, 4, 'EM_USO', clientLocation.id); await units(a, 1, 'ATIVO', clientLocation.id); await units(b, 10);
    const type = await prisma.movementType.create({ data: { name: 'Mecânica painel QA' } }), writeOff = await prisma.movementType.create({ data: { name: 'Baixa painel QA', isFinalWriteOff: true } });
    const move = (item, qty, extra = {}) => prisma.stockMovement.create({ data: { typeId: type.id, skuId: item.id, qty, createdByInternalUserId: admin.id, createdAt: new Date(Date.now() - 60000), ...extra } });
    await move(a, 100, { toLocationId: wh.id }); for (let i = 0; i < 3; i++) await move(b, 1, { toLocationId: wh.id });
    await move(a, 3, { fromLocationId: wh.id, toLocationId: clientLocation.id, referenceType: 'CLIENT_SHIPMENT' });
    await move(a, 4, { fromLocationId: wh.id, reason: 'Consumo narrativo sem prova QA' }); await move(a, 2, { fromLocationId: wh.id, typeId: writeOff.id });
    await move(a, 9, { fromLocationId: wh.id, toLocationId: other.id, referenceType: 'INTERNAL_TRANSFER' }); await move(a, 2, { fromLocationId: clientLocation.id, toLocationId: wh.id, referenceType: 'CLIENT_RETURN' });
    await move(a, 99, { fromLocationId: wh.id, revertedByMovementId: 'qa-reverse' }); await move(a, 99, { toLocationId: wh.id, referenceType: 'REVERSAL' });
    await move(a, 1000, { toLocationId: wh.id, createdAt: new Date(Date.now() - 31 * 86400000) }); await move(a, 10000, { toLocationId: wh.id, createdAt: new Date(Date.now() + 86400000) });
    await move(b, 4, { fromLocationId: wh.id }); await move(c, 2, { fromLocationId: wh.id, toLocationId: clientLocation.id, referenceType: 'CLIENT_SHIPMENT' }); await move(a, -1, { toLocationId: wh.id });
    await run('Inventory panel: quantity rankings differ from record counts, classify transfers/returns/unknown exits without consumption assumptions', async () => {
        const data = ok(await stats()); assert.equal(data.topEntries[0].skuId, a.id); assert.equal(data.topEntries[0].quantity, 102); assert.equal(data.topEntries[1].quantity, 3);
        assert.equal(data.topExits[0].quantity, 9); const nature = Object.fromEntries(data.movements.map(m => [m.nature, m]));
        assert.equal(nature.TRANSFER.quantity, 9); assert.equal(nature.RETURN.quantity, 2); assert.equal(nature.EXIT.quantity, 8); assert.equal(nature.REVERTED.quantity, 99); assert.equal(nature.REVERSAL.quantity, 99); assert.equal(nature.UNCLASSIFIED.quantity, 0);
        assert(!JSON.stringify(data).includes('Consumo narrativo')); assert(!/passwordHash|cpf|email|token|pin4Hash/i.test(JSON.stringify(data)));
    });
    await run('Inventory panel: available excludes client possession/maintenance/writeoff; total assets stay global across contexts', async () => {
        const main = ok(await stats()); assert.deepEqual(main.scope, { assets: 15, available: 12, maintenance: 3 });
        const customers = ok(await stats({ context: 'CLIENT', companyId: company.id })); assert.deepEqual(customers.scope, { assets: 5, available: 0, maintenance: 0 }); assert.equal(customers.totals.assets, main.totals.assets); assert.equal(customers.replenishmentConfigured, false);
        const all = ok(await stats({ context: 'ALL' })); assert.equal(all.scope.assets, 20); assert.equal(all.scope.available, 12);
        const different = ok(await stats({ locationId: other.id })); assert.equal(different.scope.available, 0); assert.deepEqual(different.priorities, []);
    });
    const minimum = (item, min, high = null) => http('/inventory/minimums', { method: 'POST', body: { skuId: item.id, locationId: wh.id, minimum: min, highOutputThreshold: high } });
    await run('Inventory panel: zero with real exits is a priority without an invented minimum; configured shortfall outranks healthy high output', async () => {
        const initial = ok(await stats({ locationId: wh.id })); assert.equal(initial.minimumConfiguredCount, 0); assert.equal(initial.priorities.length, 1); assert.equal(initial.priorities[0].skuId, c.id); assert.equal(initial.priorities[0].minimum, null);
        status(await minimum(a, 5), 201); status(await minimum(b, 2, 4), 201);
        const data = ok(await stats({ locationId: wh.id })); assert.equal(data.criticalCount, 2); const row = data.priorities.find(p => p.skuId === a.id); assert.equal(row.available, 2); assert.equal(row.output30, 9); assert.equal(row.shortage, 3); assert.equal(row.reason, 'BELOW_MINIMUM');
        const high = data.priorities.find(p => p.skuId === b.id); assert.equal(high.critical, false); assert.equal(high.reason, 'HIGH_OUTPUT'); assert.equal(data.priorities.at(-1).skuId, b.id);
    });
    await run('Inventory panel: capacity is ten priorities and total critical count remains accurate beyond the visible list', async () => {
        for (let i = 0; i < 12; i++) { const item = await sku('Outra prioridade painel QA ' + i, String(894100 + i)); status(await minimum(item, 1), 201); }
        const data = ok(await stats({ locationId: wh.id })); assert.equal(data.criticalCount, 14); assert.equal(data.priorities.length, 10); assert(data.priorities.every(p => p.critical));
    });
    await run('Inventory panel: minimum configuration is unique/audited/strict, only internal, and administrator write requires settings.manage for other roles', async () => {
        status(await minimum(a, 6), 201); assert.equal(await prisma.stockMinimum.count({ where: { skuId: a.id, locationId: wh.id } }), 1);
        const body = { skuId: a.id, locationId: wh.id, minimum: 3 };
        status(await http('/inventory/minimums', { actor: reader, method: 'POST', body }), 403);
        for (const invalid of [{ ...body, minimum: -1 }, { ...body, minimum: 1.5 }, { ...body, highOutputThreshold: 0 }, { ...body, unexpected: true }, { ...body, locationId: clientLocation.id }]) status(await http('/inventory/minimums', { method: 'POST', body: invalid }), 400);
        assert(await prisma.auditLog.count({ where: { action: 'STOCK_MINIMUM_CONFIGURED' } }) > 0);
        const empty = await prisma.location.create({ data: { name: 'Somente reserva painel QA', kind: 'INTERNAL' } });
        status(await http('/inventory/minimums', { method: 'POST', body: { ...body, locationId: empty.id } }), 201);
        status(await http(`/locations/${empty.id}`, { method: 'PUT', body: { kind: 'CLIENT', companyId: company.id } }), 409);
    });
    await run('Inventory panel: UTC thirty-day quantities remain stable in another database zone and queries cannot inject company/location/unknown fields', async () => {
        await prisma.$executeRawUnsafe("SET TIME ZONE 'UTC'"); const before = ok(await stats()); await prisma.$executeRawUnsafe("SET TIME ZONE 'America/Sao_Paulo'"); const after = ok(await stats());
        for (const key of ['totals', 'scope', 'movements', 'topEntries', 'topExits', 'priorities']) assert.deepEqual(after[key], before[key]);
        for (const query of [{ context: 'bad' }, { locationId: 'bad' }, { context: 'ALL', companyId: company.id }, { context: 'CLIENT', locationId: wh.id }, { companyId: company.id }, { limit: '500' }, { locationId: clientLocation.id }]) status(await stats(query), 400);
    });
    await run('Inventory panel: all reads require internal inventory.view and reveal no personal credentials', async () => {
        for (const actor of [null, unprivileged, client, thirdParty]) status(await stats({}, actor), actor ? 403 : 401);
        status(await stats({}, reader), 200); const opts = ok(await http('/inventory/minimum-options', { actor: reader })); assert(opts.some(s => s.id === a.id)); assert(!/email|pin|cpf/i.test(JSON.stringify(opts)));
    });
};
if (require.main === module) { const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-statistics.cjs'), '--inventory-statistics'], { stdio: 'inherit', windowsHide: true }); process.exitCode = result.status ?? 1; }
