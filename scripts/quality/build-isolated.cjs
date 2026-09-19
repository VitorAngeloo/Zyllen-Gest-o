/* Compile without replacing the running API, shared dist or production Prisma engine. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const artifactOption = process.argv.indexOf('--artifact-dir');
const artifactDirectory = artifactOption === -1 ? 'tmp/architecture-validation' : process.argv[artifactOption + 1];
if (!artifactDirectory) throw new Error('--artifact-dir requires a path under tmp');
const scratch = path.resolve(root, artifactDirectory);
if (path.dirname(scratch) !== path.join(root, 'tmp')) throw new Error('Artifacts must use a direct child directory under tmp');
const web = path.join(root, 'apps/web');
const output = path.join(scratch, 'web');
const sharedOutput = path.join(scratch, 'shared');
const tsc = require.resolve('typescript/bin/tsc', { paths: [web] });
const env = {
    ...process.env,
    DATABASE_URL: 'postgresql://test@127.0.0.1:1/test',
    DIRECT_URL: 'postgresql://test@127.0.0.1:1/test',
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3999',
    NEXT_TELEMETRY_DISABLED: '1',
    PRISMA_GENERATE_SKIP_AUTOINSTALL: 'true',
};
function run(file, args, cwd = root) {
    execFileSync(process.execPath, [file, ...args], { cwd, env, stdio: 'inherit' });
}
function removeGeneratedSource(target) {
    const absolute = path.resolve(target);
    if (!absolute.startsWith(scratch + path.sep) || !['src', 'public'].includes(path.basename(absolute))) throw new Error('Unsafe generated path');
    if (fs.existsSync(absolute)) fs.rmSync(absolute, { recursive: true });
}
fs.mkdirSync(scratch, { recursive: true });
fs.writeFileSync(path.join(scratch, '.gitignore'), '*\n');
fs.writeFileSync(path.join(scratch, 'package.json'), JSON.stringify({ private: true }));
const schema = fs.readFileSync(path.join(root, 'apps/api/prisma/schema.prisma'), 'utf8');
const testSchema = schema.replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output = "./client"');
const schemaPath = path.join(scratch, 'schema.prisma');
if (!fs.existsSync(path.join(scratch, 'client/index.js')) || !fs.existsSync(schemaPath) || fs.readFileSync(schemaPath, 'utf8') !== testSchema) {
    fs.writeFileSync(schemaPath, testSchema);
    fs.mkdirSync(path.join(scratch, 'node_modules/@prisma'), { recursive: true });
    const clientLink = path.join(scratch, 'node_modules/@prisma/client');
    if (!fs.existsSync(clientLink)) fs.symlinkSync(path.dirname(require.resolve('@prisma/client/package.json', { paths: [path.join(root, 'apps/api')] })), clientLink, 'junction');
    run(require.resolve('prisma/build/index.js', { paths: [path.join(root, 'apps/api')] }), ['generate', '--schema', schemaPath], scratch);
}
fs.mkdirSync(sharedOutput, { recursive: true });
fs.copyFileSync(path.join(root, 'packages/shared/package.json'), path.join(sharedOutput, 'package.json'));
if (!fs.existsSync(path.join(sharedOutput, 'node_modules'))) fs.symlinkSync(path.join(root, 'packages/shared/node_modules'), path.join(sharedOutput, 'node_modules'), 'junction');
run(tsc, ['-p', path.join(root, 'packages/shared/tsconfig.json'), '--outDir', path.join(sharedOutput, 'dist'), '--incremental', 'false']);
fs.mkdirSync(output, { recursive: true });
for (const name of ['src', 'public']) removeGeneratedSource(path.join(output, name));
for (const name of ['src', 'public', 'next.config.ts', 'next-env.d.ts', 'package.json', 'postcss.config.mjs', 'postcss.config.js', 'tailwind.config.ts', 'tailwind.config.js']) {
    const source = path.join(web, name);
    if (fs.existsSync(source)) fs.cpSync(source, path.join(output, name), { recursive: true });
}
const css = path.join(output, 'src/app/globals.css');
fs.appendFileSync(css, `\n@source "${path.relative(path.dirname(css), path.join(web, 'src')).replaceAll('\\', '/')}";\n`);
const depLink = path.join(output, 'node_modules');
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
const webConfig = JSON.parse(fs.readFileSync(path.join(web, 'tsconfig.json'), 'utf8'));
webConfig.compilerOptions.incremental = false;
// Local web reads source contracts without overwriting the production API's dist.
// This copied app uses the independently compiled contracts instead.
delete webConfig.compilerOptions.paths['@zyllen/shared'];
fs.writeFileSync(path.join(output, 'tsconfig.json'), JSON.stringify(webConfig, null, 2));
fs.writeFileSync(path.join(scratch, 'tsconfig.api.json'), JSON.stringify({
    extends: '../../apps/api/tsconfig.json',
    compilerOptions: {
        baseUrl: '../..', rootDir: '../..', outDir: './api-build', incremental: false,
        paths: { '@prisma/client': ['./' + path.relative(root, scratch).replaceAll('\\', '/') + '/client'], '@zyllen/shared': ['./packages/shared/src'], '@api/*': ['./apps/api/src/*'] },
    },
    include: ['../../apps/api/src/**/*.ts'],
}, null, 2));
run(tsc, ['-p', path.join(scratch, 'tsconfig.api.json')]);
run(tsc, ['--noEmit', '-p', path.join(output, 'tsconfig.json')], output);
if (!process.argv.includes('--types-only')) run(require.resolve('next/dist/bin/next', { paths: [web] }), ['build'], output);
const results = { generatedAt: new Date().toISOString(), shared: 'passed', api: 'passed', webTypes: 'passed', webBuild: process.argv.includes('--types-only') ? 'skipped' : 'passed', isolated: true };
fs.writeFileSync(path.join(scratch, 'build-results.json'), JSON.stringify(results, null, 2));
console.log('Isolated validation completed; production outputs were not used.');
