/* Compatibility entry point for the documented security regression workflow. */
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
execFileSync(process.execPath, [path.join(root, 'scripts/quality/build-isolated.cjs'), '--artifact-dir', 'tmp/security-tests', ...process.argv.slice(2)], {
    cwd: root,
    stdio: 'inherit',
});
