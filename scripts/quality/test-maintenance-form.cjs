const assert = require('node:assert/strict');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '../..');
const apiRoot = path.join(repositoryRoot, 'apps/api');
process.env.TS_NODE_PROJECT = path.join(apiRoot, 'tsconfig.json');
require(require.resolve('ts-node/register/transpile-only', { paths: [apiRoot] }));

const {
    assertRequiredSignaturesForClosing,
    validateFormData,
} = require(path.join(apiRoot, 'src/modules/maintenance/utils/maintenance-form.ts'));

const signature = `data:image/png;base64,${Buffer.from('assinatura-qa').toString('base64')}`;

assert.doesNotThrow(() => validateFormData({ witnessSignature: signature }));
assert.throws(
    () => validateFormData({ witnessSignature: 'data:text/plain;base64,dGVzdGU=' }),
    /Assinatura inválida/,
);
assert.throws(
    () => assertRequiredSignaturesForClosing('INSTALACAO_SALA', { witnessName: 'Cliente QA' }),
    /Confirme a assinatura/,
);
assert.doesNotThrow(() => assertRequiredSignaturesForClosing('INSTALACAO_SALA', {
    witnessName: 'Cliente QA',
    witnessSignature: signature,
}));
assert.throws(
    () => assertRequiredSignaturesForClosing('TERCEIRIZADO', { technicianName: 'Técnico QA' }),
    /assinatura do técnico/,
);
assert.throws(
    () => assertRequiredSignaturesForClosing('TERCEIRIZADO', {
        localContactName: 'Cliente QA',
        witnessSignature: signature,
        technicianName: 'Técnico QA',
    }),
    /assinatura do técnico/,
);
assert.doesNotThrow(() => assertRequiredSignaturesForClosing('SUPORTE_REMOTO', {}));

console.log('Maintenance form validation passed.');
