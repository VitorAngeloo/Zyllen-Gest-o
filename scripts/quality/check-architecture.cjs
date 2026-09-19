const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const ts = require(require.resolve('typescript', { paths: [path.join(root, 'apps/web')] }));
const sourceRoots = ['apps/web/src', 'apps/api/src', 'packages/shared/src'];
const slash = p => p.replaceAll('\\', '/');
function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [path.join(dir, entry.name)] : []);
}
const files = sourceRoots.flatMap(dir => walk(path.join(root, dir)));
const graph = new Map(files.map(file => [file, []]));
const failures = [];
const forwardReferences = new Map();
let dependencies = 0;
function resolve(file, spec) {
    const base = spec.startsWith('.') ? path.resolve(path.dirname(file), spec)
        : spec.startsWith('@web/') ? path.join(root, 'apps/web/src', spec.slice(5))
        : spec.startsWith('@api/') ? path.join(root, 'apps/api/src', spec.slice(5)) : null;
    if (!base) return null;
    const target = [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts'), path.join(base, 'index.tsx')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!target) failures.push(`${slash(path.relative(root, file))}: missing ${spec}`);
    return target;
}
for (const file of files) {
    const relative = slash(path.relative(root, file));
    const text = fs.readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const forwardRefNames = new Set();
    function collectForwardRef(node) {
        if (ts.isCallExpression(node) && node.expression.getText(source) === 'forwardRef') {
            const callback = node.arguments[0];
            if (callback && ts.isArrowFunction(callback) && ts.isIdentifier(callback.body)) forwardRefNames.add(callback.body.text);
        }
        ts.forEachChild(node, collectForwardRef);
    }
    collectForwardRef(source);
    if (relative.startsWith('apps/web/src/app/') && path.basename(file) === 'page.tsx') {
        const declarations = source.statements.filter(s => !ts.isExpressionStatement(s));
        if (declarations.length !== 1 || !ts.isExportDeclaration(declarations[0]) || !declarations[0].moduleSpecifier?.text?.startsWith('@web/features/')) failures.push(`${relative}: page must delegate to a feature screen`);
    }
    function visit(node) {
        let literal, typeOnly = false;
        if (ts.isImportDeclaration(node)) { literal = node.moduleSpecifier; typeOnly = node.importClause?.isTypeOnly || (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) && node.importClause.namedBindings.elements.every(e => e.isTypeOnly)); }
        else if (ts.isExportDeclaration(node)) { literal = node.moduleSpecifier; typeOnly = node.isTypeOnly; }
        else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) literal = node.arguments[0];
        if (literal && ts.isStringLiteral(literal)) {
            if (relative.startsWith('packages/shared/src/') && /^@(?:web|api)\//.test(literal.text)) failures.push(`${relative}: shared cannot depend on applications`);
            const target = resolve(file, literal.text);
            if (target) {
                dependencies++;
                const destination = slash(path.relative(root, target));
                if (ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) && node.importClause.namedBindings.elements.some(e => forwardRefNames.has(e.name.text))) {
                    if (!forwardReferences.has(file)) forwardReferences.set(file, new Set());
                    forwardReferences.get(file).add(target);
                }
                if (!typeOnly && graph.has(target)) graph.get(file).push(target);
                if (relative.startsWith('apps/web/src/features/') && destination.startsWith('apps/web/src/app/')) failures.push(`${relative}: features cannot depend on routes`);
                if (relative.startsWith('apps/web/src/') && destination.startsWith('apps/api/src/') || relative.startsWith('apps/api/src/') && destination.startsWith('apps/web/src/')) failures.push(`${relative}: applications must share contracts through packages/shared`);
                if (/^apps\/web\/src\/(?:components|lib)\//.test(relative) && destination.startsWith('apps/web/src/features/') && !destination.startsWith('apps/web/src/features/auth/context/')) failures.push(`${relative}: common code cannot depend on business features`);
                if (relative.startsWith('apps/api/src/infrastructure/') && destination.startsWith('apps/api/src/modules/')) failures.push(`${relative}: infrastructure cannot depend on business modules`);
                if (relative.startsWith('packages/shared/src/') && !destination.startsWith('packages/shared/src/')) failures.push(`${relative}: shared cannot depend on applications`);
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
}
const visiting = new Set(), visited = new Set();
function cycle(file, trail) {
    if (visiting.has(file)) {
        const chain = [...trail.slice(trail.indexOf(file)), file].map(p => slash(path.relative(root, p)));
        // Nest module cycles are explicit, existing forwardRef relationships.
        const cycleFiles = [...trail.slice(trail.indexOf(file)), file];
        const explicitModuleCycle = chain.every(p => p.startsWith('apps/api/src/') && p.endsWith('.module.ts')) && cycleFiles.slice(0, -1).every((p, at) => forwardReferences.get(p)?.has(cycleFiles[at + 1]));
        if (!explicitModuleCycle) failures.push('Runtime import cycle: ' + chain.join(' -> '));
        return;
    }
    if (visited.has(file)) return;
    visiting.add(file);
    for (const dependency of graph.get(file) || []) cycle(dependency, [...trail, file]);
    visiting.delete(file); visited.add(file);
}
for (const file of files) cycle(file, []);
if (failures.length) { console.error([...new Set(failures)].join('\n')); process.exitCode = 1; }
else console.log(`Architecture passed: ${files.length} source files, ${dependencies} internal dependencies, thin routes and no unapproved runtime cycles.`);
