/* Called only by the disposable PGlite security harness. */
const assert = require('node:assert/strict');
module.exports = async ({ run, prisma, http, admin, manager, pin }) => {
    assert.match(process.env.DATABASE_URL, /^postgresql:\/\/postgres:local-test@127\.0\.0\.1:/);
    const category = await prisma.category.create({ data: { name: 'QA arquitetura' } });
    const sku = await prisma.skuItem.create({ data: { skuCode: '870001', name: 'Item QA arquitetura', categoryId: category.id, codePrefix: 'QAR' } });
    const emptySku = await prisma.skuItem.create({ data: { skuCode: '870002', name: 'Item QA sem estoque', categoryId: category.id } });
    const location = await prisma.location.create({ data: { name: 'Local QA arquitetura' } });
    const asset = await prisma.asset.create({ data: { assetCode: 'ARCH-00001', skuId: sku.id, currentLocationId: location.id } });
    await prisma.asset.create({ data: { assetCode: 'ARCH-00002', skuId: sku.id, currentLocationId: location.id, status: 'BAIXADO' } });
    const type = await prisma.movementType.create({ data: { name: 'Entrada' } });
    const movement = await prisma.stockMovement.create({ data: { typeId: type.id, skuId: sku.id, assetId: asset.id, toLocationId: location.id, qty: 1, createdByInternalUserId: admin.id, reason: 'Movimento QA arquitetura' } });
    const status = (response, expected) => assert.equal(response.status, expected, JSON.stringify(response.data));
    await run('Features API: balances include zero stock, exclude written-off assets and respect location filters', async () => {
        const all = await http('/inventory/balances', { actor: admin }); status(all, 200);
        assert.equal(all.data.data.find(row => row.skuId === sku.id).quantity, 1);
        assert.equal(all.data.data.find(row => row.skuId === emptySku.id).quantity, 0);
        const filtered = await http(`/inventory/balances?locationId=${location.id}`, { actor: admin }); status(filtered, 200);
        assert(filtered.data.data.every(row => row.locationId === location.id));
        assert(!filtered.data.data.some(row => row.skuId === emptySku.id));
    });
    await run('Features API: history pagination/search, statistics and pending approval contracts survive delegation', async () => {
        const history = await http(`/inventory/movements?search=${sku.skuCode}&page=1&limit=1`, { actor: admin }); status(history, 200);
        assert.equal(history.data.total, 1); assert.equal(history.data.page, 1); assert.equal(history.data.limit, 1);
        assert.equal(history.data.data[0].id, movement.id); assert.equal(history.data.data[0].sku.skuCode, sku.skuCode);
        const stats = await http('/inventory/stats', { actor: admin }); status(stats, 200);
        const distribution = stats.data.data.locationDistribution.find(row => row.name === location.name);
        assert.equal(distribution.totalQuantity, 1); assert.equal(distribution.itemCount, 1);
        const approval = await prisma.approvalRequest.create({ data: { requestType: 'QA_ARCHITECTURE', requestedById: admin.id, payloadJson: { skuId: sku.id } } });
        const pending = await http('/inventory/approvals/pending', { actor: admin }); status(pending, 200);
        assert.equal(pending.data.data.find(row => row.id === approval.id).requestedBy.name, admin.name);
    });
    await run('Features API: movement settings retain linked-record protection, unique exit reasons and RBAC', async () => {
        status(await http(`/inventory/movement-types/${type.id}`, { actor: admin, method: 'DELETE' }), 400);
        const created = await http('/inventory/exit-reasons', { actor: admin, method: 'POST', body: { name: ' QA saída ' } }); status(created, 201);
        assert.equal(created.data.data.name, 'QA saída');
        status(await http('/inventory/exit-reasons', { actor: admin, method: 'POST', body: { name: 'QA saída' } }), 409);
        status(await http('/inventory/exit-reasons', { actor: manager, method: 'POST', body: { name: 'Sem autorização' } }), 403);
        status(await http(`/inventory/exit-reasons/${created.data.data.id}`, { actor: admin, method: 'PUT', body: { active: false } }), 200);
        const active = await http('/inventory/exit-reasons?onlyActive=true', { actor: admin }); status(active, 200);
        assert(!active.data.data.some(row => row.id === created.data.data.id));
        const all = await http('/inventory/exit-reasons', { actor: admin }); assert(all.data.data.some(row => row.id === created.data.data.id));
    });
    await run('Features API: rejected PIN causes no stock effects; accepted entry creates unique assets and audit', async () => {
        const body = { skuId: sku.id, toLocationId: location.id, qty: 2, movementTypeId: type.id, pin, reason: 'Entrada QA arquitetura' };
        const before = await prisma.asset.count({ where: { skuId: sku.id } });
        status(await http('/inventory/entry', { actor: admin, method: 'POST', body: { ...body, pin: '0000' } }), 401);
        assert.equal(await prisma.asset.count({ where: { skuId: sku.id } }), before);
        const entry = await http('/inventory/entry', { actor: admin, method: 'POST', body }); status(entry, 201);
        assert.equal(entry.data.data.createdAssetCodes.length, 2); assert.equal(new Set(entry.data.data.createdAssetCodes).size, 2);
        assert.equal(await prisma.asset.count({ where: { skuId: sku.id } }), before + 2);
        assert.equal(await prisma.auditLog.count({ where: { action: 'STOCK_ENTRY', entityId: entry.data.data.id } }), 1);
        const balance = await http(`/inventory/balances?skuId=${sku.id}`, { actor: admin }); assert.equal(balance.data.data[0].quantity, 3);
    });
    return { sku, emptySku, location, asset, movement };
};
