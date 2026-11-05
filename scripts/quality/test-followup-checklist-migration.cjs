/* Apply the actual migration over historical synthetic checklists, PGlite only. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
module.exports = async ({ run, db, root }) => {
    await run('Checklist migration: import every historical list, deduplicate labels and preserve original entries', async () => {
        await db.exec('INSERT INTO "Role" (id,name,"updatedAt") VALUES (\'checklist-role\',\'Checklist migration QA\',NOW())');
        await db.exec('INSERT INTO "InternalUser" (id,name,email,"passwordHash","roleId","updatedAt") VALUES (\'checklist-author\',\'Migration QA\',\'migration@example.test\',\'unused\',\'checklist-role\',NOW())');
        await db.exec('INSERT INTO "Company" (id,name,"updatedAt") VALUES (\'checklist-company\',\'Migration QA\',NOW())');
        for (const id of ['old-list-1', 'old-list-2']) {
            await db.query('INSERT INTO "Followup" (id,code,"companyId","createdById",status,"updatedAt") VALUES ($1,$1,\'checklist-company\',\'checklist-author\',\'COMPLETED\',NOW())', [id]);
            await db.query('INSERT INTO "FollowupBlock" (id,"followupId",type,"updatedAt") VALUES ($1,$1,\'CHECKLIST\',NOW())', [id]);
        }
        for (const [id, blockId, text] of [['old-item-1','old-list-1','  Cabo   HDMI  '],['old-item-2','old-list-2','cabo hdmi'],['old-item-3','old-list-2','Monitor 24 polegadas'],['old-empty','old-list-1','   ']]) {
            await db.query('INSERT INTO "FollowupChecklistItem" (id,"blockId",text,details,checked,"updatedAt") VALUES ($1,$2,$3,\'Detalhes históricos\',true,NOW())', [id,blockId,text]);
        }
        const before = (await db.query('SELECT * FROM "FollowupChecklistItem" ORDER BY id')).rows;
        const sql = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20261105120000_followup_checklist_catalog/migration.sql'), 'utf8');
        assert(!/\b(DROP|TRUNCATE)\b|^\s*(UPDATE|DELETE)\b/im.test(sql));
        await db.exec(sql);
        const after = (await db.query('SELECT * FROM "FollowupChecklistItem" ORDER BY id')).rows;
        assert.deepEqual(after.map(({ quantity, ...item }) => { assert.equal(quantity, null); return item; }), before);
        const labels = (await db.query('SELECT "normalizedText" FROM "FollowupChecklistCatalogItem" ORDER BY "normalizedText"')).rows;
        assert.deepEqual(labels.map(row => row.normalizedText), ['cabo hdmi','monitor 24 polegadas']);
        await assert.rejects(() => db.exec('UPDATE "FollowupChecklistItem" SET quantity=0 WHERE id=\'old-item-1\''), /quantity_positive/);
        assert.equal((await db.query('SELECT relrowsecurity FROM pg_class WHERE relname=\'FollowupChecklistCatalogItem\'')).rows[0].relrowsecurity, true);
    });
    await run('Checklist migration: catalog denies direct untrusted access', async () => {
        await db.exec('CREATE ROLE checklist_untrusted NOLOGIN; GRANT USAGE ON SCHEMA public TO checklist_untrusted; GRANT SELECT,INSERT ON "FollowupChecklistCatalogItem" TO checklist_untrusted; SET ROLE checklist_untrusted');
        try {
            assert.deepEqual((await db.query('SELECT * FROM "FollowupChecklistCatalogItem"')).rows, []);
            await assert.rejects(() => db.exec('INSERT INTO "FollowupChecklistCatalogItem" (id,text,"normalizedText","updatedAt") VALUES (\'blocked\',\'blocked\',\'blocked\',NOW())'), /row-level security/);
        } finally { await db.exec('RESET ROLE'); }
    });
    await run('Checklist components migration: nullable snapshots preserve existing rows and catalog RLS', async () => {
        const before = (await db.query('SELECT * FROM "FollowupChecklistItem" ORDER BY id')).rows;
        const sql = fs.readFileSync(path.join(root, 'apps/api/prisma/migrations/20261105140000_followup_checklist_components/migration.sql'), 'utf8');
        assert(!/\b(DROP|TRUNCATE)\b|^\s*(UPDATE|DELETE)\b/im.test(sql));
        await db.exec(sql);
        const after = (await db.query('SELECT * FROM "FollowupChecklistItem" ORDER BY id')).rows;
        assert.deepEqual(after.map(({ components, ...item }) => { assert.equal(components, null); return item; }), before);
        assert.equal((await db.query('SELECT relrowsecurity FROM pg_class WHERE relname=\'FollowupChecklistCatalogItem\'')).rows[0].relrowsecurity, true);
    });
};
