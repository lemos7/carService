const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(
  path.join(__dirname, '../src/app/features/vehicles/maintenance-money.ts'),
  'utf8',
);
const context = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  context,
);
const { parseMaintenanceMoney, formatMaintenanceMoney } = context.exports;

test('currency input preserves amounts and cents through formatting and submission', () => {
  for (const [input, expected] of [
    ['0', 0],
    ['1', 1],
    ['100', 100],
    ['0,01', 0.01],
    ['12,5', 12.5],
    ['1234,56', 1234.56],
    ['1.234,56', 1234.56],
    ['1234.56', 1234.56],
    ['1.234', 1234],
    ['R$\u00a01.234,56', 1234.56],
    ['999.999.999,99', 999999999.99],
  ]) {
    assert.equal(parseMaintenanceMoney(input), expected, input);
    assert.equal(parseMaintenanceMoney(formatMaintenanceMoney(input)), expected, input);
  }
  assert.equal(formatMaintenanceMoney('1234.56'), '1.234,56');
});

test('invalid or excessive amounts are rejected without silently altering them', () => {
  for (const input of ['', ' ', '-1', '1,234', '1e3', 'abc123', '1,2,3', '1000000000', '1.23.45']) {
    assert.equal(parseMaintenanceMoney(input), null, input);
    assert.equal(formatMaintenanceMoney(input), input, input);
  }
});
