const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(
  path.join(__dirname, '../src/app/features/vehicles/cost-analytics.ts'),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const context = { exports: {} };
vm.runInNewContext(compiled.outputText, context);
const { maintenanceCosts, fuelCosts, validPeriod } = context.exports;

test('maintenance: inclusive month boundaries, categories, missing data and empty months', () => {
  const result = maintenanceCosts(
    [
      { serviceDate: '2025-12-31', totalCost: 100, category: 'Preventiva' },
      { serviceDate: '2026-01-01', totalCost: 250.75, category: 'Preventiva' },
      { serviceDate: '2026-01-31', totalCost: 100, category: 'Pneus' },
      { serviceDate: '2026-02-01', totalCost: 900, category: 'Corretiva' },
      { serviceDate: null, totalCost: null },
      { serviceDate: '2026-01-15', totalCost: null },
    ],
    '2026-01',
    '2026-01',
  );
  assert.equal(result.total, 350.75);
  assert.equal(result.categories.length, 2);
  assert.equal(result.omitted, 2);
  assert.equal(result.rows[0].value, 350.75);
  assert.equal(maintenanceCosts([], '2025-12', '2026-02').rows.length, 3);
});

test('fuel: weighted cost/km and consumption, not average of entry ratios', () => {
  const result = fuelCosts(
    [
      {
        fueledOn: '2026-01-01',
        previousOdometerKm: 1000,
        odometerKm: 1100,
        liters: 10,
        totalCost: 60,
        kmPerLiter: 10,
      },
      {
        fueledOn: '2026-01-31',
        previousOdometerKm: 1100,
        odometerKm: 1400,
        liters: 20,
        totalCost: 120,
        kmPerLiter: 15,
      },
      {
        fueledOn: '2026-02-01',
        previousOdometerKm: 1400,
        odometerKm: 1500,
        liters: 10,
        totalCost: 100,
      },
      { fueledOn: null, totalCost: null },
      {
        fueledOn: '2026-01-15',
        previousOdometerKm: 1000,
        odometerKm: 1000,
        liters: 10,
        totalCost: 60,
      },
    ],
    '2026-01',
    '2026-01',
  );
  assert.equal(result.value, 0.45);
  assert.equal(result.cost, 180);
  assert.equal(result.km, 400);
  assert.equal(result.average, 400 / 30);
  assert.equal(result.price, 6);
  assert.equal(result.omitted, 2);
});

test('empty months do not imply a zero fuel cost/km and invalid periods are rejected', () => {
  const result = fuelCosts([], '2025-12', '2026-02');
  assert.equal(result.value, null);
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0].value, null);
  assert.equal(validPeriod('2026-02', '2026-01'), false);
  assert.equal(validPeriod('', '2026-01'), false);
  assert.equal(validPeriod('2026-13', '2026-13'), false);
  assert.equal(validPeriod('2026-01', '2026-01'), true);
});
