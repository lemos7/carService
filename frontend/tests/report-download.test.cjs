const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/app/features/vehicles/report-download.ts'),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const context = { exports: {}, URL: {}, document: {} };
vm.runInNewContext(compiled.outputText, context);
const { downloadVehicleReport, reportFileName } = context.exports;

test('report file name handles simple, encoded and absent content disposition', () => {
  assert.equal(
    reportFileName('attachment; filename="relatorio-ABC1D23.pdf"'),
    'relatorio-ABC1D23.pdf',
  );
  assert.equal(reportFileName("attachment; filename*=UTF-8''relat%C3%B3rio.pdf"), 'relatório.pdf');
  assert.equal(reportFileName(null), 'relatorio-veiculo.pdf');
});

test('successful download uses response name and always revokes the object URL', async () => {
  const events = [];
  const state = { downloading: false, error: '' };
  await downloadVehicleReport(
    async () => ({
      body: { size: 10 },
      headers: { get: () => 'attachment; filename="carro.pdf"' },
    }),
    state,
    {
      createObjectUrl: () => 'blob:report',
      download: (url, name) => events.push(['download', url, name]),
      revokeObjectUrl: (url) => events.push(['revoke', url]),
    },
  );
  assert.deepEqual(events, [
    ['download', 'blob:report', 'carro.pdf'],
    ['revoke', 'blob:report'],
  ]);
  assert.deepEqual(state, { downloading: false, error: '' });
});

test('duplicate clicks are ignored and failures restore state with actionable error', async () => {
  let calls = 0;
  const busy = { downloading: true, error: '' };
  await downloadVehicleReport(async () => {
    calls++;
    throw new Error();
  }, busy);
  assert.equal(calls, 0);

  const state = { downloading: false, error: '' };
  await downloadVehicleReport(async () => {
    calls++;
    throw new Error();
  }, state);
  assert.equal(calls, 1);
  assert.equal(state.downloading, false);
  assert.match(state.error, /Tente novamente/);
});

test('API client declares report URL, optional dates and blob response', () => {
  const api = fs.readFileSync(path.join(__dirname, '../src/app/core/api.service.ts'), 'utf8');
  assert.match(api, /\/api\/maintenance\/reports\/vehicles\/\$\{vehicleId\}/);
  assert.match(api, /params\['startDate'\]/);
  assert.match(api, /params\['endDate'\]/);
  assert.match(api, /responseType: 'blob'/);
});
