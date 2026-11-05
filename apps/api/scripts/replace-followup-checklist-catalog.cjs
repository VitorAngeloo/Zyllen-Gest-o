/* Explicit administrative replacement; defaults to a read-only plan. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../..'), api = createRequire(path.join(root, 'apps/api/package.json'));
const normalize = text => text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const catalogQuery = 'SELECT id,text,"normalizedText",components,"createdAt","updatedAt" FROM "FollowupChecklistCatalogItem" ORDER BY id';
const checklistQuery = 'SELECT id,"blockId",text,details,quantity,components,checked,"order","createdAt","updatedAt" FROM "FollowupChecklistItem" ORDER BY id';

function parseMaterials(input) {
    const { createChecklistCatalogItemSchema, checklistComponentTemplatesSchema } = api('@zyllen/shared');
    if (!Array.isArray(input?.items) || !input.items.length || input.items.length > 1000) throw new Error('Invalid materials list');
    const items = input.items.map(item => {
        const { text } = createChecklistCatalogItemSchema.parse(item);
        const components = checklistComponentTemplatesSchema.parse((item.components ?? []).map(component => ({
            text: component, quantity: 1, selectedByDefault: true,
        })));
        if (new Set(components.map(component => normalize(component.text))).size !== components.length) throw new Error('Repeated component');
        return { text, normalizedText: normalize(text), components };
    });
    if (new Set(items.map(item => item.normalizedText)).size !== items.length) throw new Error('Repeated material');
    return items;
}

async function replaceCatalog(client, items, { actorId, expectedHash, onSnapshot } = {}) {
    await client.query('BEGIN');
    try {
        await client.query('LOCK TABLE "FollowupChecklistCatalogItem" IN SHARE ROW EXCLUSIVE MODE');
        const before = (await client.query(catalogQuery)).rows;
        if (expectedHash && digest(before) !== expectedHash) throw new Error('Catalog changed after review');
        const checklistBefore = (await client.query(checklistQuery)).rows;
        if (onSnapshot) await onSnapshot({ catalog: before, checklistRows: checklistBefore.length, checklistSha256: digest(checklistBefore) });
        const wanted = items.map(item => item.normalizedText);
        await client.query('DELETE FROM "FollowupChecklistCatalogItem" WHERE NOT ("normalizedText" = ANY($1::text[]))', [wanted]);
        for (const item of items) {
            await client.query('INSERT INTO "FollowupChecklistCatalogItem" (id,text,"normalizedText",components,"updatedAt") VALUES (gen_random_uuid()::text,$1,$2,$3::jsonb,NOW()) ON CONFLICT ("normalizedText") DO UPDATE SET text=EXCLUDED.text,components=EXCLUDED.components,"updatedAt"=NOW()',
                [item.text, item.normalizedText, JSON.stringify(item.components)]);
        }
        const after = (await client.query(catalogQuery)).rows;
        if (after.length !== items.length) throw new Error('Unexpected catalog count');
        const actual = new Map(after.map(item => [item.normalizedText, item]));
        for (const item of items) {
            const saved = actual.get(item.normalizedText);
            if (saved?.text !== item.text || digest(saved.components) !== digest(item.components)) throw new Error('Catalog does not match reviewed materials');
        }
        if (digest((await client.query(checklistQuery)).rows) !== digest(checklistBefore)) throw new Error('Existing checklists changed');
        const details = { source: 'explicit-user-material-list', executedBy: 'administrative-script',
            beforeCount: before.length, afterCount: after.length, componentCount: items.reduce((sum, item) => sum + item.components.length, 0),
            checklistRowsPreserved: checklistBefore.length, materialsSha256: digest(items) };
        await client.query('INSERT INTO "AuditLog" (id,action,"entityType","entityId","userId",details) VALUES (gen_random_uuid()::text,$1,$2,$3,$4,$5::jsonb)',
            ['FOLLOWUP_CHECKLIST_CATALOG_REPLACED','FollowupChecklistCatalog','general-materials',actorId,JSON.stringify(details)]);
        await client.query('COMMIT');
        return details;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
}

async function main() {
    const args = process.argv.slice(2), option = name => args[args.indexOf(name) + 1];
    if (!args.includes('--input') || !args.includes('--backup-dir')) throw new Error('Use --input <json> --backup-dir <private directory> [--apply]');
    const input = path.resolve(option('--input')), backup = path.resolve(option('--backup-dir'));
    if (backup === root || backup.startsWith(root + path.sep)) throw new Error('Use a private backup directory outside the repository');
    const items = parseMaterials(JSON.parse(fs.readFileSync(input, 'utf8')));
    const config = createRequire(api.resolve('@nestjs/config/package.json'))('dotenv').parse(fs.readFileSync(path.join(root,'apps/api/.env')));
    const url = new URL(config.DIRECT_URL); url.searchParams.delete('sslmode');
    const client = new (api('pg').Client)({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
    fs.mkdirSync(backup, { recursive: true });
    await client.connect();
    try {
        const planPath = path.join(backup,'catalog-replacement-plan.json');
        if (!args.includes('--apply')) {
            await client.query('BEGIN READ ONLY');
            const current = (await client.query(catalogQuery)).rows;
            await client.query('COMMIT');
            const plan = { currentCount: current.length, replacementCount: items.length,
                components: items.reduce((sum,item)=>sum+item.components.length,0), currentSha256:digest(current), materialsSha256:digest(items) };
            fs.writeFileSync(planPath,JSON.stringify(plan,null,2));
            console.log(JSON.stringify(plan));
            return;
        }
        if (!fs.existsSync(path.join(root,'apps/api/.production-maintenance'))) throw new Error('Pause the production API before replacement');
        const plan = JSON.parse(fs.readFileSync(planPath,'utf8'));
        if (plan.materialsSha256 !== digest(items)) throw new Error('Reviewed materials changed');
        const actor = (await client.query('SELECT u.id FROM "InternalUser" u JOIN "Role" r ON r.id=u."roleId" WHERE r.name=$1 ORDER BY u."createdAt",u.id LIMIT 1', ['Administrador'])).rows[0];
        if (!actor) throw new Error('Administrator audit identity unavailable');
        const report = await replaceCatalog(client,items,{ actorId:actor.id,expectedHash:plan.currentSha256,onSnapshot:snapshot => {
            const file = path.join(backup,'catalog-before.json'), text = JSON.stringify(snapshot,null,2);
            if (fs.existsSync(file)) {
                if (fs.readFileSync(file,'utf8') !== text) throw new Error('Existing backup differs from the reviewed snapshot');
            } else fs.writeFileSync(file,text,{flag:'wx'});
        } });
        fs.writeFileSync(path.join(backup,'catalog-replacement-results.json'),JSON.stringify(report,null,2));
        console.log(JSON.stringify(report));
    } finally { await client.end(); }
}
module.exports = { parseMaterials, replaceCatalog, digest };
if (require.main === module) main().catch(error => { console.error('Catalog replacement failed: '+error.message); process.exitCode=1; });
