/* Real guarded HTTP and transactions against disposable PostgreSQL only. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
module.exports = async ({ run, prisma, origin, admin, unprivileged, client, thirdParty, company, internal, db }) => {
    assert.match(process.env.DATABASE_URL, /^postgresql:\/\/postgres:local-test@127\.0\.0\.1:/);
    const bcrypt = require(require.resolve('bcrypt', { paths: [path.resolve(__dirname, '../../apps/api')] }));
    const pin = '6428', hash = await bcrypt.hash(pin, 4);
    await prisma.internalUser.update({ where: { id: admin.id }, data: { pin4Hash: hash } });
    const requester = await internal('Operador de estoque QA', ['inventory.view', 'inventory.bipar_saida', 'inventory.bipar_entrada', 'inventory.historico']);
    const approver = await internal('Aprovador de estoque QA', ['approvals.approve', 'approvals.reject', 'approvals.view', 'inventory.view']);
    const entryOnly = await internal('Operador entrada QA', ['inventory.view', 'inventory.bipar_entrada']);
    for (const actor of [requester, approver, entryOnly]) await prisma.internalUser.update({ where: { id: actor.id }, data: { pin4Hash: await bcrypt.hash(pin, 4) } });
    async function http(route, { actor = admin, method = 'GET', body } = {}) {
        const response = await fetch(origin + route, { method, headers: { ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
        return { status: response.status, data: await response.json() };
    }
    const status = (r, code) => assert.equal(r.status, code, JSON.stringify(r.data)), value = (r, code = 200) => { status(r, code); return r.data.data; };
    const category = await prisma.category.create({ data: { name: 'Custódia QA' } });
    const sku = await prisma.skuItem.create({ data: { name: 'Tela QA', skuCode: '891001', codePrefix: 'CQA', categoryId: category.id } });
    const type = await prisma.movementType.create({ data: { name: 'Transferência QA' } });
    const controlled = await prisma.movementType.create({ data: { name: 'Transferência controlada QA', requiresApproval: true } });
    const legacy = await prisma.location.create({ data: { name: 'Skyline apenas no nome QA' } });
    const unknown = await prisma.asset.create({ data: { assetCode: 'CQA-LEGACY', skuId: sku.id } });
    const inLegacy = await prisma.asset.create({ data: { assetCode: 'CQA-LEGACY-LOCAL', skuId: sku.id, currentLocationId: legacy.id } });
    const project = await prisma.project.create({ data: { name: 'Unidade cliente QA', companyId: company.id } });
    let warehouse, destination, other, spare;
    const assets = [];
    const asset = async () => { const row = await prisma.asset.create({ data: { assetCode: 'CQA-' + crypto.randomUUID(), skuId: sku.id, currentLocationId: warehouse.id } }); assets.push(row); return row; };
    const input = (ids, extra = {}) => ({ requestId: crypto.randomUUID(), kind: 'SHIPMENT', fromLocationId: warehouse.id, toLocationId: destination.id, movementTypeId: type.id, assetIds: ids, reason: 'Envio cliente QA', pin, ...extra });
    const send = (body, actor = requester) => http(`/inventory/custody/${body.kind === 'RETURN' ? 'returns' : 'transfers'}`, { method: 'POST', actor, body });
    await run('Custody: explicit existing warehouse/client-unit identification, unique main warehouse and immutable recorded ownership', async () => {
        warehouse = value(await http('/locations', { method: 'POST', body: { name: 'Estoque interno QA', kind: 'INTERNAL', isMainWarehouse: true } }), 201);
        destination = value(await http('/locations', { method: 'POST', body: { name: 'Local cliente QA', kind: 'CLIENT', companyId: company.id, projectId: project.id } }), 201);
        other = value(await http('/locations', { method: 'POST', body: { name: 'Outro cliente QA', kind: 'CLIENT', companyId: company.id } }), 201);
        spare = value(await http('/locations', { method: 'POST', body: { name: 'Outro interno QA', kind: 'INTERNAL', isMainWarehouse: true } }), 201);
        assert.equal(await prisma.location.count({ where: { isMainWarehouse: true } }), 1);
        assert.equal((await prisma.location.findUnique({ where: { id: warehouse.id } })).isMainWarehouse, null);
        status(await http(`/locations/${warehouse.id}`, { method: 'PUT', body: { isMainWarehouse: true } }), 200);
        status(await http('/locations', { method: 'POST', body: { name: 'Cliente sem vínculo QA', kind: 'CLIENT' } }), 400);
        status(await http(`/locations/${destination.id}`, { method: 'PUT', body: { companyId: crypto.randomUUID() } }), 400);
        status(await http(`/locations/${destination.id}`, { method: 'PUT', body: { isMainWarehouse: true } }), 400);
        const before = value(await http('/inventory/custody/options')); assert.equal(before.diagnostic.unlocatedAssets, 1); assert.equal(before.diagnostic.unclassifiedAssets, 2);
        assert.equal((await prisma.asset.findUnique({ where: { id: unknown.id } })).currentLocationId, null);
        assert.equal(before.locations.find(l => l.id === legacy.id).kind, null);
        status(await http(`/locations/${legacy.id}`, { method: 'PUT', body: { kind: 'INTERNAL' } }), 200);
        status(await http(`/locations/${legacy.id}`, { method: 'PUT', body: { kind: 'CLIENT', companyId: company.id } }), 409);
        assert.equal((await prisma.asset.findUnique({ where: { id: inLegacy.id } })).currentLocationId, legacy.id);
    });
    let shipment;
    await run('Custody: shipment records each unit/destination/timeline/audit; total and code sequence remain unchanged', async () => {
        const first = await asset(), second = await asset();
        const count = await prisma.asset.count(); const sequence = await prisma.assetCodeSequence.findMany();
        const body = input([first.id, second.id]); shipment = value(await send(body), 201);
        assert.equal(shipment.status, 'COMPLETED'); assert.equal(shipment.items.length, 2);
        const moved = await prisma.asset.findMany({ where: { id: { in: body.assetIds } } }); assert(moved.every(a => a.currentLocationId === destination.id && a.status === 'EM_USO'));
        const movements = await prisma.stockMovement.findMany({ where: { referenceId: body.requestId } }); assert.equal(movements.length, 2); assert(movements.every(m => m.qty === 1 && m.fromLocationId === warehouse.id && m.toLocationId === destination.id));
        assert.equal(await prisma.assetEvent.count({ where: { assetId: { in: body.assetIds } } }), 2);
        assert.equal(await prisma.asset.count(), count); assert.deepEqual(await prisma.assetCodeSequence.findMany(), sequence);
        assert(!/6428|pin4Hash|passwordHash/.test(JSON.stringify(await prisma.auditLog.findMany({ where: { entityId: body.requestId } }))));
        shipment.body = body;
        status(await http(`/locations/${destination.id}`, { method: 'PUT', body: { kind: 'INTERNAL', companyId: null, projectId: null } }), 409);
        status(await http(`/locations/${destination.id}`, { method: 'DELETE' }), 409);
    });
    await run('Custody: retry is idempotent, changed payload collides, rejected PIN and invalid batches cause no effects', async () => {
        assert.equal(value(await send(shipment.body), 201).id, shipment.id);
        assert.equal(await prisma.stockMovement.count({ where: { referenceId: shipment.id } }), 2);
        status(await send({ ...shipment.body, reason: 'Alterado' }), 409);
        const available = await asset(); const before = await prisma.stockMovement.count();
        status(await send(input([available.id], { pin: '0000' })), 401);
        status(await send(input([available.id, shipment.items[0].assetId])), 409);
        status(await send(input([available.id, crypto.randomUUID()])), 409);
        status(await send(input([available.id, available.id])), 400);
        status(await send(input([unknown.id])), 409);
        assert.equal(await prisma.stockMovement.count(), before); assert.equal((await prisma.asset.findUnique({ where: { id: available.id } })).currentLocationId, warehouse.id);
    });
    await run('Custody: partial return only moves selected units; maintenance return remains unavailable for shipment', async () => {
        const id = shipment.items[0].assetId;
        const returned = value(await send(input([id], { kind: 'RETURN', fromLocationId: destination.id, toLocationId: warehouse.id, returnStatus: 'EM_MANUTENCAO', reason: 'Retorno parcial QA' })), 201);
        assert.equal(returned.items.length, 1); assert.equal((await prisma.asset.findUnique({ where: { id } })).status, 'EM_MANUTENCAO');
        assert.equal((await prisma.asset.findUnique({ where: { id: shipment.items[1].assetId } })).currentLocationId, destination.id);
        status(await send(input([id])), 409);
        const rows = value(await http('/inventory/custody/assets?companyId=' + company.id)); assert(rows.some(a => a.id === shipment.items[1].assetId && a.shipmentAt)); assert(!rows.some(a => a.id === id));
        const filtered = await http(`/inventory/custody/assets?locationId=${warehouse.id}&companyId=${company.id}`); assert.equal(filtered.data.total, 0);
    });
    await run('Custody: simultaneous destinations have one winner and exactly one immutable movement', async () => {
        const row = await asset();
        const responses = await Promise.all([send(input([row.id])), send(input([row.id], { toLocationId: other.id }))]);
        assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
        assert.equal(await prisma.stockMovement.count({ where: { assetId: row.id } }), 1);
        assert([destination.id, other.id].includes((await prisma.asset.findUnique({ where: { id: row.id } })).currentLocationId));
    });
    await run('Custody: approvals preserve selected destination and crew, validate at approval and forbid self/double approval', async () => {
        const row = await asset(), body = input([row.id], { movementTypeId: controlled.id });
        const pending = value(await send(body), 201); assert.equal(pending.status, 'PENDING'); assert.equal((await prisma.asset.findUnique({ where: { id: row.id } })).currentLocationId, warehouse.id);
        const approve = actor => http(`/inventory/approvals/${pending.approvalRequestId}/approve`, { actor, method: 'POST', body: { pin } });
        status(await approve(admin), 200); // Different actor; admin bypass is intentional.
        status(await approve(approver), 409); assert.equal((await prisma.asset.findUnique({ where: { id: row.id } })).currentLocationId, destination.id);
        const own = value(await send(input([(await asset()).id], { movementTypeId: controlled.id }), admin), 201);
        status(await http(`/inventory/approvals/${own.approvalRequestId}/approve`, { actor: admin, method: 'POST', body: { pin } }), 400);
        const changed = await asset(), stale = value(await send(input([changed.id], { movementTypeId: controlled.id })), 201);
        value(await send(input([changed.id], { toLocationId: other.id })), 201);
        status(await http(`/inventory/approvals/${stale.approvalRequestId}/approve`, { actor: approver, method: 'POST', body: { pin } }), 409);
        assert.equal((await prisma.approvalRequest.findUnique({ where: { id: stale.approvalRequestId } })).status, 'PENDING');
        status(await http(`/inventory/approvals/${stale.approvalRequestId}/reject`, { actor: approver, method: 'POST', body: { pin } }), 200);
        assert.equal(value(await send(input([changed.id], { requestId: stale.id, movementTypeId: controlled.id })), 201).status, 'REJECTED');
    });
    await run('Custody: reversal restores the original origin/status and cannot erase a later shipment or partial return', async () => {
        const row = await asset(); const transferred = value(await send(input([row.id])), 201);
        const original = transferred.items[0].movementId;
        const request = value(await http(`/inventory/movements/${original}/reversal`, { actor: requester, method: 'POST', body: { reason: 'Destino incorreto QA' } }), 201);
        status(await http(`/inventory/reversals/${request.approvalRequestId}/approve`, { actor: approver, method: 'POST', body: { pin } }), 200);
        const restored = await prisma.asset.findUnique({ where: { id: row.id } }); assert.equal(restored.currentLocationId, warehouse.id); assert.equal(restored.status, 'ATIVO');
        const later = value(await send(input([row.id])), 201);
        const stale = value(await http(`/inventory/movements/${later.items[0].movementId}/reversal`, { actor: requester, method: 'POST', body: { reason: 'Reversão antiga QA' } }), 201);
        value(await send(input([row.id], { kind: 'RETURN', fromLocationId: destination.id, toLocationId: warehouse.id })), 201);
        status(await http(`/inventory/reversals/${stale.approvalRequestId}/approve`, { actor: approver, method: 'POST', body: { pin } }), 409);
        assert.equal((await prisma.asset.findUnique({ where: { id: row.id } })).currentLocationId, warehouse.id);
    });
    await run('Custody: legacy writes cannot detach client units, or bypass structured destination and approvals', async () => {
        const id = shipment.items[1].assetId;
        const common = { skuId: sku.id, qty: 1, movementTypeId: type.id, assetId: id, pin };
        status(await http('/inventory/entry', { method: 'POST', body: { ...common, toLocationId: warehouse.id } }), 400);
        status(await http('/inventory/exit', { method: 'POST', body: { ...common, fromLocationId: destination.id } }), 400);
        status(await http(`/assets/${id}/location`, { method: 'PUT', body: { locationId: null } }), 409);
        status(await http('/assets', { method: 'POST', body: { skuId: sku.id, currentLocationId: destination.id } }), 409);
        assert.equal((await prisma.asset.findUnique({ where: { id } })).currentLocationId, destination.id);
    });
    await run('Inventory batches: exit binds client/project and entry infers every origin with timeline and idempotency', async () => {
        await prisma.movementType.upsert({ where: { name: 'Saída' }, create: { name: 'Saída' }, update: { requiresApproval: false, isFinalWriteOff: false } });
        const first = await asset();
        const second = await prisma.asset.create({ data: { assetCode: 'CQA-' + crypto.randomUUID(), skuId: sku.id, currentLocationId: spare.id } });
        const exitRequestId = crypto.randomUUID();
        const exitBody = { requestId: exitRequestId, assetIds: [first.id, second.id], destinationLocationId: destination.id, reason: 'Envio lote QA', newStatus: 'EM_USO', eventDescription: 'Enviado ao projeto QA', pin };
        const exited = value(await http('/inventory/exit-batch', { actor: requester, method: 'POST', body: exitBody }), 201);
        assert.equal(exited.processed, 2);
        assert.equal((await prisma.asset.count({ where: { id: { in: exitBody.assetIds }, currentLocationId: destination.id, status: 'EM_USO' } })), 2);
        const exitMovements = await prisma.stockMovement.findMany({ where: { referenceId: exitRequestId }, orderBy: { assetId: 'asc' } });
        assert.equal(exitMovements.length, 2); assert(exitMovements.every(movement => movement.toLocationId === destination.id && movement.referenceType === 'CLIENT_SHIPMENT'));
        assert.deepEqual(new Set(exitMovements.map(movement => movement.fromLocationId)), new Set([warehouse.id, spare.id]));
        assert.equal(await prisma.assetEvent.count({ where: { assetId: { in: exitBody.assetIds }, description: exitBody.eventDescription } }), 2);
        assert.equal(value(await http('/inventory/exit-batch', { actor: requester, method: 'POST', body: exitBody }), 201).processed, 2);
        assert.equal(await prisma.stockMovement.count({ where: { referenceId: exitRequestId } }), 2);

        const entryRequestId = crypto.randomUUID();
        const entryBody = { requestId: entryRequestId, assetIds: exitBody.assetIds, toLocationId: warehouse.id, movementTypeId: type.id, reason: 'Retorno lote QA', eventDescription: 'Retornou ao estoque QA', returnStatus: 'ATIVO', pin };
        const entered = value(await http('/inventory/entry-batch', { actor: entryOnly, method: 'POST', body: entryBody }), 201);
        assert.equal(entered.processed, 2);
        assert.equal(await prisma.asset.count({ where: { id: { in: entryBody.assetIds }, currentLocationId: warehouse.id, status: 'ATIVO' } }), 2);
        const entryMovements = await prisma.stockMovement.findMany({ where: { referenceId: entryRequestId } });
        assert.equal(entryMovements.length, 2); assert(entryMovements.every(movement => movement.fromLocationId === destination.id && movement.toLocationId === warehouse.id && movement.referenceType === 'CLIENT_RETURN'));
        assert.equal(await prisma.assetEvent.count({ where: { assetId: { in: entryBody.assetIds }, description: entryBody.eventDescription } }), 2);
        assert.equal(value(await http('/inventory/entry-batch', { actor: entryOnly, method: 'POST', body: entryBody }), 201).processed, 2);
        assert.equal(await prisma.stockMovement.count({ where: { referenceId: entryRequestId } }), 2);
    });
    await run('Inventory: internal exit reasons choose their own location; write-off waits for another approver', async () => {
        const maintenance = await asset(), internalUse = await asset(), writeOff = await asset();
        for (const [row, reason, newStatus, name] of [
            [maintenance, 'Manutenção — QA', 'EM_MANUTENCAO', 'Manutenção'],
            [internalUse, 'Uso interno — QA', 'EM_USO', 'Uso interno - Skyline'],
        ]) {
            const body = { requestId: crypto.randomUUID(), assetIds: [row.id], reason, newStatus, eventDescription: reason, pin };
            assert.equal(value(await http('/inventory/exit-batch', { actor: requester, method: 'POST', body }), 201).processed, 1);
            const moved = await prisma.asset.findUnique({ where: { id: row.id }, include: { currentLocation: true } });
            assert.equal(moved.currentLocation.name, name); assert.equal(moved.status, newStatus);
            assert.equal(await prisma.assetEvent.count({ where: { assetId: row.id, description: reason } }), 1);
        }
        await prisma.movementType.upsert({ where: { name: 'Baixa' }, create: { name: 'Baixa', requiresApproval: true, isFinalWriteOff: true, setsAssetStatus: 'BAIXADO' },
            update: { requiresApproval: true, isFinalWriteOff: true, setsAssetStatus: 'BAIXADO' } });
        const body = { requestId: crypto.randomUUID(), assetIds: [writeOff.id], reason: 'Baixa — QA', newStatus: 'BAIXADO', eventDescription: 'Baixa definitiva QA', pin };
        const requested = value(await http('/inventory/exit-batch', { actor: requester, method: 'POST', body }), 201);
        assert.equal(requested.approvalRequired, true);
        assert.equal((await prisma.asset.findUnique({ where: { id: writeOff.id } })).currentLocationId, warehouse.id);
        status(await http('/inventory/approvals/' + requested.approvalRequestId + '/approve', { actor: requester, method: 'POST', body: { pin } }), 403);
        status(await http('/inventory/approvals/' + requested.approvalRequestId + '/approve', { actor: approver, method: 'POST', body: { pin } }), 200);
        const lowered = await prisma.asset.findUnique({ where: { id: writeOff.id }, include: { currentLocation: true } });
        assert.equal(lowered.currentLocation.name, 'Baixa'); assert.equal(lowered.status, 'BAIXADO');
        assert.equal(await prisma.stockMovement.count({ where: { assetId: writeOff.id, referenceId: body.requestId } }), 1);
    });
    await run('Inventory: quick exit without a client retains location and timeline in Outros', async () => {
        const row = await asset();
        const exitType = await prisma.movementType.findUniqueOrThrow({ where: { name: 'Saída' } });
        const before = await prisma.asset.count();
        status(await http('/inventory/exit', { actor: requester, method: 'POST', body: {
            skuId: sku.id, fromLocationId: warehouse.id, qty: 1, movementTypeId: exitType.id,
            assetId: row.id, reason: 'Baixa — sem aprovação', pin,
        } }), 400);
        assert.equal((await prisma.asset.findUnique({ where: { id: row.id } })).currentLocationId, warehouse.id);
        value(await http('/inventory/exit', { actor: requester, method: 'POST', body: {
            skuId: sku.id, fromLocationId: warehouse.id, qty: 1, movementTypeId: exitType.id,
            assetId: row.id, reason: 'Saída sem projeto QA', pin,
        } }), 201);
        const moved = await prisma.asset.findUnique({ where: { id: row.id }, include: { currentLocation: true } });
        assert.equal(moved.currentLocation.name, 'Outros');
        assert.equal(moved.status, 'EM_USO');
        assert.equal(await prisma.asset.count(), before);
        assert.equal(await prisma.stockMovement.count({ where: { assetId: row.id, toLocationId: moved.currentLocationId } }), 1);
        assert.equal(await prisma.assetEvent.count({ where: { assetId: row.id, description: { contains: 'Outros' } } }), 1);
    });
    await run('Inventory: uninstallation moves nothing before approval, then returns checked units and records unchecked losses', async () => {
        for (const name of ['Entrada', 'Baixa']) await prisma.movementType.upsert({ where: { name }, create: { name }, update: {} });
        const roomProject = await prisma.project.create({ data: { name: 'Sala desinstalada QA', companyId: company.id } });
        const room = value(await http('/locations', { method: 'POST', body: { name: 'Sala desinstalada QA', kind: 'CLIENT', companyId: company.id, projectId: roomProject.id } }), 201);
        const returned = await asset(), lost = await asset();
        value(await send(input([returned.id, lost.id], { toLocationId: room.id })), 201);
        const snapshot = value(await http('/inventory/custody/uninstallations/' + room.id));
        assert.deepEqual(new Set(snapshot.assets.map(row => row.id)), new Set([returned.id, lost.id]));
        const body = { requestId: crypto.randomUUID(), assetIds: snapshot.assets.map(row => row.id), returnedAssetIds: [returned.id], toLocationId: warehouse.id, pin };
        const request = value(await http('/inventory/custody/uninstallations/' + room.id, { actor: requester, method: 'POST', body }), 201);
        assert.equal(request.returned, 1); assert.equal(request.lost, 1);
        assert.equal(await prisma.asset.count({ where: { id: { in: body.assetIds }, currentLocationId: room.id } }), 2);
        assert.equal(value(await http('/inventory/custody/uninstallations/' + room.id)).pendingApprovalId, request.approvalRequestId);
        status(await http('/inventory/approvals/' + request.approvalRequestId + '/approve', { actor: approver, method: 'POST', body: { pin } }), 200);
        const checked = await prisma.asset.findUnique({ where: { id: returned.id } });
        const missing = await prisma.asset.findUnique({ where: { id: lost.id }, include: { currentLocation: true } });
        assert.equal(checked.currentLocationId, warehouse.id); assert.equal(checked.status, 'ATIVO');
        assert.equal(missing.currentLocation.name, 'Baixa'); assert.equal(missing.status, 'BAIXADO');
        const events = await prisma.assetEvent.findMany({ where: { assetId: { in: body.assetIds } } });
        assert(events.some(event => event.assetId === returned.id && event.description.includes('Voltou para estoque')));
        assert(events.some(event => event.assetId === lost.id && event.description.includes('Perda')));
        assert.equal(value(await http('/inventory/custody/uninstallations/' + room.id)).assets.length, 0);
        assert(value(await http('/inventory/custody/assets?locationId=' + missing.currentLocationId)).some(row => row.id === lost.id));
    });
    await run('Custody: forced failure late in the batch rolls back assets, ledger, timeline, request and audit together', async () => {
        const row = await asset(), body = input([row.id]); const count = await prisma.stockMovement.count();
        await prisma.$executeRawUnsafe(`CREATE FUNCTION custody_qa_failure() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Synthetic audit failure'; END; $$ LANGUAGE plpgsql`);
        await prisma.$executeRawUnsafe(`CREATE TRIGGER custody_qa_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW WHEN (NEW.action = 'CLIENT_SHIPMENT') EXECUTE FUNCTION custody_qa_failure()`);
        try { status(await send(body), 500); assert.equal(await prisma.stockMovement.count(), count); assert.equal(await prisma.inventoryTransfer.count({ where: { id: body.requestId } }), 0); assert.equal((await prisma.asset.findUnique({ where: { id: row.id } })).currentLocationId, warehouse.id); assert.equal(await prisma.assetEvent.count({ where: { assetId: row.id } }), 0); }
        finally { await prisma.$executeRawUnsafe('DROP TRIGGER custody_qa_failure ON "AuditLog"'); await prisma.$executeRawUnsafe('DROP FUNCTION custody_qa_failure()'); }
    });
    await run('Custody: protected audience, correct entry/exit RBAC, bounded pagination, strict query and public projections', async () => {
        for (const actor of [null, unprivileged, client, thirdParty]) status(await http('/inventory/custody/options', { actor }), actor ? 403 : 401);
        status(await send(input([(await asset()).id]), entryOnly), 403);
        status(await http('/inventory/custody/transfers', { method: 'POST', actor: entryOnly, body: input([shipment.items[1].assetId], { kind: 'RETURN', fromLocationId: destination.id, toLocationId: warehouse.id }) }), 403);
        status(await send(input([shipment.items[1].assetId], { kind: 'RETURN', fromLocationId: destination.id, toLocationId: warehouse.id }), entryOnly), 201);
        const response = await http('/inventory/custody/assets?limit=1'); status(response, 200); assert.equal(response.data.data.length, 1); assert(response.data.total > 1);
        for (const query of ['limit=101', 'page=0', 'companyId=bad', 'token=unexpected']) status(await http('/inventory/custody/assets?' + query), 400);
        assert(!/passwordHash|pin4Hash|cpf|email|token/i.test(JSON.stringify(value(await http('/inventory/custody/options')))));
    });
};
if (require.main === module) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-statistics.cjs'), '--custody'], { stdio: 'inherit', windowsHide: true }); process.exitCode = result.status ?? 1;
}
