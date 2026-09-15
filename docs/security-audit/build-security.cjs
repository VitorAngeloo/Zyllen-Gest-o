/* Copies the web app for build verification without replacing the production API dist or Prisma engine. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const scratch = path.join(root, 'tmp/security-tests');
const web = path.join(root, 'apps/web');
const output = path.join(scratch, 'web');
const apiTsc = require.resolve('typescript/bin/tsc', { paths: [path.join(root, 'apps/api')] });
const sharedOutput = path.join(scratch, 'shared');
fs.mkdirSync(sharedOutput, { recursive: true });
fs.copyFileSync(path.join(root, 'packages/shared/package.json'), path.join(sharedOutput, 'package.json'));
const sharedDeps = path.join(sharedOutput, 'node_modules');
if (!fs.existsSync(sharedDeps)) fs.symlinkSync(path.join(root, 'packages/shared/node_modules'), sharedDeps, 'junction');
execFileSync(process.execPath, [apiTsc, '-p', path.join(root, 'packages/shared/tsconfig.json'), '--outDir', path.join(sharedOutput, 'dist')], { cwd: root, stdio: 'inherit' });
fs.mkdirSync(output, { recursive: true });
for (const name of ['src', 'public', 'next.config.ts', 'next-env.d.ts', 'package.json', 'postcss.config.mjs', 'postcss.config.js', 'tailwind.config.ts', 'tailwind.config.js']) {
    const source = path.join(web, name);
    if (fs.existsSync(source)) fs.cpSync(source, path.join(output, name), { recursive: true });
}
// tmp/ is gitignored, which Tailwind intentionally skips. Scan the real, unmodified source explicitly.
const css = path.join(output, 'src/app/globals.css');
const scanSource = path.relative(path.dirname(css), path.join(web, 'src')).replaceAll('\\', '/');
fs.appendFileSync(css, `\n@source "${scanSource}";\n`);
const depLink = path.join(output, 'node_modules');
if (fs.existsSync(depLink) && fs.lstatSync(depLink).isSymbolicLink()) {
    if (!depLink.startsWith(scratch + path.sep)) throw new Error('Unsafe artifact path');
    fs.unlinkSync(depLink); // Removes ONLY the generated junction, not its target.
}
fs.mkdirSync(depLink, { recursive: true });
for (const entry of fs.readdirSync(path.join(web, 'node_modules'), { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const names = entry.name.startsWith('@') ? fs.readdirSync(path.join(web, 'node_modules', entry.name)).map(name => `${entry.name}/${name}`) : [entry.name];
    for (const name of names) {
        if (name === '@zyllen/shared') continue;
        const link = path.join(depLink, name);
        fs.mkdirSync(path.dirname(link), { recursive: true });
        if (!fs.existsSync(link)) fs.symlinkSync(fs.realpathSync(path.join(web, 'node_modules', name)), link, 'junction');
    }
}
fs.mkdirSync(path.join(depLink, '@zyllen'), { recursive: true });
if (!fs.existsSync(path.join(depLink, '@zyllen/shared'))) fs.symlinkSync(sharedOutput, path.join(depLink, '@zyllen/shared'), 'junction');
const tsconfig = JSON.parse(fs.readFileSync(path.join(web, 'tsconfig.json'), 'utf8'));
fs.writeFileSync(path.join(output, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
execFileSync(process.execPath, [apiTsc, '-p', path.join(scratch, 'tsconfig.api.json')], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [apiTsc, '--noEmit', '-p', path.join(output, 'tsconfig.json')], { cwd: output, stdio: 'inherit' });
const next = require.resolve('next/dist/bin/next', { paths: [web] });
execFileSync(process.execPath, [next, 'build'], { cwd: output, stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3999', NEXT_TELEMETRY_DISABLED: '1' } });
console.log('Isolated API compilation, web tsc and Next production build completed.');
fs.writeFileSync(path.join(__dirname, 'build-results.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sharedBuild: 'passed', apiTypecheckedCompilation: 'passed', webTscNoEmit: 'passed', nextProductionBuild: 'passed', nextBundler: 'Turbopack', isolated: true, outputRoot: 'tmp/security-tests', productionDistOrDatabaseModified: false }, null, 2));
