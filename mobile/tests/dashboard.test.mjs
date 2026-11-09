import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dashboard } from '../src/components/inicio/dashboard.ts';

const maintenance = [
  { id: 'm1', vehicleId: 'car-1', date: '2026-05-10', cost: 300, category: 'Preventiva' },
  { id: 'm2', vehicleId: 'car-1', date: '2026-10-20', cost: 100.25, category: 'Óleo e filtros' },
  { id: 'other', vehicleId: 'car-2', date: '2026-10-20', cost: 999, category: 'Corretiva' },
];
const fuels = [
  { id: 'f1', vehicleId: 'car-1', date: '2026-09-12', cost: 250.55, startKm: 1000, endKm: 1400, liters: 40 },
  { id: 'f2', vehicleId: 'car-1', date: '2026-10-22', cost: 180.20, startKm: 1400, endKm: 1700, liters: 30 },
  { id: 'future', vehicleId: 'car-1', date: '2026-10-28', cost: 500, startKm: 1700, endKm: 1800, liters: 10 },
];

test('painel soma apenas veículo, período e datas já ocorridas', () => {
  const data = dashboard(maintenance, fuels, 'car-1', 'six', new Date(2026, 9, 27));
  assert.deepEqual(data.months.map((month) => month.key), [
    '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10',
  ]);
  assert.equal(data.maintenanceCost, 400.25);
  assert.equal(data.fuelCost, 430.75);
  assert.equal(data.total, 831);
  assert.equal(data.average, 138.5);
  assert.equal(data.kmPerLiter, 10);
  assert.equal(data.costPerKm, 430.75 / 700);
  assert.deepEqual(data.recent.map((expense) => expense.id), ['fuel-f2', 'maintenance-m2', 'fuel-f1', 'maintenance-m1']);
});

test('média inclui meses sem gasto e acumulado independe do filtro selecionado', () => {
  const data = dashboard(maintenance, fuels, 'car-1', 'month', new Date(2026, 9, 27));
  assert.equal(data.months.length, 1);
  assert.equal(data.total, 280.45);
  assert.equal(data.average, 280.45);
  assert.equal(data.accumulated, 831);
});

test('painel sem lançamentos evita médias e divisões inválidas', () => {
  const data = dashboard([], [], 'car-1', 'six', new Date(2026, 9, 27));
  assert.equal(data.total, 0);
  assert.equal(data.average, 0);
  assert.equal(data.kmPerLiter, null);
  assert.equal(data.costPerKm, null);
  assert.equal(data.hasHistory, false);
});
