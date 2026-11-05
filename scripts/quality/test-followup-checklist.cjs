/* Real Nest guards, contracts, migration, Prisma and transactions; disposable DB only. */
const assert = require('node:assert/strict'), crypto = require('node:crypto'), path = require('node:path');
const { spawnSync } = require('node:child_process');
module.exports = async ({ run, prisma, origin, admin, unprivileged, client, thirdParty, company, internal, db: database }) => {
    assert.match(process.env.DATABASE_URL, /@127\.0\.0\.1:\d+\//);
    const editor = await internal('Checklist editor QA', ['followups.view', 'followups.edit']);
    const viewer = await internal('Checklist reader QA', ['followups.view']);
    const followup = await prisma.followup.create({ data: { code: 'AC-CHECKLIST-QA', companyId: company.id, createdById: admin.id } });
    const block = await prisma.followupBlock.create({ data: { followupId: followup.id, type: 'CHECKLIST' } });
    const textBlock = await prisma.followupBlock.create({ data: { followupId: followup.id, type: 'TEXT' } });
    const base = '/followups/' + followup.id + '/blocks/' + block.id + '/checklist';
    async function http(route, method = 'GET', body, actor = editor) {
        const response = await fetch(origin + route, { method, headers: {
            ...(actor ? { Authorization: 'Bearer ' + actor.token } : {}),
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        }, ...(body ? { body: JSON.stringify(body) } : {}) });
        return { status: response.status, body: await response.json() };
    }
    const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body.data; };
    const catalog = '/followups/checklist-catalog';
    let cable, monitor;
    const batch = (items = [{ catalogItemId: cable.id, quantity: 2 }, { catalogItemId: monitor.id, quantity: 5 }]) => ({ requestId: crypto.randomUUID(), items });
    await run('Checklist: catalog routes are static, private, paginated and searchable across old lists', async () => {
        const list = await http(catalog + '?limit=1&page=1');
        assert.equal(list.body.total, 2); assert.equal(ok(list).length, 1); assert.equal(list.body.limit, 1);
        cable = ok(await http(catalog + '?search=CABO%20%20HDMI'))[0]; assert(cable);
        monitor = ok(await http(catalog + '?search=Monitor'))[0]; assert(monitor);
        assert(!JSON.stringify(list.body).includes('companyId'));
        for (const actor of [viewer, unprivileged, client, thirdParty]) {
            assert.equal((await http(catalog, 'GET', undefined, actor)).status, 403);
            assert.equal((await http(catalog, 'POST', { text: 'Sem acesso' }, actor)).status, 403);
            assert.equal((await http(base + '/batch', 'POST', batch(), actor)).status, 403);
        }
        assert.equal((await http(catalog, 'GET', undefined, null)).status, 401);
        assert.equal((await http(catalog + '?limit=101')).status, 400);
    });
    await run('Checklist: new catalog names persist independently and reuse normalized duplicates', async () => {
        const first = ok(await http(catalog, 'POST', { text: '  Adaptador   USB  ' }), 201);
        const again = ok(await http(catalog, 'POST', { text: 'ADAPTADOR USB' }), 201);
        assert.equal(first.id, again.id); assert.equal(first.text, 'Adaptador USB');
        assert.equal(await prisma.followupChecklistItem.count({ where: { blockId: block.id } }), 0);
        assert.equal((await http(catalog, 'POST', { text: '   ' })).status, 400);
        assert.equal(await prisma.auditLog.count({ where: { action: 'FOLLOWUP_CHECKLIST_CATALOG_SAVED', entityId: first.id } }), 2);
    });
    await run('Checklist: batch creates individual quantities in order, audit and history atomically; replay never duplicates', async () => {
        const input = batch();
        assert.equal(ok(await http(base + '/batch', 'POST', input), 201).addedCount, 2);
        assert.equal(ok(await http(base + '/batch', 'POST', input), 201).replayed, true);
        const items = await prisma.followupChecklistItem.findMany({ where: { blockId: block.id }, orderBy: { order: 'asc' } });
        assert.deepEqual(items.map(item => [item.text, item.quantity, item.order, item.checked]), [[cable.text,2,0,false],[monitor.text,5,1,false]]);
        assert.equal(await prisma.auditLog.count({ where: { action: 'FOLLOWUP_CHECKLIST_ITEMS_ADDED', entityId: followup.id } }), 1);
        assert.equal(await prisma.followupHistory.count({ where: { followupId: followup.id, action: 'CHECKLIST_ITEMS_ADDED' } }), 1);
        assert.equal((await http(base + '/batch', 'POST', { ...input, items: [{ catalogItemId: cable.id, quantity: 3 }] })).status, 409);
        const detail = ok(await http('/followups/' + followup.id, 'GET', undefined, viewer));
        assert.equal(detail.blocks.find(row => row.id === block.id).checklistItems[1].quantity, 5);
        const external = ok(await http('/client/followups/' + followup.id, 'GET', undefined, client));
        assert.equal(external.blocks.find(row => row.id === block.id).checklistItems[0].quantity, 2);
    });
    await run('Checklist: invalid quantities, repeated selections and missing catalog items leave no partial entries', async () => {
        const before = await prisma.followupChecklistItem.count({ where: { blockId: block.id } });
        for (const quantity of [0,-1,1.5,2147483648,'2',null]) assert.equal((await http(base + '/batch', 'POST', batch([{ catalogItemId: cable.id, quantity }]))).status, 400);
        for (const items of [[],[{ catalogItemId: cable.id, quantity: 1 },{ catalogItemId: cable.id, quantity: 2 }], [{ catalogItemId: cable.id, quantity: 1 },{ catalogItemId: crypto.randomUUID(), quantity: 1 }]]) {
            assert.equal((await http(base + '/batch', 'POST', batch(items))).status, 400);
        }
        assert.equal(await prisma.followupChecklistItem.count({ where: { blockId: block.id } }), before);
        assert.equal((await http('/followups/' + followup.id + '/blocks/' + textBlock.id + '/checklist/batch', 'POST', batch())).status, 400);
        assert.equal((await http('/followups/' + crypto.randomUUID() + '/blocks/' + block.id + '/checklist/batch', 'POST', batch())).status, 404);
    });
    await run('Checklist: can add after initial creation and edit quantity without changing other fields or catalog', async () => {
        ok(await http(base + '/batch', 'POST', batch([{ catalogItemId: cable.id, quantity: 7 }])), 201);
        const legacy = ok(await http(base, 'POST', { text: 'Novo item manual', details: 'Preservar' }), 201);
        assert.equal(legacy.quantity, 1);
        const updated = ok(await http(base + '/' + legacy.id, 'PUT', { quantity: 8, checked: true }));
        assert.equal(updated.quantity, 8); assert.equal(updated.details, 'Preservar'); assert.equal(updated.text, legacy.text);
        assert.equal((await http(base + '/' + legacy.id, 'PUT', { quantity: 0 })).status, 400);
        assert.equal((await http('/followups/' + followup.id + '/blocks/' + textBlock.id + '/checklist/' + legacy.id, 'PUT', { quantity: 2 })).status, 400);
        ok(await http(base + '/' + legacy.id, 'DELETE'));
        assert.equal(ok(await http(catalog + '?search=Novo%20item%20manual')).length, 0);
        ok(await http(catalog, 'POST', { text: 'Novo item manual' }), 201);
        assert.equal(ok(await http(catalog + '?search=Novo%20item%20manual')).length, 1);
        assert.equal(await prisma.followupChecklistItem.count({ where: { blockId: block.id } }), 3);
    });
    await run('Checklist: concurrent replays create one batch; audit failure rolls back every entry and history', async () => {
        const input = batch([{ catalogItemId: cable.id, quantity: 9 }]);
        const before = await prisma.followupChecklistItem.count({ where: { blockId: block.id } });
        const results = await Promise.all([http(base + '/batch', 'POST', input), http(base + '/batch', 'POST', input)]);
        results.forEach(result => ok(result, 201));
        assert.equal(await prisma.followupChecklistItem.count({ where: { blockId: block.id } }), before + 1);
        const historyBefore = await prisma.followupHistory.count();
        await prisma.$executeRawUnsafe("CREATE FUNCTION fail_checklist_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'FOLLOWUP_CHECKLIST_ITEMS_ADDED' THEN RAISE EXCEPTION 'checklist audit rollback QA'; END IF; RETURN NEW; END $$");
        await prisma.$executeRawUnsafe('CREATE TRIGGER fail_checklist_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION fail_checklist_audit()');
        const retryInput = batch();
        try {
            assert.equal((await http(base + '/batch', 'POST', retryInput)).status, 500);
            assert.equal(await prisma.followupChecklistItem.count({ where: { blockId: block.id } }), before + 1);
            assert.equal(await prisma.followupHistory.count(), historyBefore);
        } finally {
            await prisma.$executeRawUnsafe('DROP TRIGGER fail_checklist_audit ON "AuditLog"');
            await prisma.$executeRawUnsafe('DROP FUNCTION fail_checklist_audit()');
        }
        ok(await http(base + '/batch', 'POST', retryInput), 201);
    });
    await run('Checklist components: historical bullet lists, numbered parents, real specifications and notes are distinguished', async () => {
        const { historicalChecklistComponents: parse, checklistGroupKey } = require('../../apps/api/src/modules/followups/followup-checklist-components.ts');
        assert.deepEqual(parse('Só tem 2'), []);
        assert.deepEqual(parse('não tinha na data'), []);
        assert.deepEqual(parse('• SSD 1TB'), [{ text: 'SSD 1TB', quantity: 1 }]);
        const result = parse('• RTX 5060 TI 16gb\n• 3-coolers\n• SSD 1TB\n• 32gb RAM 2 pentes de 16gb Fonte 850w\nsera enviado na mala');
        assert.deepEqual(result.map(part => [part.text,part.quantity]), [['RTX 5060 TI 16gb',1],['coolers',3],['SSD 1TB',1],['32gb RAM 2 pentes de 16gb',1],['Fonte 850w',1]]);
        assert.equal(checklistGroupKey('1-\tComputador (e seus componentes)'), 'computador');
        assert.equal(checklistGroupKey('2 computadores'), 'computador');
        assert.notEqual(checklistGroupKey('1 computador para sala curva'), 'computador');
        for (const text of ['2- Kits Suporte de projetor', '3 - Kit Suporte para projetor', '4 kits suportes de projetor', '2-Kit suporte projetor', '1-Suporte de projetor (mais acessórios)']) {
            assert.equal(checklistGroupKey(text), 'suporte de projetor');
        }
        assert.notEqual(checklistGroupKey('3-Suporte de projetor Epson'), 'suporte de projetor');
        assert.notEqual(checklistGroupKey('1 kit suporte de monitor'), 'suporte de projetor');
    });
    let computer, historyBlock, firstHistorical, latestHistorical, savedComputer;
    await run('Checklist components: all prior configurations are available; latest composition is preselected without modifying originals', async () => {
        historyBlock = await prisma.followupBlock.create({ data: { followupId: followup.id, type: 'CHECKLIST', title: 'Histórico QA' } });
        firstHistorical = await prisma.followupChecklistItem.create({ data: { blockId: historyBlock.id, text: '1-Computador (e seus componentes)',
            details: '• GPU antiga\n• SSD 1TB\n• 3 coolers', createdAt: new Date('2025-01-01T12:00:00Z') } });
        latestHistorical = await prisma.followupChecklistItem.create({ data: { blockId: historyBlock.id, text: '2 computadores',
            details: '• GPU atual\n• SSD 1TB\n• 2 pentes RAM', createdAt: new Date('2026-01-01T12:00:00Z') } });
        await prisma.followupChecklistCatalogItem.create({ data: { text: 'Computador', normalizedText: 'computador' } });
        computer = ok(await http(catalog + '?search=Computador'))[0];
        assert.deepEqual(computer.components.filter(part => part.selectedByDefault).map(part => [part.text, part.quantity]), [['GPU atual',1],['SSD 1TB',1],['pentes RAM',2]]);
        assert(computer.components.some(part => part.text === 'GPU antiga' && !part.selectedByDefault));
        assert(computer.components.some(part => part.text === 'coolers' && part.quantity === 3 && !part.selectedByDefault));
        assert.equal((await prisma.followupChecklistItem.findUnique({ where: { id: firstHistorical.id } })).details, firstHistorical.details);
        assert.equal((await prisma.followupChecklistItem.findUnique({ where: { id: latestHistorical.id } })).components, null);
    });
    await run('Checklist components: independent total quantities, custom components, replay and client visibility', async () => {
        const input = batch([{ catalogItemId: computer.id, quantity: 2, components: [
            { text: 'GPU atual', quantity: 1 }, { text: 'pentes RAM', quantity: 4 }, { text: 'Peça nova', quantity: 7 },
        ] }]);
        ok(await http(base + '/batch', 'POST', input), 201);
        assert.equal(ok(await http(base + '/batch', 'POST', input), 201).replayed, true);
        savedComputer = await prisma.followupChecklistItem.findFirst({ where: { blockId: block.id, text: 'Computador' }, orderBy: { createdAt: 'desc' } });
        assert.equal(savedComputer.quantity, 2);
        assert.deepEqual(savedComputer.components, input.items[0].components.map(part => ({ ...part, checked: false })));
        const external = ok(await http('/client/followups/' + followup.id, 'GET', undefined, client));
        assert.deepEqual(external.blocks.find(row => row.id === block.id).checklistItems.find(row => row.id === savedComputer.id).components, input.items[0].components.map(part => ({ ...part, checked: false })));
        const inputChanged = { ...input, items: [{ ...input.items[0], components: [{ text: 'GPU atual', quantity: 99 }] }] };
        assert.equal((await http(base + '/batch', 'POST', inputChanged)).status, 409);
        const refreshed = ok(await http(catalog + '?search=Computador'))[0];
        assert(refreshed.components.some(part => part.text === 'Peça nova' && part.selectedByDefault && part.quantity === 7));
    });
    await run('Checklist components: validation, snapshots and later edits preserve independent lists and historical details', async () => {
        const before = await prisma.followupChecklistItem.count({ where: { blockId: block.id } });
        for (const components of [[{ text: 'RAM', quantity: 0 }],[{ text: 'RAM', quantity: 1.2 }],[{ text: '', quantity: 1 }],[{ text: 'RAM', quantity: 1 },{ text: ' ram ', quantity: 2 }]]) {
            assert.equal((await http(base + '/batch', 'POST', batch([{ catalogItemId: computer.id, quantity: 1, components }]))).status, 400);
        }
        assert.equal(await prisma.followupChecklistItem.count({ where: { blockId: block.id } }), before);
        const updated = ok(await http(base + '/' + savedComputer.id, 'PUT', { components: [{ text: 'Peça nova', quantity: 10 }] }));
        assert.deepEqual(updated.components, [{ text: 'Peça nova', quantity: 10, checked: false }]); assert.equal(updated.quantity, 2);
        assert.equal((await prisma.followupChecklistItem.findUnique({ where: { id: latestHistorical.id } })).details, latestHistorical.details);
        ok(await http(base + '/batch', 'POST', batch([{ catalogItemId: computer.id, quantity: 1 }])), 201);
        const newest = await prisma.followupChecklistItem.findFirst({ where: { blockId: block.id, text: 'Computador', id: { not: savedComputer.id } }, orderBy: { createdAt: 'desc' } });
        assert.deepEqual(newest.components, [{ text: 'Peça nova', quantity: 10, checked: false }]);
        await prisma.followupChecklistItem.deleteMany({ where: { OR: [{ blockId: historyBlock.id },{ text: 'Computador' }] } });
        const retained = ok(await http(catalog + '?search=Computador'))[0];
        assert(retained.components.some(part => part.text === 'GPU antiga'));
        assert(retained.components.some(part => part.text === 'Peça nova' && part.quantity === 10));
    });
    await run('Checklist components: failed audit rolls back component templates with the new checklist entries', async () => {
        const before = await prisma.followupChecklistCatalogItem.findUnique({ where: { id: computer.id } });
        const count = await prisma.followupChecklistItem.count();
        await prisma.$executeRawUnsafe("CREATE FUNCTION fail_component_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'FOLLOWUP_CHECKLIST_ITEMS_ADDED' THEN RAISE EXCEPTION 'component rollback QA'; END IF; RETURN NEW; END $$");
        await prisma.$executeRawUnsafe('CREATE TRIGGER fail_component_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION fail_component_audit()');
        try {
            assert.equal((await http(base + '/batch', 'POST', batch([{ catalogItemId: computer.id, quantity: 1, components: [{ text: 'Não persistir', quantity: 8 }] }]))).status, 500);
            assert.equal(await prisma.followupChecklistItem.count(), count);
            assert.deepEqual((await prisma.followupChecklistCatalogItem.findUnique({ where: { id: computer.id } })).components, before.components);
        } finally {
            await prisma.$executeRawUnsafe('DROP TRIGGER fail_component_audit ON "AuditLog"');
            await prisma.$executeRawUnsafe('DROP FUNCTION fail_component_audit()');
        }
    });
    await run('Projector support: numbered kits reuse their historical parts, preserve models and save individual total quantities', async () => {
        const sourceBlock = await prisma.followupBlock.create({ data: { followupId: followup.id, type: 'CHECKLIST' } });
        const oldParts = '• 2 bases para teto\n• 2 bases para projetor\n• 6-parafusos para fixação do projetor na base';
        const oldKit = await prisma.followupChecklistItem.create({ data: {
            blockId: sourceBlock.id, text: '2- Kits Suporte de projetor', details: oldParts, createdAt: new Date('2025-01-01T12:00:00Z'),
        } });
        await prisma.followupChecklistItem.create({ data: {
            blockId: sourceBlock.id, text: '3 - Kit Suporte para projetor', createdAt: new Date('2026-01-01T12:00:00Z'),
            details: '• 3 bases para teto\n• 3 bases para projetor\n• 3 cálices\n• 9-parafusos para fixação do projetor na base\n• 3 grampo de cálice',
        } });
        await prisma.followupChecklistItem.create({ data: {
            blockId: sourceBlock.id, text: '3-Suporte de projetor Epson', createdAt: new Date('2026-02-01T12:00:00Z'),
            details: '• Peça específica Epson\n• 9 parafusos Epson',
        } });
        await prisma.followupChecklistCatalogItem.create({ data: { text: 'Suporte de projetor', normalizedText: 'suporte de projetor' } });
        const support = ok(await http(catalog + '?search=Suporte%20de%20projetor'))[0];
        assert.deepEqual(support.components.filter(part => part.selectedByDefault).map(part => [part.text,part.quantity]), [
            ['bases para teto',3],['bases para projetor',3],['cálices',3],['parafusos para fixação do projetor na base',9],['grampo de cálice',3],
        ]);
        assert(!support.components.some(part => /Epson/.test(part.text)));
        const components = [{ text: 'bases para teto', quantity: 4 },{ text: 'bases para projetor', quantity: 4 },{ text: 'parafusos para fixação do projetor na base', quantity: 12 }];
        ok(await http(base + '/batch', 'POST', batch([{ catalogItemId: support.id, quantity: 4, components }])), 201);
        const saved = await prisma.followupChecklistItem.findFirst({ where: { blockId: block.id, text: 'Suporte de projetor' } });
        assert.deepEqual(saved.components, components.map(part => ({ ...part, checked: false })));
        assert.equal((await prisma.followupChecklistItem.findUnique({ where: { id: oldKit.id } })).details, oldParts);
        const updated = ok(await http(base + '/' + saved.id, 'PUT', { components: [{ text: 'bases para teto', quantity: 5 }] }));
        assert.deepEqual(updated.components, [{ text: 'bases para teto', quantity: 5, checked: false }]);
    });
    await run('Curated materials: exact 45-item replacement, 12 computer parts and 8 support parts; historical lists remain intact', async () => {
        const { parseMaterials, replaceCatalog } = require('../../apps/api/scripts/replace-followup-checklist-catalog.cjs');
        const input = require('../../apps/api/scripts/data/followup-materials-20261105.json');
        const items = parseMaterials(input);
        assert.equal(items.length, 45);
        const db = database;
        {
            const before = await prisma.followupChecklistItem.findMany({ orderBy: { id: 'asc' } });
            await prisma.$disconnect();
            let result;
            try { result = await replaceCatalog(db,items,{actorId:admin.id}); }
            finally { await prisma.$connect(); }
            assert.equal(result.afterCount, 45); assert.equal(result.componentCount, 20);
            assert.deepEqual(await prisma.followupChecklistItem.findMany({ orderBy: { id: 'asc' } }),before);
            const response = await http(catalog + '?limit=100');
            assert.equal(response.body.total, 45);
            const rows = ok(response);
            assert.deepEqual(rows.map(item=>item.text).sort(),input.items.map(item=>item.text).sort());
            const pc = rows.find(item=>item.text==='Computador (e seus componentes)');
            const support = rows.find(item=>item.text==='Suporte de projetor (mais acessórios)');
            assert.equal(pc.components.length,12); assert.equal(support.components.length,8);
            assert(pc.components.some(item=>item.text==='32gb RAM 2 pentes de 16gb'));
            assert(pc.components.some(item=>item.text==='Fonte 850w'));
            assert(!rows.some(item=>/^\d/.test(item.text)));
            assert(!pc.components.some(item=>item.text==='GPU antiga'));
            assert.equal(await prisma.auditLog.count({where:{action:'FOLLOWUP_CHECKLIST_CATALOG_REPLACED'}}),1);
        }
    });
    await run('Curated materials: old checklist edits cannot recreate removed options; explicit new registrations stay available', async () => {
        const before = await prisma.followupChecklistCatalogItem.count();
        const item = ok(await http(base,'POST',{text:'123 item histórico removido',details:'• Peça antiga\n• Outra peça antiga'}),201);
        ok(await http(base+'/'+item.id,'PUT',{text:'Computador antigo removido',components:[{text:'Peça antiga',quantity:5}]}));
        assert.equal(await prisma.followupChecklistCatalogItem.count(),before);
        const pc = ok(await http(catalog+'?search=Computador'))[0];
        assert.equal(pc.text,'Computador (e seus componentes)');
        assert.equal(pc.components.length,12);
        const added = ok(await http(catalog,'POST',{text:'Computador'}),201);
        assert.deepEqual(added.components,[]);
        assert.equal(await prisma.followupChecklistCatalogItem.count(),before+1);
    });
    await run('Curated materials: stale review or audit failure rolls back the entire catalog replacement', async () => {
        const {parseMaterials,replaceCatalog,digest} = require('../../apps/api/scripts/replace-followup-checklist-catalog.cjs');
        const items = parseMaterials(require('../../apps/api/scripts/data/followup-materials-20261105.json'));
        const db = database;
        await prisma.$disconnect();
        try {
        {
            const query = 'SELECT id,text,"normalizedText",components,"createdAt","updatedAt" FROM "FollowupChecklistCatalogItem" ORDER BY id';
            const before = digest((await db.query(query)).rows);
            await assert.rejects(()=>replaceCatalog(db,items,{actorId:admin.id,expectedHash:'stale-review'}),/changed after review/);
            assert.equal(digest((await db.query(query)).rows),before);
            await assert.rejects(()=>replaceCatalog(db,items,{actorId:crypto.randomUUID(),expectedHash:before}),/foreign key/);
            assert.equal(digest((await db.query(query)).rows),before);
        }
        } finally { await prisma.$connect(); }
    });
    await run('Component OK: selection starts unchecked; checking and unchecking preserve all quantities and catalog defaults', async () => {
        const pc = ok(await http(catalog+'?search=Computador')) .find(item=>item.text==='Computador (e seus componentes)');
        const input = batch([{catalogItemId:pc.id,quantity:2,components:[{text:'SSD 1TB',quantity:4,checked:true},{text:'Fonte 850w',quantity:2}]}]);
        ok(await http(base+'/batch','POST',input),201);
        const item = await prisma.followupChecklistItem.findFirst({where:{blockId:block.id,text:pc.text},orderBy:{createdAt:'desc'}});
        assert.deepEqual(item.components,[{text:'SSD 1TB',quantity:4,checked:false},{text:'Fonte 850w',quantity:2,checked:false}]);
        const catalogBefore = await prisma.followupChecklistCatalogItem.findUnique({where:{id:pc.id}});
        const checked = ok(await http(base+'/'+item.id,'PUT',{componentCheck:{text:'SSD 1TB',checked:true}}));
        assert.deepEqual(checked.components,[{text:'SSD 1TB',quantity:4,checked:true},{text:'Fonte 850w',quantity:2,checked:false}]);
        const unchecked = ok(await http(base+'/'+item.id,'PUT',{componentCheck:{text:'SSD 1TB',checked:false}}));
        assert.deepEqual(unchecked.components,item.components);
        assert.equal(unchecked.quantity,2);
        assert.deepEqual((await prisma.followupChecklistCatalogItem.findUnique({where:{id:pc.id}})).components,catalogBefore.components);
        assert.equal((await http(base+'/'+item.id,'PUT',{componentCheck:{text:'SSD 1TB',checked:'sim'}})).status,400);
        assert.equal((await http(base+'/'+item.id,'PUT',{componentCheck:{text:'Outro item',checked:true}})).status,404);
        assert.equal((await http(base+'/'+item.id,'PUT',{componentCheck:{text:'SSD 1TB',checked:true},components:[]})).status,400);
        assert.equal((await http(base+'/'+item.id,'PUT',{componentCheck:{text:'SSD 1TB',checked:true}},viewer)).status,403);
        ok(await http(base+'/'+item.id,'PUT',{componentCheck:{text:'SSD 1TB',checked:true}}));
        const edited = ok(await http(base+'/'+item.id,'PUT',{quantity:3,components:[{text:'SSD 1TB',quantity:7},{text:'Fonte 850w',quantity:2},{text:'Peça extra',quantity:1}]}));
        assert.deepEqual(edited.components,[{text:'SSD 1TB',quantity:7,checked:true},{text:'Fonte 850w',quantity:2,checked:false},{text:'Peça extra',quantity:1,checked:false}]);
        const external = ok(await http('/client/followups/'+followup.id,'GET',undefined,client));
        assert.deepEqual(external.blocks.find(row=>row.id===block.id).checklistItems.find(row=>row.id===item.id).components,edited.components);
    });
    await run('Component OK: projector support completion is independent and concurrent marks keep other parts intact', async () => {
        const support = ok(await http(catalog+'?search=Suporte')) .find(item=>item.text==='Suporte de projetor (mais acessórios)');
        ok(await http(base+'/batch','POST',batch([{catalogItemId:support.id,quantity:4,components:[{text:'bases para teto',quantity:4},{text:'parafusos para fixação do projetor na base',quantity:12}]}])),201);
        const item = await prisma.followupChecklistItem.findFirst({where:{blockId:block.id,text:support.text},orderBy:{createdAt:'desc'}});
        const responses = await Promise.all([
            http(base+'/'+item.id,'PUT',{componentCheck:{text:'bases para teto',checked:true}}),
            http(base+'/'+item.id,'PUT',{componentCheck:{text:'parafusos para fixação do projetor na base',checked:true}}),
        ]);
        responses.forEach(result=>ok(result));
        const saved = await prisma.followupChecklistItem.findUnique({where:{id:item.id}});
        assert.deepEqual(saved.components,[{text:'bases para teto',quantity:4,checked:true},{text:'parafusos para fixação do projetor na base',quantity:12,checked:true}]);
        assert.equal(saved.checked,false);
        const unchecked = ok(await http(base+'/'+item.id,'PUT',{componentCheck:{text:'parafusos para fixação do projetor na base',checked:false}}));
        assert.equal(unchecked.components[1].quantity,12);assert.equal(unchecked.components.length,2);assert.equal(unchecked.components[0].checked,true);
    });
};
if (require.main === module) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'test-ticket-statistics.cjs'), '--followup-checklist'], { stdio: 'inherit', windowsHide: true });
    process.exitCode = result.status ?? 1;
}
