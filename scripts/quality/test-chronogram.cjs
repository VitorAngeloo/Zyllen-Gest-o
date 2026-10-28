/* Domain and adapter checks with synthetic records only; no database or HTTP. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
process.env.TZ = 'America/Sao_Paulo';
const root = path.resolve(__dirname, '../..');
const feature = path.join(root, 'apps/web/src/features/planning');
const shared = path.join(root, 'packages/shared/src/project-services');
const sharedRequire = require('node:module').createRequire(path.join(root, 'packages/shared/package.json'));
const ts = require(require.resolve('typescript', { paths: [path.join(root, 'apps/web')] }));
const modules = new Map();
const projectApi = { list: async () => { throw new Error('Synthetic API not configured'); } };
function load(file) {
    file = path.resolve(feature, file.endsWith('.ts') ? file : file + '.ts');
    if (!file.startsWith(feature + path.sep) && !file.startsWith(shared + path.sep)) throw new Error('Unexpected module');
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} }; modules.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, URLSearchParams, process: { env: {} }, require: name => {
        if (name === '@web/features/project-services/api/project-service-api') return { projectServiceApi: projectApi };
        if (name === '@zyllen/shared') return { ...load(path.join(shared, 'schemas')), ...load(path.join(shared, 'planning')) };
        if (name === 'zod') return sharedRequire('zod');
        if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
        throw new Error('Unexpected dependency ' + name);
    } }, { filename: file });
    return module.exports;
}
const dates = load('utils/chronogram-dates');
const adapter = load('utils/chronogram-records');
const rules = load('utils/chronogram-selectors');
const { visibleChronogramRecords } = load('utils/chronogram-visibility');
const navigation = load('utils/chronogram-navigation');
const { projectPlanningSchema } = load(path.join(shared, 'planning'));
const { loadChronogramProjects } = load('api/chronogram-api');
const project = extra => ({ id: 'project-1', projectId: 'identity-1', name: 'Sala imersiva', company: { id: 'company-1', name: 'Cliente Sintético' },
    type: 'INSTALLATION', status: 'PENDING', marker: { id: 'marker-1', name: 'Sala imersiva' }, urgency: 0, color: '#ABFF10', address: null,
    city: 'Goiânia', state: 'GO', mapsUrl: null, notes: 'Aguardando contrato; resolução 4K', sectors: [], requiresTravel: false, relevant: false,
    internalAssignees: [], contractors: [], schedule: null, startedAt: null, completedAt: null, cancelledAt: null, createdAt: '2026-10-01T12:00:00Z', ...extra });
const filters = dates.defaultFilters(new Date('2026-10-26T12:00:00-03:00'));
const record = extra => ({ ...adapter.projectToChronogram(project()), ...extra });
const cases = [];
async function run(name, test) { try { await test(); cases.push({ name, passed: true }); console.log('PASS ' + name); } catch (error) { cases.push({ name, passed: false }); console.error('FAIL ' + name + ': ' + error.message); } }
async function main() {
    await run('Planning visibility excludes only selected project identities and their linked calendar events, preserving source history and new work', () => {
        const linked = { id: 'hidden-schedule', title: 'Same name', type: 'INSTALLATION', status: 'SCHEDULED', startDate: '2026-10-28T12:00:00Z', endDate: '2026-10-28T13:00:00Z', installers: [] };
        const projects = [project({ id: 'hidden-project', name: 'Same name', schedule: linked }), project({ id: 'new-project', name: 'Same name' })];
        const combined = adapter.combineChronogram(projects, [linked, { ...linked, id: 'standalone' }, { ...linked, id: 'travel', trip: { id: 'trip-1', contractors: [] } }]);
        const legacy = record({ id: 'legacy:hidden-project', sourceId: 'hidden-project', kind: 'legacy', title: 'Same name' });
        const input = [...combined, legacy];
        const visible = visibleChronogramRecords(input, new Set(['hidden-project']));
        assert.equal(visible.length, 4);
        assert(!visible.some(row => row.id === 'project:hidden-project' || row.id === 'schedule:hidden-schedule'));
        for (const id of ['project:new-project', 'schedule:standalone', 'trip:trip-1', 'legacy:hidden-project']) assert(visible.some(row => row.id === id));
        assert.equal(rules.chronogramSummary(visible, filters, '2026-10-26').active.length, 1);
        assert.equal(visibleChronogramRecords(input, new Set()).length, input.length);
        assert.equal(input.length, 5); assert.equal(projects.length, 2);
    });
    await run('Adapter keeps native status and unknown technical fields despite suggestive names and notes', () => {
        const row = adapter.projectToChronogram(project());
        assert.equal(row.stage, 'PENDING'); assert.equal(row.category, null); assert.equal(row.technical, null); assert.equal(row.equipment.length, 0); assert.equal(row.forecast, '');
    });
    await run('Unexpected operational statuses are explicit and never become active', () => {
        const row = adapter.projectToChronogram(project({ status: 'UNRECOGNIZED' }));
        assert.equal(row.stage, 'UNKNOWN'); assert.equal(rules.chronogramSummary([row], filters, '2026-10-26').active.length, 0);
    });
    await run('Explicit specifications feed categories, equipment search and room detail without replacing operational state', () => {
        const row = adapter.projectToChronogram(project({ specifications: { category: 'sala', equipment: ['Projetor QA'], room: { roomType: 'interativa', resolution: '4K' } } }));
        assert.equal(row.category, 'sala'); assert.equal(row.technical.roomType, 'interativa'); assert.equal(row.technical.resolution, '4K');
        assert(rules.matchesFilters(row, { ...filters, category: 'sala', search: 'projetor' })); assert.equal(row.stage, 'PENDING'); assert.equal(row.completedDate, '');
        const absent = adapter.projectToChronogram(project({ specifications: null })); assert.equal(absent.category, null); assert.equal(absent.technical, null);
    });
    await run('Identity prevents double counting linked schedules while preserving standalone and travel events', () => {
        const linked = { id: 'schedule-1', title: 'Evento', type: 'INSTALLATION', status: 'SCHEDULED', startDate: '2026-10-28T12:00:00Z', endDate: '2026-10-28T13:00:00Z', installers: [] };
        const rows = adapter.combineChronogram([project({ schedule: linked })], [linked, { ...linked, id: 'schedule-2' }, { ...linked, id: 'schedule-3', trip: { id: 'trip-1', contractors: [] } }]);
        assert.equal(rows.length, 3); assert.equal(rows.filter(row => row.kind === 'trip').length, 1);
    });
    await run('Exclusive midnight is not rendered as another occupied day in Sao Paulo', () => {
        assert.equal(dates.intervalLastDay('2026-11-01T00:00:00-03:00', '2026-10-31T09:00:00-03:00'), '2026-10-31');
        assert.equal(dates.localDay('2026-10-27T01:00:00Z'), '2026-10-26');
    });
    await run('Cross-year periods and monthly/day forecasts retain their separate meanings', () => {
        assert(dates.inPeriod(record({ start: '2025-12-30', end: '2026-01-02' }), 2026, 0));
        assert(dates.forecastInPeriod(record({ forecast: '2027-01' }), 2027, 0));
        assert(!dates.inPeriod(record({ forecast: '2027-01' }), 2027, 0));
        assert.equal(dates.calendarDays(2028, 1).filter(day => day.getMonth() === 1).length, 29);
    });
    await run('Search matches accented cities and equipment; unknown category remains filterable', () => {
        const row = record({ equipment: ['Projetor sintético'] });
        assert(rules.matchesFilters(row, { ...filters, search: 'goiania' })); assert(rules.matchesFilters(row, { ...filters, search: 'PROJETOR' }));
        assert(!rules.matchesFilters(row, { ...filters, category: 'sala' })); assert(rules.matchesFilters(row, { ...filters, category: 'unknown' }));
    });
    await run('All views use the same status and service scope', () => {
        const row = record({ start: '2026-10-28', stage: 'SCHEDULED', operationalStatus: 'SCHEDULED' });
        assert.equal(rules.agendaRecords([row], { ...filters, stage: 'PENDING' }).length, 0);
        assert.equal(rules.chronogramSummary([row], { ...filters, service: 'REMOVAL' }, '2026-10-26').active.length, 0);
    });
    await run('Past planned events request confirmation without inventing execution or flagging cancellation', () => {
        assert(rules.needsConfirmation(record({ stage: 'SCHEDULED', operationalStatus: 'SCHEDULED', start: '2026-10-20' }), '2026-10-26'));
        assert(!rules.needsConfirmation(record({ stage: 'CANCELLED', operationalStatus: 'CANCELLED', start: '2026-10-20' }), '2026-10-26'));
        assert.equal(rules.chronogramSummary([record({ stage: 'SCHEDULED', start: '2026-10-20' })], filters, '2026-10-26').installations.length, 0);
    });
    await run('Multiple manual actions and automatic confirmation coexist; resolved actions remain excluded', () => {
        const row = record({ stage: 'predef', operationalStatus: 'SCHEDULED', start: '2026-10-20', pending: [{ id: '1', type: 'Conteúdo', open: true, deadline: '2026-10-30' }, { id: '2', type: 'Material', open: true, deadline: '' }, { id: '3', open: false }] });
        const actions = rules.pendingRows([row], '2026-10-26'); assert.equal(actions.length, 3); assert.equal(actions[0].automatic, true); assert.equal(actions.at(-1).type, 'Material');
    });
    await run('Annual conclusions use actual completion and preserve incomplete-history warning', () => {
        const old = record({ stage: 'DONE', operationalStatus: 'DONE', start: '2025-01-01', completedDate: '2026-10-10', completionDateKnown: true });
        const missing = record({ id: 'missing', stage: 'DONE', operationalStatus: 'DONE', start: '2026-10-10' });
        const summary = rules.chronogramSummary([old, missing], filters, '2026-10-26'); assert.equal(summary.installations.length, 1); assert.equal(summary.incompleteHistory, 1);
    });
    await run('Legacy links normalize to the new workspace, and hidden team never selects a team view', () => {
        const read = (path, query) => navigation.readChronogramLocation(path, new URLSearchParams(query), new Date('2026-10-26T12:00:00Z'));
        assert.equal(read('/dashboard/agenda', '').view, 'agenda'); assert.equal(read('/dashboard/projetos', 'aba=agenda&visao=calendario').view, 'calendario');
        assert.equal(read('/dashboard/viagens', '').section, 'viagens'); assert.equal(read('/dashboard/projetos', 'aba=equipe').section, 'cronograma');
        assert.equal(read('/dashboard/projetos/estruturas', '').history, true);
    });
    await run('Malformed URL values cannot create invalid month/year/category selections', () => {
        const parsed = navigation.readChronogramLocation('/dashboard/projetos', new URLSearchParams('ano=NaN&mes=-1&status=unknown&categoria=bad'), new Date('2026-10-26T12:00:00Z'));
        assert.equal(parsed.filters.month, 9); assert.equal(parsed.filters.year, 2026); assert.equal(parsed.filters.stage, 'all'); assert.equal(parsed.filters.category, 'all');
    });
    await run('All project pages are loaded and the cancellation signal is forwarded', async () => {
        const requests = [], signal = new AbortController().signal;
        projectApi.list = async (params, options) => { requests.push({ page: params.get('page'), signal: options.signal }); return { data: Array.from({ length: params.get('page') === '1' ? 100 : 1 }, (_, i) => project({ id: `${params.get('page')}-${i}` })), total: 101 }; };
        assert.equal((await loadChronogramProjects({ signal })).length, 101); assert.equal(requests.length, 2); assert.equal(requests[1].signal, signal);
    });
    await run('A truncated or repeating page fails instead of silently presenting a partial result', async () => {
        projectApi.list = async params => ({ data: params.get('page') === '1' ? [project()] : [], total: 2 });
        await assert.rejects(() => loadChronogramProjects({}), /lista de projetos mudou/);
        projectApi.list = async () => ({ data: [project()], total: 2 });
        await assert.rejects(() => loadChronogramProjects({}), /lista de projetos mudou/);
    });
    await run('Planning: all eight stages and month/day forecasts are explicit while operational status stays separate', () => {
        for (const stage of ['contrato', 'kickoff', 'semprev', 'predef', 'agendado', 'pausado', 'concluido', 'cancelado']) {
            const row = adapter.projectToChronogram(project({ planning: { stage, forecast: '2027-01' } }));
            assert.equal(row.stage, stage); assert.equal(row.operationalStatus, 'PENDING'); assert.equal(row.forecast, '2027-01'); assert.equal(row.start, '');
            assert(rules.matchesFilters(row, { ...filters, stage })); assert(rules.matchesFilters(row, { ...filters, stage: 'PENDING' }));
        }
    });
    await run('Planning: forecast validation rejects invalid days, overflow, timezone instants and unknown stages', () => {
        for (const forecast of ['2027-01', '2028-02-29', '2000-02-29', '2026-12-31']) assert(projectPlanningSchema.safeParse({ stage: null, forecast }).success);
        for (const forecast of ['2027-02-29', '2100-02-29', '2026-13', '2026-04-31', '2026-00', '2026-01-00', '2026-10-27T00:00:00Z', '27/10/2026', '', '2026-1', '20260-01']) assert(!projectPlanningSchema.safeParse({ stage: null, forecast }).success);
        assert(!projectPlanningSchema.safeParse({ stage: 'DONE', forecast: null }).success);
    });
    await run('Planning: forecast can cross years without a calendar interval and confirmed dates take precedence without losing the forecast', () => {
        const row = adapter.projectToChronogram(project({ planning: { stage: 'predef', forecast: '2027-01-05' } }));
        assert.equal(rules.agendaRecords([row], { ...filters, year: 2027, month: 0 }).length, 1);
        const scheduled = { ...row, start: '2026-10-28', end: '2026-10-29', operationalStatus: 'SCHEDULED' };
        assert.equal(rules.agendaRecords([scheduled], { ...filters, year: 2027, month: 0 }).length, 0);
        assert.equal(rules.agendaRecords([scheduled], filters).length, 1); assert.equal(scheduled.forecast, '2027-01-05');
        assert.equal(rules.needsConfirmation(row, '2028-01-01'), false);
    });
    await run('Planning: completion metrics use actual execution even if planning is closed or stale', () => {
        const planned = adapter.projectToChronogram(project({ planning: { stage: 'concluido', forecast: '2026-10-10' } }));
        let summary = rules.chronogramSummary([planned], filters, '2026-10-26');
        assert.equal(summary.installations.length, 0); assert.equal(summary.incompleteHistory, 1);
        const actual = adapter.projectToChronogram(project({ status: 'DONE', completedAt: '2026-10-10T12:00:00Z', planning: { stage: 'contrato', forecast: '2027-01' } }));
        summary = rules.chronogramSummary([actual], filters, '2026-10-26'); assert.equal(summary.installations.length, 1); assert.equal(summary.active.length, 0);
        assert(!rules.isActiveProject({ ...actual, stage: 'kickoff', operationalStatus: 'CANCELLED' }));
        assert(!rules.isActiveProject({ ...actual, stage: 'kickoff', operationalStatus: 'UNKNOWN' }));
    });
    await run('Planning: stale stage never suppresses confirmation of overdue scheduled execution', () => {
        for (const stage of ['contrato', 'pausado', 'concluido', 'cancelado']) assert(rules.needsConfirmation(record({ stage, operationalStatus: 'SCHEDULED', start: '2026-10-20' }), '2026-10-26'));
        assert(!rules.needsConfirmation(record({ stage: 'agendado', operationalStatus: 'DONE', start: '2026-10-20' }), '2026-10-26'));
    });
    assert.equal(cases.filter(test => !test.passed).length, 0, 'Chronogram regression failure');
    console.log(`Chronogram: ${cases.length}/${cases.length} passed.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
